import express from 'express';
import cors from 'cors';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { Server } from 'socket.io';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

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

// Socket.io Real-time Logic
io.on('connection', (socket) => {
  console.log('⚡ User connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`👤 User ${socket.id} joined room ${roomId}`);
  });

  socket.on('cursor-move', (data) => {
    // data: { roomId, userId, x, y, userName, color }
    socket.to(data.roomId).emit('cursor-update', {
      userId: data.userId,
      userName: data.userName,
      x: data.x,
      y: data.y,
      color: data.color
    });
  });

  socket.on('interaction', (data) => {
    // Broadcast clicks/ripples
    socket.to(data.roomId).emit('interaction-effect', data);
  });

  socket.on('playback-control', (data) => {
    // Sync play/pause/seek
    socket.to(data.roomId).emit('playback-sync', data);
  });

  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
  });
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
        },
        control_bar: true
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

    // Save to our Local JSON Database if requested
    try {
      if (userId) {
        const db = readDB();
        db.rooms.push({
          id: roomId,
          userId, // Creator is the host
          hostId: userId,
          name: `${userName || 'User'}'s Anime Party`,
          code: roomId,
          participantsCount: 1,
          activeParticipants: [{ userId, userName, lastSeen: new Date().toISOString(), isHost: true }],
          createdAt: new Date().toISOString()
        });
        // initialize empty message array
        db.messages[roomId] = [];
        writeDB(db);
      }
    } catch (dbError) {
      console.error("Database Write Error:", dbError.message);
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

// JSON DB Routes
app.get('/api/users/:userId/rooms', (req, res) => {
  const { userId } = req.params;
  const db = readDB();
  const userRooms = db.rooms.filter(r => r.userId === userId);
  userRooms.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(userRooms);
});

app.get('/api/rooms/:roomId/messages', (req, res) => {
  const { roomId } = req.params;
  const db = readDB();
  res.json(db.messages[roomId] || []);
});

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
    room.activeParticipants[pIndex].userName = userName;
    room.activeParticipants[pIndex].isHost = room.hostId === userId;
  } else {
    room.activeParticipants.push({
      userId,
      userName,
      lastSeen: now,
      isHost: room.hostId === userId
    });
  }

  const fifteenSecsAgo = new Date(Date.now() - 15000);
  room.activeParticipants = room.activeParticipants.filter(p => new Date(p.lastSeen) > fifteenSecsAgo);
  room.participantsCount = room.activeParticipants.length;

  const thirtySecsAgo = new Date(Date.now() - 30000);
  const isHostActive = room.activeParticipants.some(p => p.isHost && new Date(p.lastSeen) > thirtySecsAgo);

  writeDB(db);
  res.json({
    success: true,
    participants: room.activeParticipants,
    isHostActive
  });
});

app.post('/api/rooms/:roomId/leave', (req, res) => {
  const { roomId } = req.params;
  const { userId } = req.body;
  const db = readDB();

  const room = db.rooms.find(r => r.id === roomId);
  if (room && room.activeParticipants) {
    room.activeParticipants = room.activeParticipants.filter(p => p.userId !== userId);
    room.participantsCount = room.activeParticipants.length;

    if (room.hostId === userId) {
      db.rooms = db.rooms.filter(r => r.id !== roomId);
      delete db.messages[roomId];
    }

    writeDB(db);
  }
  res.json({ success: true });
});

// Dedicated route to end/delete a room (Host only)
app.delete('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const { userId } = req.query; // Using query for DELETE body compatibility
  const db = readDB();

  const roomIndex = db.rooms.findIndex(r => r.id === roomId);
  if (roomIndex === -1) return res.status(404).json({ error: 'Room not found' });

  const room = db.rooms[roomIndex];
  if (room.hostId !== userId) {
    return res.status(403).json({ error: 'Forbidden: Only the host can end this session' });
  }

  // Remove room and messages
  db.rooms.splice(roomIndex, 1);
  delete db.messages[roomId];

  writeDB(db);
  console.log(`🗑️ Room ${roomId} ended by host ${userId}`);
  res.json({ success: true, message: 'Session ended successfully' });
});

// Export for Vercel
export default app;

// Local server
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`SyncAnime Real-time Backend running on http://localhost:${PORT}`);
  });
}

