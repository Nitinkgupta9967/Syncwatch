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
        userId,
        name: `${userName || 'User'}'s Watch Party`,
        code: roomId,
        participants: 1,
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

// 2. Get messages for a room
app.get('/api/rooms/:roomId/messages', (req, res) => {
  const { roomId } = req.params;
  const db = readDB();
  res.json(db.messages[roomId] || []);
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

// Export the app for Vercel Serverless execution
export default app;

// Listen locally if not in Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`SyncAnime Auth Backend running on http://localhost:${PORT}`);
  });
}
