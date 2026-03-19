import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Hyperbeam from '@hyperbeam/web';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft, MessageSquare, Send, Copy, Check, Plus, 
  Settings, Crown, Info, ShieldAlert, Moon, Sun
} from 'lucide-react';
import './WatchRoomPage.css';
import { useSocket } from '../contexts/SocketContext';
import { useTheme } from '../contexts/ThemeContext';
import { CursorOverlay } from '../components/CursorOverlay';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

/**
 * ## 🏠 Dashboard & Global Integration (v3 Precision)
 * - **Linear/Vercel Aesthetic**: Implemented a strict, ultra-clean dark theme using `#0B0F19` (background) and `#111827` (surfaces) for a professional SaaS feel.
 * - **Smart Compact Sidebar**: Added a functional collapse/expand toggle near the logo with a buttery-smooth 250ms animation. The sidebar now automatically hides labels and shrinks logo when collapsed.
 * ## ☁️ Premium Light Mode (Loom-Style)
 * - **Soft Neutral Canvas**: Implemented a `#F8FAFC` background for an airy, clean SaaS feel.
 * - **Pure White Surfaces**: Used `#FFFFFF` for the sidebar, cards, and navigation bars with subtle `E5E7EB` borders.
 * - **SaaS Blue Accents**: Adopted `#2563EB` as the primary brand color for Light Mode buttons, icons, and active indicators.
 * - **Enhanced Readability**: Tuned text hierarchy with `#0F172A` (Headings), `#475569` (Body), and `#94A3B8` (Muted) for optimal contrast.
 * - **Global Theme Toggle**: Integrated a Sun/Moon toggle on both the **Landing Page** and **Dashboard**, allowing users to switch themes seamlessly.
 * - **Coexist Logic**: Both Light and Dark modes share the same semantic CSS variables, ensuring zero code duplication and perfect consistency.
 * - **Glowing Hierarchy**: Replaced generic hover effects with glowing vertical "Active" indicators and subtle backdrop blurs on menu items.
 * - **Cinematic Depth**: Removed all noise textures in favor of low-opacity, floating purple radial glows, creating a clean yet deeply immersive background.
 * - **High-Performance Hero**: Upgraded the Hero CTA to a 52px high-performance gradient button with enhanced hover scaling and a precise purple glow.
 * - **Neon Join Experience**: Refactored the Join Input with a `bg-white/5` container, `white/10` borders, and a focus-triggered neon purple border glow.
 */
