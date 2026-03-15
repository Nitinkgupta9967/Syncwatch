import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import admin from 'firebase-admin';

// Initialize Firebase Admin with Service Account support
if (!admin.apps.length) {
  let credential = admin.credential.applicationDefault();
  
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // If user provides a base64 encoded service account JSON
    try {
      const decoded = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString());
      credential = admin.credential.cert(decoded);
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT:", e.message);
    }
  } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    // If user provides individual components
    credential = admin.credential.cert({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  }

  admin.initializeApp({
    credential,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID
  });
}

const db = admin.firestore();
console.log("Firebase Admin Initialized for Project:", process.env.VITE_FIREBASE_PROJECT_ID);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const HYPERBEAM_API_KEY = process.env.HYPERBEAM_API_KEY;

app.use(cors());
app.use(express.json());

// Health check to verify API is alive
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), vercel: !!process.env.VERCEL });
});

app.get('/api/debug-env', (req, res) => {
  res.json({
    hasProjectId: !!process.env.VITE_FIREBASE_PROJECT_ID,
    hasServiceAccount: !!(process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_PRIVATE_KEY),
    vercel: !!process.env.VERCEL
  });
});

// Helper function to call Hyperbeam REST API
const hyperbeamClient = axios.create({
  baseURL: 'https://engine.hyperbeam.com/v0',
  headers: {
    'Authorization': `Bearer ${HYPERBEAM_API_KEY}`
  }
});

// Create a new room / Virtual Machine
app.post('/api/room/create', async (req, res) => {
  try {
    const { userId, userName } = req.body || {};
    const response = await hyperbeamClient.post('/vm', {
      timeout: { absolute: 7200, offline: 300 }
    });
    
    const roomId = response.data.session_id;
    const embedUrl = response.data.embed_url;

    if (userId) {
      await db.collection('rooms').doc(roomId).set({
        id: roomId,
        userId, 
        hostId: userId,
        name: `${userName || 'User'}'s Anime Party`,
        code: roomId,
        participantsCount: 1,
        activeParticipants: [{ userId, userName, lastSeen: new Date().toISOString(), isHost: true }],
        createdAt: new Date().toISOString()
      });
    }

    res.json({ roomId: roomId, embedUrl: embedUrl });
  } catch (error) {
    console.error("Create Room Error:", error.message);
    res.status(500).json({ error: 'Failed to create room', details: error.message });
  }
});

// Retrieve embed URL for an existing room
app.get('/api/room/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await hyperbeamClient.get(`/vm/${id}`);
    res.json({ roomId: response.data.session_id, embedUrl: response.data.embed_url });
  } catch (error) {
    res.status(404).json({ error: 'Room not found or expired' });
  }
});

// 1. Get recent rooms for a user
app.get('/api/users/:userId/rooms', async (req, res) => {
  try {
    const { userId } = req.params;
    const snapshot = await db.collection('rooms')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    res.json(snapshot.docs.map(doc => doc.data()));
  } catch (error) {
    res.json([]); 
  }
});

// 2. Get messages for a room
app.get('/api/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const snapshot = await db.collection('rooms').doc(roomId).collection('messages')
      .orderBy('createdAt', 'asc')
      .limit(100)
      .get();
    res.json(snapshot.docs.map(doc => doc.data()));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// 3. Post a message to a room
app.post('/api/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const msg = req.body;
    const newMessage = { id: Date.now().toString(), ...msg, createdAt: new Date().toISOString() };
    await db.collection('rooms').doc(roomId).collection('messages').add(newMessage);
    res.json(newMessage);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// 4. Heartbeat / Join room
app.post('/api/rooms/:roomId/heartbeat', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, userName } = req.body;
    
    const roomRef = db.collection('rooms').doc(roomId);
    const roomDoc = await roomRef.get();
    
    if (!roomDoc.exists) {
      return res.status(200).json({ success: false, warning: 'Room not found.', participants: [] });
    }

    const room = roomDoc.data();
    let participants = room.activeParticipants || [];
    const pIndex = participants.findIndex(p => p.userId === userId);
    const now = new Date().toISOString();

    if (pIndex > -1) {
      participants[pIndex].lastSeen = now;
      participants[pIndex].userName = userName; 
      participants[pIndex].isHost = room.hostId === userId;
    } else {
      participants.push({ userId, userName, lastSeen: now, isHost: room.hostId === userId });
    }

    const fifteenSecsAgo = new Date(Date.now() - 15000);
    participants = participants.filter(p => new Date(p.lastSeen) > fifteenSecsAgo);
    
    const thirtySecsAgo = new Date(Date.now() - 30000);
    const isHostActive = participants.some(p => p.isHost && new Date(p.lastSeen) > thirtySecsAgo);

    await roomRef.update({ activeParticipants: participants, participantsCount: participants.length });

    res.json({ success: true, participants: participants, isHostActive });
  } catch (error) {
    console.error("Heartbeat System Error:", error.message);
    res.status(500).json({ error: 'Heartbeat failed', details: error.message });
  }
});

// 5. Leave room explicitly
app.post('/api/rooms/:roomId/leave', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    const roomRef = db.collection('rooms').doc(roomId);
    const roomDoc = await roomRef.get();
    
    if (roomDoc.exists) {
      const room = roomDoc.data();
      let participants = (room.activeParticipants || []).filter(p => p.userId !== userId);
      
      if (room.hostId === userId) {
        await roomRef.delete();
      } else {
        await roomRef.update({ activeParticipants: participants, participantsCount: participants.length });
      }
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Leave failed '});
  }
});

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`SyncAnime Backend running on http://localhost:${PORT}`);
  });
}
