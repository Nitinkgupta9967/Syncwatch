import express from 'express';
import cors from 'cors';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID // Use existing client project ID
  });
}

const db = admin.firestore();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const HYPERBEAM_API_KEY = process.env.HYPERBEAM_API_KEY;

if (!HYPERBEAM_API_KEY && !process.env.VERCEL) {
  console.warn("WARNING: HYPERBEAM_API_KEY is missing from environment. API will fail.");
}

app.use(cors());
app.use(express.json());

// Health check to verify API is alive
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), vercel: !!process.env.VERCEL });
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
  console.log("Room creation request received:", req.body);
  
  if (!HYPERBEAM_API_KEY) {
    console.error("CRITICAL: HYPERBEAM_API_KEY is missing.");
    return res.status(500).json({ 
      error: 'Configuration Error', 
      message: 'HYPERBEAM_API_KEY is missing in Vercel settings. Please add it to your environment variables.' 
    });
  }

  try {
    const { userId, userName } = req.body || {};
    
    let response;
    try {
      // Basic settings for the new virtual browser
      response = await hyperbeamClient.post('/vm', {
        timeout: {
          absolute: 7200, // 2 hours max
          offline: 300 // 5 minutes empty shutdown
        }
      });
    } catch (hbError) {
      console.error("====== HYPERBEAM API ERROR ======");
      console.error("Status:", hbError.response?.status);
      console.error("Data:", hbError.response?.data);
      return res.status(hbError.response?.status || 500).json({
        error: 'Hyperbeam API Error',
        details: hbError.response?.data || hbError.message
      });
    }
    
    const roomId = response.data.session_id;
    const embedUrl = response.data.embed_url;

    // Save to Firestore
    try {
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
    } catch (dbError) {
      console.error("Firestore Write Error:", dbError.message);
    }

    res.json({
      roomId: roomId,
      embedUrl: embedUrl
    });
  } catch (error) {
    console.error("Unexpected Error in /api/room/create:", error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Retrieve embed URL for an existing room
app.get('/api/room/:id', async (req, res) => {
  if (!HYPERBEAM_API_KEY) {
    return res.status(500).json({ error: 'HYPERBEAM_API_KEY is missing in Vercel settings.' });
  }
  try {
    const { id } = req.params;
    
    const response = await hyperbeamClient.get(`/vm/${id}`);
    
    res.json({
      roomId: response.data.session_id,
      embedUrl: response.data.embed_url
    });
  } catch (error) {
    console.error("Hyperbeam Get Error:", error.response?.data || error.message);
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
    
    const userRooms = snapshot.docs.map(doc => doc.data());
    res.json(userRooms);
  } catch (error) {
    console.error("Fetch Rooms Error:", error);
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
    
    const messages = snapshot.docs.map(doc => doc.data());
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// 3. Post a message to a room
app.post('/api/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const msg = req.body;
    
    const newMessage = {
      id: Date.now().toString(),
      ...msg,
      createdAt: new Date().toISOString()
    };
    
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
    const doc = await roomRef.get();
    
    if (!doc.exists) {
      return res.status(200).json({ 
        success: false, 
        warning: 'Room not found in Firestore.',
        participants: [] 
      });
    }

    const room = doc.data();
    let participants = room.activeParticipants || [];
    
    const pIndex = participants.findIndex(p => p.userId === userId);
    const now = new Date().toISOString();

    if (pIndex > -1) {
      participants[pIndex].lastSeen = now;
      participants[pIndex].userName = userName; 
      participants[pIndex].isHost = room.hostId === userId;
    } else {
      participants.push({ 
        userId, 
        userName, 
        lastSeen: now, 
        isHost: room.hostId === userId 
      });
    }

    // Cleanup inactive users (15 seconds)
    const fifteenSecsAgo = new Date(Date.now() - 15000);
    participants = participants.filter(p => new Date(p.lastSeen) > fifteenSecsAgo);
    
    // Check if host is active (30 seconds)
    const thirtySecsAgo = new Date(Date.now() - 30000);
    const isHostActive = participants.some(p => p.isHost && new Date(p.lastSeen) > thirtySecsAgo);

    await roomRef.update({
      activeParticipants: participants,
      participantsCount: participants.length
    });

    res.json({ 
      success: true, 
      participants: participants,
      isHostActive 
    });
  } catch (error) {
    console.error("Heartbeat Error:", error);
    res.status(500).json({ error: 'Heartbeat failed' });
  }
});

// 5. Leave room explicitly
app.post('/api/rooms/:roomId/leave', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    
    const roomRef = db.collection('rooms').doc(roomId);
    const doc = await roomRef.get();
    
    if (doc.exists) {
      const room = doc.data();
      let participants = room.activeParticipants || [];
      participants = participants.filter(p => p.userId !== userId);
      
      if (room.hostId === userId) {
        // If host leaves, delete the room
        await roomRef.delete();
        // Option: also delete messages sub-collection if needed
      } else {
        await roomRef.update({
          activeParticipants: participants,
          participantsCount: participants.length
        });
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Leave Error:", error);
    res.status(500).json({ error: 'Leave failed '});
  }
});

// Export the app for Vercel Serverless execution
export default app;

// Listen locally if not in Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`SyncAnime Auth Backend running on http://localhost:${PORT}`);
  });
}
