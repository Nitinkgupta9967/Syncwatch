import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, History, Users, Home, Settings, LogOut, 
  Menu, Search, Moon, Sun, Sparkles, Clipboard 
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import './DashboardPage.css';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previousRooms, setPreviousRooms] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

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

  const handleEndSession = async (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    if (!user || !window.confirm('Are you sure you want to end this session? It will be deleted for everyone.')) return;
    
    try {
      const res = await fetch(`${API_URL}/api/rooms/${roomId}?userId=${user.uid}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setPreviousRooms(prev => prev.filter(r => r.id !== roomId));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to end session');
      }
    } catch (err) {
      alert('Network error');
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
      {/* Ambient Background Elements */}
      <div className="bg-ambient-shapes">
        <div className="shape-1"></div>
        <div className="shape-2"></div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>

      {/* Sidebar */}
      <aside className="dashboard-sidebar glass-card">
        <div className="sidebar-header">
          <div className="sidebar-logo-group">
            <div className="sidebar-logo">
              <span className="logo-icon">✨</span>
              {isSidebarOpen && <span className="logo-text">SyncAnime</span>}
            </div>
            <button 
              className="sidebar-toggle-v3" 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <Menu size={18} />
            </button>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${!isSidebarOpen ? 'compact' : ''} active`}>
            <div className="active-indicator"></div>
            <Home size={20} /> {isSidebarOpen && <span>Home</span>}
          </button>
          <button className={`nav-item ${!isSidebarOpen ? 'compact' : ''}`} onClick={handleCreateRoom}>
            <div className="active-indicator"></div>
            <Plus size={20} /> {isSidebarOpen && <span>Create Room</span>}
          </button>
          <button className={`nav-item ${!isSidebarOpen ? 'compact' : ''}`} onClick={() => navigate('#history')}>
            <div className="active-indicator"></div>
            <History size={20} /> {isSidebarOpen && <span>History</span>}
          </button>
          <button className={`nav-item ${!isSidebarOpen ? 'compact' : ''}`}>
            <div className="active-indicator"></div>
            <Settings size={20} /> {isSidebarOpen && <span>Settings</span>}
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className={`user-profile-v3 ${!isSidebarOpen ? 'compact' : ''} glass-card`}>
            <div className="user-avatar-glow">
              {user?.email?.charAt(0).toUpperCase()}
              <div className="status-indicator-online"></div>
            </div>
            {isSidebarOpen && (
              <div className="user-info">
                <p className="u-name">{user?.displayName || 'User'}</p>
                <p className="u-email">{user?.email}</p>
              </div>
            )}
            {isSidebarOpen && (
              <button className="logout-btn-subtle" onClick={logout} title="Sign Out">
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="main-header">
          <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={24} />
          </button>

          <div className="search-bar glass-card">
            <Search size={18} />
            <input placeholder="Search for rooms or friends..." />
          </div>

          <div className="header-actions">
            <button className="theme-toggle-btn glass-card" onClick={toggleTheme} title="Toggle Theme">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        <div className="main-canvas animate-fade-in">
          <div className="welcome-banner glass-card">
            <div className="banner-content">
              <div className="banner-badge">NEW SEASON 🎉</div>
              <h1>Welcome back 👋, <span className="text-highlight">{user?.displayName || user?.email?.split('@')[0]}</span></h1>
              <p className="banner-subtitle">Host an anime party and watch with friends in sub-second sync.</p>
              <button className="btn-primary-glow" onClick={handleCreateRoom} disabled={isLoading}>
                Start New Watch Party <Plus size={22} />
              </button>
            </div>
            <div className="banner-visual desktop-only">
              <Sparkles size={80} className="floating-sparkle" />
              <div className="popcorn-emoji">🍿</div>
            </div>
          </div>

          <div className="dashboard-grid">
            <section className="join-section animate-slide-up">
              <div className="card-header">
                <h3>Join via Code</h3>
              </div>
              <form className="join-pill-container glass-card" onSubmit={handleJoinRoom}>
                <div className="input-with-icon">
                  <Clipboard size={18} className="input-icon-left" />
                  <input 
                    placeholder="Paste room link or code..." 
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                  />
                </div>
                <button type="submit" className="join-submit-btn" disabled={!joinCode.trim()}>Join Party</button>
              </form>
            </section>

            <section className="history-section full-width animate-slide-up" style={{ animationDelay: '0.1s' }} id="history">
              <div className="card-header">
                <h3>Recent Parties</h3>
                <span className="party-count-badge">{previousRooms.length} sessions</span>
              </div>

              <div className="room-history-list">
                {previousRooms.length > 0 ? (
                  previousRooms.map((room) => (
                    <div key={room.id} className="history-card glass-card" onClick={() => navigate(`/room/${room.code}`)}>
                      <div className="h-card-top">
                        <div className="h-icon-glow"><Users size={16} /></div>
                        <span className="h-count">{room.participantsCount || 0} watching</span>
                      </div>
                      <h4>{room.name || 'Anime Party'}</h4>
                      <div className="h-card-footer">
                        <span>{room.date}</span>
                        <div className="h-card-actions">
                          <button className="h-resume-btn">Resume</button>
                          {user && room.hostId === user.uid && (
                            <button className="h-end-btn" onClick={(e) => handleEndSession(e, room.id)}>
                              End Session
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-history-premium glass-card">
                    <div className="empty-visual">🎬</div>
                    <p>No watch parties yet. Start your first sync party 🎉</p>
                    <button className="btn-ghost-premium" onClick={handleCreateRoom}>
                      Start Now
                    </button>
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
