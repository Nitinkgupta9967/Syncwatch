import express from 'express';
import cors from 'cors';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

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

// Simplistic db.json setup - Using /tmp/ for Vercel Serverless compatibility
const DB_FILE = process.env.VERCEL ? path.join('/tmp', 'db.json') : path.join(__dirname, 'db.json');
console.log("DB_FILE Path:", DB_FILE);

// Health check to verify API is alive
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), vercel: !!process.env.VERCEL });
});

// Helper functions for reading/writing our JSON database
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ rooms: [], messages: {} }));
  }
  const data = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(data);
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Helper function to call Hyperbeam REST API
const hyperbeamClient = axios.create({
  baseURL: 'https://engine.hyperbeam.com/v0',
  headers: {
    'Authorization': `Bearer ${HYPERBEAM_API_KEY}`
  }
});

// Create a new room / Virtual Machine
app.post('/api/room/create', async (req, res) => {
  if (!HYPERBEAM_API_KEY) {
    return res.status(500).json({ error: 'HYPERBEAM_API_KEY is missing in Vercel settings.' });
  }
  try {
    const { userId, userName } = req.body || {};
    
    // Basic settings for the new virtual browser
    const response = await hyperbeamClient.post('/vm', {
      timeout: {
        absolute: 7200, // 2 hours max
        offline: 300 // 5 minutes empty shutdown
      }
    });
    
    const roomId = response.data.session_id;
    const embedUrl = response.data.embed_url;

    // Save to our Local JSON Database if requested
    if (userId) {
      const db = readDB();
      db.rooms.push({
        id: roomId,
        userId, // Creator is the host
        hostId: userId,
        name: `${userName || 'User'}'s Watch Party`,
        code: roomId,
        participantsCount: 1,
        activeParticipants: [{ userId, userName, lastSeen: new Date().toISOString(), isHost: true }],
        createdAt: new Date().toISOString()
      });
      // initialize empty message array
      db.messages[roomId] = [];
      writeDB(db);
    }

    res.json({
      roomId: roomId,
      embedUrl: embedUrl
    });
  } catch (error) {
    console.error("====== HYPERBEAM API ERROR ======");
    console.error("Status:", error.response?.status);
    console.error("Data:", error.response?.data);
    console.error("Message:", error.message);
    res.status(500).json({ 
      error: 'Failed to create room',
      details: error.response?.data || error.message
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

// JSON DB Routes

// 1. Get recent rooms for a user
app.get('/api/users/:userId/rooms', (req, res) => {
  const { userId } = req.params;
  const db = readDB();
  const userRooms = db.rooms.filter(r => r.userId === userId);
  // Sort descending by creation date
  userRooms.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(userRooms);
});

// 3. Post a message to a room
app.post('/api/rooms/:roomId/messages', (req, res) => {
  const { roomId } = req.params;
  const msg = req.body;
  const db = readDB();
  
  if (!db.messages[roomId]) {
    db.messages[roomId] = [];
  }
  
  const newMessage = {
    id: Date.now().toString(),
    ...msg,
    createdAt: new Date().toISOString()
  };
  
  db.messages[roomId].push(newMessage);
  writeDB(db);
  
  res.json(newMessage);
});

// 4. Heartbeat / Join room
app.post('/api/rooms/:roomId/heartbeat', (req, res) => {
  const { roomId } = req.params;
  const { userId, userName } = req.body;
  const db = readDB();
  
  const room = db.rooms.find(r => r.id === roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  if (!room.activeParticipants) room.activeParticipants = [];
  
  const pIndex = room.activeParticipants.findIndex(p => p.userId === userId);
  const now = new Date().toISOString();

  if (pIndex > -1) {
    room.activeParticipants[pIndex].lastSeen = now;
    room.activeParticipants[pIndex].userName = userName; // update just in case
  } else {
    room.activeParticipants.push({ 
      userId, 
      userName, 
      lastSeen: now, 
      isHost: room.hostId === userId 
    });
  }

  // Cleanup inactive users (haven't sent heartbeat in 15 seconds)
  const fifteenSecsAgo = new Date(Date.now() - 15000);
  room.activeParticipants = room.activeParticipants.filter(p => new Date(p.lastSeen) > fifteenSecsAgo);
  room.participantsCount = room.activeParticipants.length;

  // Cleanup room if host is gone for > 30 seconds
  const thirtySecsAgo = new Date(Date.now() - 30000);
  const isHostActive = room.activeParticipants.some(p => p.isHost && new Date(p.lastSeen) > thirtySecsAgo);
  
  if (!isHostActive && room.activeParticipants.length > 0) {
    // Check if host ever existed/was seen recently
    // If not active, we mark the room for deletion but usually vercel/serverless is stateless
    // For this local DB implementation, we just filter it out in the next read or delete now
    console.log(`Room ${roomId} host inactive. Room will be disbanded.`);
    // db.rooms = db.rooms.filter(r => r.id !== roomId); // Uncomment for aggressive deletion
  }

  writeDB(db);
  res.json({ 
    success: true, 
    participants: room.activeParticipants,
    isHostActive 
  });
});

// 5. Leave room explicitly
app.post('/api/rooms/:roomId/leave', (req, res) => {
  const { roomId } = req.params;
  const { userId } = req.body;
  const db = readDB();

  const room = db.rooms.find(r => r.id === roomId);
  if (room && room.activeParticipants) {
    room.activeParticipants = room.activeParticipants.filter(p => p.userId !== userId);
    room.participantsCount = room.activeParticipants.length;
    
    // If host leaves, disband
    if (room.hostId === userId) {
      db.rooms = db.rooms.filter(r => r.id !== roomId);
      delete db.messages[roomId];
    }
    
    writeDB(db);
  }
  res.json({ success: true });
});

// Export the app for Vercel Serverless execution
export default app;

// Listen locally if not in Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`SyncAnime Auth Backend running on http://localhost:${PORT}`);
  });
}
