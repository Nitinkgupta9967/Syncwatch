import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/layout/Navbar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Play, Plus, History, Clock, Users } from 'lucide-react';
import './DashboardPage.css';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previousRooms, setPreviousRooms] = useState<any[]>([]);

  // Use relative routing in Vercel production, otherwise localhost for dev
  const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

  // Fetch user's room history from local backend
  useEffect(() => {
    const fetchRooms = async () => {
      if (!user) return;
      try {
        const res = await fetch(`${API_URL}/api/users/${user.uid}/rooms`);
        const data = await res.json();
        
        const fetchedRooms = data.map((room: any) => ({
          ...room,
          date: room.createdAt ? new Date(room.createdAt).toLocaleDateString() : 'Just now',
        }));
        
        setPreviousRooms(fetchedRooms);
      } catch (err) {
        console.error("Failed to fetch rooms:", err);
      }
    };
    fetchRooms();
  }, [user, API_URL]);

  const handleCreateRoom = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/room/create`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid,
          userName: user?.displayName || user?.email?.split('@')[0]
        })
      });
      const data = await res.json();
      
      if (data.roomId) {
        navigate(`/room/${data.roomId}`);
      } else {
        const errorDetail = data.details?.message || data.error || 'Unknown error';
        alert('Failed to create room: ' + errorDetail);
      }
    } catch (err) {
      console.error(err);
      alert('Could not connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      let code = joinCode.trim();
      
      // If the user pasted a full URL (e.g., http://localhost:5173/room/xyz), extract the ID
      if (code.includes('/room/')) {
        code = code.split('/room/').pop() || code;
      }
      
      // Clean up any trailing slashes or URL query parameters
      code = code.split('?')[0].replace(/\/$/, '');
      
      if (code) {
        navigate(`/room/${code}`);
      }
    }
  };

  return (
    <div className="dashboard-page">
      <Navbar />
      
      <main className="dashboard-main">
        <div className="dashboard-header animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Welcome back, {user?.displayName || user?.email?.split('@')[0]}! 👋</h1>
            <p>Ready for your next watch party? Create a new room or join an existing one.</p>
          </div>
          <Button variant="outline" onClick={logout}>Sign Out</Button>
        </div>

        <div className="dashboard-actions animate-fade-in" style={{animationDelay: '0.1s'}}>
          <Card className="action-card create-card">
            <div className="action-icon create-icon">
              <Plus size={32} color="white" />
            </div>
            <h3>Create a Watch Room</h3>
            <p>Start a new synchronized session and invite your friends instantly.</p>
            <Button size="lg" onClick={handleCreateRoom} className="mt-4" disabled={isLoading}>
              {isLoading ? 'Creating Room...' : 'Create New Room'}
            </Button>
          </Card>

          <Card className="action-card join-card">
            <div className="action-icon join-icon">
              <Play size={32} color="white" fill="currentColor" />
            </div>
            <h3>Join a Room</h3>
            <p>Have an invite code? Enter it below to join the watch party.</p>
            <form onSubmit={handleJoinRoom} className="join-form mt-4">
              <Input 
                placeholder="Enter room code (e.g. xyz-abc)" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                style={{marginBottom: 0}}
              />
              <Button type="submit" variant="secondary" size="lg">Join</Button>
            </form>
          </Card>
        </div>

        <div className="dashboard-history animate-fade-in" style={{animationDelay: '0.2s'}}>
          <div className="history-header">
            <h2><History size={24} className="mr-2" style={{display: 'inline', verticalAlign: 'text-bottom'}} /> Recent Rooms</h2>
          </div>

          {previousRooms.length > 0 ? (
            <div className="history-list">
              {previousRooms.map((room) => (
                <Card key={room.id} hoverable className="history-item">
                  <div className="history-info">
                    <h3>{room.name}</h3>
                    <div className="history-meta">
                      <span><Clock size={16} /> {room.date}</span>
                      <span><Users size={16} /> {room.participants} joined</span>
                    </div>
                  </div>
                  <div className="history-actions">
                    <span className="room-code-badge">#{room.code}</span>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/room/${room.code}`)}>
                      Rejoin
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="empty-state">
              <History size={48} color="var(--color-text-muted)" opacity={0.5} />
              <h3>No recent rooms</h3>
              <p>You haven't joined any watch rooms yet. The party starts when you do!</p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};
