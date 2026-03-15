import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Hyperbeam from '@hyperbeam/web';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { 
  ArrowLeft, MessageSquare, Send, Copy, Check, Tv, Plus, 
  Moon, Sun, Volume2, Maximize, Play, Zap, Info
} from 'lucide-react';
import './WatchRoomPage.css';

export const WatchRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'chat' | 'users'>('chat');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hbInstance, setHbInstance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showControls, setShowControls] = useState(true);
  const controlsTimeout = useRef<any>(null);

  const { user } = useAuth();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Anonymous';
  const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';
  
  const [messages, setMessages] = useState<any[]>([]);
  const [activeParticipants, setActiveParticipants] = useState<any[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Theme Sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Handle idle controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
  };

  // Heartbeat & Participants
  useEffect(() => {
    if (!roomId || !user) return;
    
    const sendHeartbeat = async () => {
      try {
        const res = await fetch(`${API_URL}/api/rooms/${roomId}/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid, userName })
        });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        if (data.participants) {
          setActiveParticipants(data.participants);
          const currentUser = data.participants.find((p: any) => p.userId === user.uid);
          setIsHost(!!currentUser?.isHost);
          
          if (!data.isHostActive && !currentUser?.isHost) {
            setError("Room has been disbanded by the host.");
          }
        }
      } catch (err) {
        console.error("Heartbeat failed:", err);
      }
    };

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_URL}/api/rooms/${roomId}/messages`);
        if (!res.ok) return; // Silent fail for background polling
        const data = await res.json();
        setMessages(data);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    };

    sendHeartbeat();
    fetchMessages();
    
    const hInterval = setInterval(sendHeartbeat, 5000);
    const mInterval = setInterval(fetchMessages, 2000);
    
    return () => {
      clearInterval(hInterval);
      clearInterval(mInterval);
    };
  }, [roomId, user, userName, API_URL]);

  // Hyperbeam Initialization
  useEffect(() => {
    let hb: any = null;
    let isMounted = true;

    const initHyperbeam = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${API_URL}/api/room/${roomId}`);
        const data = await res.json();

        if (data.error) throw new Error(data.error);
        
        if (containerRef.current && isMounted) {
          hb = await Hyperbeam(containerRef.current, data.embedUrl);
          if (!isMounted) {
            hb.destroy();
          } else {
            setHbInstance(hb);
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load watch room");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    if (roomId && !hbInstance) initHyperbeam();

    return () => {
      isMounted = false;
      if (hb) hb.destroy();
    };
  }, [roomId, API_URL]);

  const handleLeaveRoom = async () => {
    if (!roomId || !user) return;
    if (!confirm(isHost ? 'Disband the party for everyone?' : 'Are you sure you want to leave?')) return;
    
    try {
      await fetch(`${API_URL}/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      });
      navigate('/dashboard');
    } catch (err) {
      navigate('/dashboard');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && user) {
      const msgText = message.trim();
      setMessage('');
      try {
        await fetch(`${API_URL}/api/rooms/${roomId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: msgText,
            user: userName,
            userId: user.uid,
            isSystem: false,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          })
        });
      } catch (err) {
        console.error("Failed to send message", err);
      }
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={`watch-room-page theme-${theme} ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`} onMouseMove={handleMouseMove}>
      <header className={`room-header glass-card ${showControls ? 'visible' : 'hidden'}`}>
        <div className="header-left">
          <button className="back-link" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={20} />
          </button>
          <div className="room-identity">
            <h3 className="room-name">{isHost ? '👑 Host Lobby' : 'SyncAnime Party'}</h3>
            <div className="active-badge">
              <span className="pulse-dot green"></span>
              {activeParticipants.length} Active Watching
            </div>
          </div>
        </div>

        <div className="header-center desk-flex">
          <div className="room-id-pill glass-card">
            <Info size={14} style={{opacity: 0.6}} />
            <span>ID: {roomId?.slice(0, 8)}...</span>
            <button className="copy-action" onClick={handleCopyLink}>
              {copied ? <Check size={14} className="text-pink" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <div className="header-right">
          <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className="pill-btn danger" onClick={handleLeaveRoom}>
            Leave Party
          </button>
          <button className="mobile-chat-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <MessageSquare size={20} />
          </button>
        </div>
      </header>

      <div className="main-layout">
        <main className="cinematic-area">
          <div className="player-wrapper">
            <div className="browser-container" ref={containerRef}>
              {isLoading && (
                <div className="loading-state">
                  <div className="anime-spinner"></div>
                  <p>Syncing virtual browser...</p>
                </div>
              )}
              {error && (
                <div className="error-state glass-card">
                  <Tv size={48} className="text-danger" />
                  <p>{error}</p>
                  <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
                </div>
              )}
            </div>

            {/* Floating Video Controls */}
            <div className={`video-controls-overlay ${showControls ? 'visible' : 'hidden'}`}>
                <div className="control-panel glass-card">
                   <button className="ctrl-btn"><Play size={22} fill="currentColor" /></button>
                   <div className="volume-wrap">
                      <Volume2 size={18} />
                      <div className="slider-bg"><div className="slider-fill" style={{width: '70%'}}></div></div>
                   </div>
                   <div className="sync-status">
                      <Zap size={14} className="text-pink" />
                      <span>Synced</span>
                   </div>
                   <button className="ctrl-btn"><Maximize size={20} /></button>
                </div>
            </div>

            {/* Active Avatars Center Bottom */}
            <div className={`floating-avatars ${showControls ? 'visible' : 'hidden'}`}>
               <div className="avatar-group glass-card">
                  {activeParticipants.slice(0, 4).map(p => (
                    <div key={p.userId} className="user-avatar-pip" title={`${p.userName} (${p.isHost ? 'Host' : 'Member'})`}>
                       <div className="pip-inner">
                          {p.userName?.charAt(0).toUpperCase()}
                          {p.isHost && <span className="host-badge">👑</span>}
                          <span className="online-dot pulsing"></span>
                       </div>
                    </div>
                  ))}
                  {activeParticipants.length > 4 && <div className="user-avatar-pip more">+{activeParticipants.length - 4}</div>}
                  <button className="add-friend-trigger" onClick={handleCopyLink}><Plus size={18} /></button>
               </div>
            </div>
          </div>
        </main>

        <aside className="discord-sidebar glass-card">
          <div className="sidebar-tabs">
            <button className={activeTab === 'chat' ? 'active' : ''} onClick={() => setActiveTab('chat')}>
              Live Chat
            </button>
            <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
              Members
            </button>
          </div>

          <div className="sidebar-content">
            {activeTab === 'chat' ? (
              <div className="chat-container">
                <div className="chat-scroller">
                  {messages.length === 0 && (
                    <div className="empty-chat">
                       <p>Start the conversation! 🍿</p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={`chat-message ${msg.userId === user?.uid ? 'is-self' : ''} ${msg.isHost ? 'is-host' : ''}`}>
                      <div className="msg-avatar">
                        {msg.user?.charAt(0).toUpperCase()}
                      </div>
                      <div className="msg-body">
                        <div className="msg-header">
                           <span className="msg-user">{msg.user}</span>
                           <span className="msg-time">{msg.time}</span>
                        </div>
                        <div className="msg-bubble">{msg.text}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>

                <div className="typing-area">
                  <div className="quick-emojis">
                    {['🔥', '😍', '👏', '😂', '😭', '✨', '🍿'].map(e => (
                      <button key={e} onClick={() => setMessage(prev => prev + e)}>{e}</button>
                    ))}
                  </div>
                  <form className="chat-input-wrap" onSubmit={handleSendMessage}>
                     <input 
                       placeholder="Say something nice..." 
                       value={message}
                       onChange={(e) => setMessage(e.target.value)}
                     />
                     <button className="chat-send-btn" disabled={!message.trim()} type="submit">
                        <Send size={18} />
                     </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="member-view">
                 {activeParticipants.map(p => (
                   <div key={p.userId} className={`member-row ${p.isHost ? 'host-glow' : ''}`}>
                      <div className="member-avatar-box">
                         {p.userName?.charAt(0).toUpperCase()}
                         <span className="ping-indicator excellent"></span>
                      </div>
                      <div className="member-details">
                         <span className="member-name">{p.userName}</span>
                         <span className="member-role">{p.isHost ? 'Party Host' : 'Member'}</span>
                      </div>
                      {p.isHost && <span className="role-icon">👑</span>}
                   </div>
                 ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
