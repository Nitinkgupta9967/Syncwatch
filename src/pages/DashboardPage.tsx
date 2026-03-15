import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Play, Plus, History, Users } from 'lucide-react';
import './DashboardPage.css';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previousRooms, setPreviousRooms] = useState<any[]>([]);

  const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

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
        alert('Failed to create room: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Could not connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      let code = joinCode.trim();
      if (code.includes('/room/')) {
        code = code.split('/room/').pop() || code;
      }
      code = code.split('?')[0].replace(/\/$/, '');
      if (code) {
        navigate(`/room/${code}`);
      }
    }
  };

  return (
    <div className="dashboard-page animate-fade-in">
      <nav className="dashboard-nav">
        <div className="nav-container">
          <div className="brand">
            <div className="logo-circle">
              <Play size={18} fill="white" color="white" />
            </div>
            <span>Syncwatch</span>
          </div>
          <div className="nav-profile">
            <span className="user-email desktop-only">{user?.email}</span>
            <button className="btn-logout" onClick={logout}>Sign Out</button>
          </div>
        </div>
      </nav>
      
      <main className="dashboard-content">
        <section className="hero-section">
          <h1>Welcome back, <span className="text-highlight">{user?.displayName || user?.email?.split('@')[0]}</span></h1>
          <p>Create a private room to browse and watch synchronized videos with your friends.</p>
        </section>

        <section className="main-actions">
          <div className="action-grid">
            <button className="action-card primary-action" onClick={handleCreateRoom} disabled={isLoading}>
              <div className="icon-box">
                <Plus size={28} />
              </div>
              <div className="action-info">
                <h3>Create Room</h3>
                <p>Start a new virtual browser session</p>
              </div>
              {isLoading && <div className="loading-spinner"></div>}
            </button>

            <div className="action-card secondary-action">
              <div className="icon-box">
                <Users size={28} />
              </div>
              <div className="action-info">
                <h3>Join Room</h3>
                <form onSubmit={handleJoinRoom} className="join-input-group">
                  <input 
                    placeholder="Enter code..." 
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                  />
                  <button type="submit">Join</button>
                </form>
              </div>
            </div>
          </div>
        </section>

        <section className="history-section">
          <div className="section-header">
            <h2>Recent Sessions</h2>
            <span className="session-count">{previousRooms.length} rooms</span>
          </div>

          {previousRooms.length > 0 ? (
            <div className="room-list">
              {previousRooms.map((room) => (
                <div key={room.id} className="room-item" onClick={() => navigate(`/room/${room.code}`)}>
                  <div className="room-icon">
                    <History size={20} />
                  </div>
                  <div className="room-details">
                    <h4>{room.name || 'Watch Party'}</h4>
                    <div className="room-meta">
                      <span>{room.date}</span>
                      <span className="dot"></span>
                      <span>{room.participantsCount || 0} watching</span>
                    </div>
                  </div>
                  <div className="room-code">
                    <code>#{room.code.slice(0, 8)}</code>
                    <Play size={16} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🛋️</div>
              <p>No recent rooms found. Start your first party!</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
