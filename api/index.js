import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  addDoc
} from 'firebase/firestore';

// Initialize Firebase Client SDK for Backend Use
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const db = initializeFirestore(firebaseApp, {
  experimentalForceLongPolling: true,
});

console.log("Firebase Client SDK Initialized for Project:", process.env.VITE_FIREBASE_PROJECT_ID);

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

app.get('/api/debug-env', (req, res) => {
  res.json({
    hasProjectId: !!process.env.VITE_FIREBASE_PROJECT_ID,
    hasApiKey: !!process.env.VITE_FIREBASE_API_KEY,
    hasHyperbeam: !!process.env.HYPERBEAM_API_KEY,
    nodeEnv: process.env.NODE_ENV,
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
  console.log("Room creation request received:", req.body);
  
  if (!HYPERBEAM_API_KEY) {
    return res.status(500).json({ 
      error: 'Configuration Error', 
      message: 'HYPERBEAM_API_KEY is missing. Please add it to your environment variables.' 
    });
  }

  try {
    const { userId, userName } = req.body || {};
    
    let response;
    try {
      response = await hyperbeamClient.post('/vm', {
        timeout: {
          absolute: 7200, 
          offline: 300 
        }
      });
    } catch (hbError) {
      console.error("HYPERBEAM API ERROR:", hbError.response?.data || hbError.message);
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
        await setDoc(doc(db, 'rooms', roomId), {
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
    return res.status(500).json({ error: 'HYPERBEAM_API_KEY is missing.' });
  }
  try {
    const { id } = req.params;
    const response = await hyperbeamClient.get(`/vm/${id}`);
    res.json({
      roomId: response.data.session_id,
      embedUrl: response.data.embed_url
    });
  } catch (error) {
    res.status(404).json({ error: 'Room not found or expired' });
  }
});

// 1. Get recent rooms for a user
app.get('/api/users/:userId/rooms', async (req, res) => {
  try {
    const { userId } = req.params;
    const q = query(collection(db, 'rooms'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
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
    const q = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );
    const snapshot = await getDocs(q);
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
    
    await addDoc(collection(db, 'rooms', roomId, 'messages'), newMessage);
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
    
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);
    
    if (!roomSnap.exists()) {
      return res.status(200).json({ 
        success: false, 
        warning: 'Room not found in Firestore.',
        participants: [] 
      });
    }

    const room = roomSnap.data();
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

    await updateDoc(roomRef, {
      activeParticipants: participants,
      participantsCount: participants.length
    });

    res.json({ 
      success: true, 
      participants: participants,
      isHostActive 
    });
  } catch (error) {
    console.error("====== HEARTBEAT SYSTEM ERROR ======");
    console.error("Error Message:", error.message);
    res.status(500).json({ 
      error: 'Heartbeat failed', 
      details: error.message
    });
  }
});

// 5. Leave room explicitly
app.post('/api/rooms/:roomId/leave', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);
    
    if (roomSnap.exists()) {
      const room = roomSnap.data();
      let participants = room.activeParticipants || [];
      participants = participants.filter(p => p.userId !== userId);
      
      if (room.hostId === userId) {
        await deleteDoc(roomRef);
      } else {
        await updateDoc(roomRef, {
          activeParticipants: participants,
          participantsCount: participants.length
        });
      }
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Leave failed '});
  }
});

// Export the app for Vercel
export default app;

// Listen locally
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`SyncAnime Backend running on http://localhost:${PORT}`);
  });
}