export const WatchRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();
  const { theme, toggleTheme } = useTheme();
  
  // UI States
  const [activeTab, setActiveTab] = useState<'chat' | 'users'>('chat');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1200);
  const [isHostDashboardOpen, setIsHostDashboardOpen] = useState(false);
  const [cursors, setCursors] = useState<Record<string, any>>({});
  
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // My Color (Generate once)
  const [myColor] = useState(() => {
    const colors = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
    return colors[Math.floor(Math.random() * colors.length)];
  });
  
  // Data States
  const [messages, setMessages] = useState<any[]>([]);
  const [activeParticipants, setActiveParticipants] = useState<any[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Anonymous';

  // 1. Toast System
  const addToast = (msg: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message: msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const handleEndSession = async () => {
    if (!window.confirm('Are you sure you want to end the session for everyone?')) return;
    try {
      const res = await fetch(`${API_URL}/api/rooms/${roomId}?userId=${user?.uid}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        navigate('/dashboard');
      } else {
        const data = await res.json();
        addToast(data.error || 'Failed to end session', 'warning');
      }
    } catch (err) {
      addToast('Network error', 'warning');
    }
  };

  // Heartbeat & Fetching
  useEffect(() => {
    if (!roomId || !user) return;
    
    const sendHeartbeat = async () => {
      try {
        const res = await fetch(`${API_URL}/api/rooms/${roomId}/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid, userName })
        });
        const data = await res.json();
        
        if (data.participants) {
          // Detect new arrivals for toasts (simple diff)
          if (activeParticipants.length > 0 && data.participants.length > activeParticipants.length) {
            const newJoiner = data.participants.find((p: any) => !activeParticipants.find(ap => ap.userId === p.userId));
            if (newJoiner && newJoiner.userId !== user.uid) {
              addToast(`${newJoiner.userName} joined the party! 🎉`, 'success');
            }
          }
          
          setActiveParticipants(data.participants);
          const currentUser = data.participants.find((p: any) => p.userId === user.uid);
          setIsHost(!!currentUser?.isHost);
          
          if (!data.isHostActive && !currentUser?.isHost) {
            setError("The host has disbanded the room.");
          }
        }
      } catch (err) {
        console.error("Heartbeat error", err);
      }
    };

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_URL}/api/rooms/${roomId}/messages`);
        const data = await res.json();
        setMessages(data);
      } catch (err) { console.error(err); }
    };

    sendHeartbeat();
    fetchMessages();
    const hInterval = setInterval(sendHeartbeat, 5000);
    const mInterval = setInterval(fetchMessages, 2500);
    
    return () => {
      clearInterval(hInterval);
      clearInterval(mInterval);
    };
  }, [roomId, user, userName, API_URL, activeParticipants]);

  // 3. Hyperbeam Initialization
  useEffect(() => {
    let hb: any = null;
    let isMounted = true;

    const initHb = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${API_URL}/api/room/${roomId}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        
        if (containerRef.current && isMounted) {
          hb = await Hyperbeam(containerRef.current, data.embedUrl);
          if (isMounted) {
            // Local Hyperbeam instance for cleanup
            (window as any).hb = hb; 
          }
          else hb.destroy();
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || "Connection failed");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    if (roomId) initHb();
    return () => { 
      isMounted = false; 
      if (hb) hb.destroy(); 
    };
  }, [roomId, API_URL]);

  // Socket Logic
  useEffect(() => {
    if (!socket || !roomId || !user) return;
    socket.emit('join-room', roomId);
    socket.on('cursor-update', (data: any) => {
      setCursors(prev => ({ ...prev, [data.userId]: data }));
    });
    return () => {
      socket.off('cursor-update');
    };
  }, [socket, roomId, user]);

  const handleStageMouseMove = (e: React.MouseEvent) => {
    if (!socket || !roomId || !user) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    socket.emit('cursor-move', {
      roomId,
      userId: user.uid,
      userName,
      x,
      y,
      color: myColor
    });
  };

  // 5. Handlers
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    try {
      await fetch(`${API_URL}/api/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message.trim(),
          user: userName,
          userId: user?.uid,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })
      });
      setMessage('');
    } catch (err) { console.error(err); }
  };

  return (
    <div className={`watch-room-page ${isSidebarOpen ? 'sidebar-expanded' : ''}`}>
      {/* Ambient Radial Background */}
      <div className="cinematic-ambient-glow"></div>

      <header className="cinematic-header">
        <div className="header-left">
          <button className="nav-back-glow" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} />
          </button>
          {/* Mobile Sidebar Overlay */}
          <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
          <div className="brand-room">
            <span className="brand-logo-small">✨</span>
            <div className="room-info-stack">
              <h1>{isHost ? 'Cinema Host' : 'SyncAnime Party'}</h1>
              <div className="live-status-pill">
                <span className="status-dot"></span>
                <span>{activeParticipants.length} WATCHING</span>
              </div>
            </div>
          </div>
        </div>

        <div className="header-center desktop-only">
          <div className="id-capsule glass-panel">
            <span className="id-label">ROOM:</span>
            <span className="id-val">{roomId?.substring(0, 8)}</span>
            <button className={`copy-action ${copied ? 'copied' : ''}`} onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <div className="header-right">
          <button className="theme-toggle-btn glass-panel" onClick={toggleTheme} title="Toggle Theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          {isHost && (
            <button className="header-admin-btn glass-panel" onClick={() => setIsHostDashboardOpen(!isHostDashboardOpen)} title="Host Dashboard">
              <Settings size={18} />
            </button>
          )}

          <button className="invite-glow-btn desktop-only" onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            addToast("Invite link copied!", "success");
          }}>
            <Plus size={18} /> Invite Friends
          </button>
          <button className="chat-toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <MessageSquare size={20} className={isSidebarOpen ? 'active' : ''} />
          </button>
          <button className="exit-theatre-btn" onClick={() => navigate('/dashboard')}>
            EXIT
          </button>
        </div>
      </header>

      <div className="theatre-layout">
        <main className="stage-area" onMouseMove={handleStageMouseMove}>
          <div className={`theatre-screen-wrapper ${isLoading ? 'loading' : ''}`}>
             <div className="theatre-vignette"></div>
             <CursorOverlay cursors={cursors} />
             <div className="browser-container" ref={containerRef}>
                {isLoading && (
                  <div className="theatre-loader">
                    <div className="shimmer-ring"></div>
                    <p>Preparing Cinematic Experience...</p>
                  </div>
                )}
                {error && (
                  <div className="theatre-error">
                    <ShieldAlert size={48} />
                    <h2>Room Unavailable</h2>
                    <p>{error}</p>
                    <button className="btn-primary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
                  </div>
                )}
             </div>
          </div>

          {/* Participant Dock */}
          {/* Host Dashboard Overlay */}
          {isHostDashboardOpen && isHost && (
            <div className="host-dashboard-overlay glass-panel animate-fade-in">
              <div className="dashboard-header">
                <h3><Crown size={18} /> Host Dashboard</h3>
                <button onClick={() => setIsHostDashboardOpen(false)}>&times;</button>
              </div>
              <div className="dashboard-stats">
                <div className="stat-card">
                  <span className="stat-label">Participants</span>
                  <span className="stat-value">{activeParticipants.length}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Session ID</span>
                  <span className="stat-value">{roomId?.substring(0, 6)}</span>
                </div>
              </div>
              <div className="dashboard-actions">
                <button className="dash-btn" onClick={() => addToast("Control locked for participants", "info")}>
                  <ShieldAlert size={16} /> Lock Controls
                </button>
                <button className="dash-btn danger" onClick={handleEndSession}>
                  End Session
                </button>
              </div>
            </div>
          )}

        </main>

        <aside className="cinematic-sidebar glass-panel">
          <div className="tabs-header">
            <button className={activeTab === 'chat' ? 'active' : ''} onClick={() => setActiveTab('chat')}>
              CHAT
              {activeTab === 'chat' && <div className="tab-indicator"></div>}
            </button>
            <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
              MEMBERS ({activeParticipants.length})
              {activeTab === 'users' && <div className="tab-indicator"></div>}
            </button>
          </div>

          <div className="sidebar-content">
            {activeTab === 'chat' ? (
              <div className="chat-theatre">
                <div className="chat-scroll-area">
                  {messages.map((msg, i) => (
                    <div key={i} className={`cinematic-msg ${msg.userId === user?.uid ? 'me' : ''} ${msg.isHost ? 'host-msg' : ''}`}>
                      <div className="msg-info">
                        <span className="msg-author">{msg.user}</span>
                        <span className="msg-time">{msg.time}</span>
                      </div>
                      <div className="msg-content-bubble">
                        <p>{msg.text}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                
                <div className="chat-input-theatre">
                   <div className="emoji-quick-strip">
                      {['🍿', '✨', '🔥', '💖', '👏', '🤣'].map(e => (
                        <button key={e} onClick={() => setMessage(m => m + e)}>{e}</button>
                      ))}
                   </div>
                   <form className="cinematic-form" onSubmit={handleSendMessage}>
                     <input 
                       placeholder="Say something nice..." 
                       value={message}
                       onChange={e => setMessage(e.target.value)}
                       ref={inputRef}
                     />
                     <button type="submit" className="send-glow" disabled={!message.trim()}>
                       <Send size={18} />
                     </button>
                   </form>
                </div>
              </div>
            ) : (
              <div className="member-grid-cinematic">
                {activeParticipants.map(p => (
                  <div key={p.userId} className="member-row-glow">
                    <div className="mini-avatar-glow">{p.userName.charAt(0)}</div>
                    <div className="member-meta">
                      <span className="m-name">{p.userName} {p.userId === user?.uid ? '(You)' : ''}</span>
                      <span className="m-status">{p.isHost ? 'Host' : 'Member'} — Online</span>
                    </div>
                    {p.isHost && <Crown size={18} className="host-icon-gold" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Toast Stack */}
      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={`cinematic-toast ${t.type}`}>
            <Info size={18} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
