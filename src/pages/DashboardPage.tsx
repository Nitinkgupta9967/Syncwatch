import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Plus, History, Users, Home, Settings, LogOut, Menu, X, Search } from 'lucide-react';
import './DashboardPage.css';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previousRooms, setPreviousRooms] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

  useEffect(() => {
    const fetchRooms = async () => {
      if (!user) return;
      try {
        const res = await fetch(`${API_URL}/api/users/${user.uid}/rooms`);
        const data = await res.json();
        setPreviousRooms(data.map((r: any) => ({
          ...r,
          date: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Just now',
        })));
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

      if (!res.ok) {
        const text = await res.text();
        let errorMsg = 'Server error';
        try {
          const errData = JSON.parse(text);
          errorMsg = errData.message || errData.error || errorMsg;
        } catch {
          errorMsg = `Server returned ${res.status}: ${text.slice(0, 100)}`;
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      if (data.roomId) navigate(`/room/${data.roomId}`);
      else alert('Failed to create room: ' + (data.error || 'Unknown error'));
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
      if (code.includes('/room/')) code = code.split('/room/').pop() || code;
      code = code.split('?')[0].replace(/\/$/, '');
      if (code) navigate(`/room/${code}`);
    }
  };

  return (
    <div className={`dashboard-layout ${isSidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
      {/* Sidebar */}
      <aside className="dashboard-sidebar glass-card">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">✨</span>
            <span className="logo-text">SyncAnime</span>
          </div>
          <button className="sidebar-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <button className="nav-item active"><Home size={20} /> <span>Home</span></button>
          <button className="nav-item" onClick={handleCreateRoom}><Plus size={20} /> <span>Create Room</span></button>
          <button className="nav-item" onClick={() => navigate('#history')}><History size={20} /> <span>History</span></button>
          <button className="nav-item"><Settings size={20} /> <span>Settings</span></button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-pill glass-card">
            <div className="user-avatar">{user?.email?.charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <p className="u-name">{user?.displayName || 'User'}</p>
              <p className="u-email">{user?.email}</p>
            </div>
            <button className="logout-btn" onClick={logout} title="Sign Out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="main-header">
          <div className="search-bar glass-card">
            <Search size={18} />
            <input placeholder="Search for rooms or friends..." />
          </div>
        </header>

        <div className="main-canvas animate-fade-in">
          <div className="welcome-banner glass-card">
            <div className="banner-content">
              <h1>Welcome, <span className="text-highlight">{user?.displayName || user?.email?.split('@')[0]}</span></h1>
              <p>Host an anime party and watch with friends in sub-second sync.</p>
              <button className="btn-primary" onClick={handleCreateRoom} disabled={isLoading}>
                Start New Watch Party <Plus size={20} />
              </button>
            </div>
            <div className="banner-visual desktop-only">🍿</div>
          </div>

          <div className="dashboard-grid">
            <section className="join-section">
              <div className="card-header">
                <h3>Join via Code</h3>
              </div>
              <form className="join-input-box glass-card" onSubmit={handleJoinRoom}>
                <input 
                  placeholder="Paste room link or code..." 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                />
                <button type="submit" disabled={!joinCode.trim()}>Join</button>
              </form>
            </section>

            <section className="history-section" id="history">
              <div className="card-header">
                <h3>Recent Parties</h3>
                <span>{previousRooms.length} sessions</span>
              </div>

              <div className="room-history-list">
                {previousRooms.length > 0 ? (
                  previousRooms.map((room) => (
                    <div key={room.id} className="history-card glass-card" onClick={() => navigate(`/room/${room.code}`)}>
                      <div className="h-card-top">
                        <div className="h-icon"><Users size={16} /></div>
                        <span className="h-count">{room.participantsCount || 0} watching</span>
                      </div>
                      <h4>{room.name || 'Anime Party'}</h4>
                      <div className="h-card-footer">
                        <span>{room.date}</span>
                        <button className="h-join-btn">Resume</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-history glass-card">
                    <p>No parties yet. Time to start one! 🎥</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};
