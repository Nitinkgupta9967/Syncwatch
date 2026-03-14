import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Hyperbeam from '@hyperbeam/web';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';

import { ArrowLeft, Users, MessageSquare, Send, Copy, Check, Tv } from 'lucide-react';
import './WatchRoomPage.css';

export const WatchRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [activeTab, setActiveTab] = useState<'chat' | 'users'>('chat');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hbInstance, setHbInstance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Anonymous';
  const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';
  
  const [messages, setMessages] = useState<any[]>([]);

  const participants = [
    { id: 1, name: `${userName} (You)`, role: 'Host', avatar: 'var(--color-primary)' },
  ];

  // Fetch real-time chat messages via polling local db.json
  useEffect(() => {
    if (!roomId) return;
    
    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_URL}/api/rooms/${roomId}/messages`);
        const data = await res.json();
        setMessages(data);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    };

    fetchMessages(); // Call immediately on mount
    const interval = setInterval(fetchMessages, 2000); // Polling every 2 seconds
    
    return () => clearInterval(interval);
  }, [roomId, API_URL]);

  // Handle Hyperbeam Initialization
  useEffect(() => {
    let hb: any = null;
    let isMounted = true;

    const initHyperbeam = async () => {
      try {
        setIsLoading(true);
        // Fetch embed URL from our backend
        const res = await fetch(`${API_URL}/api/room/${roomId}`);
        const data = await res.json();

        if (data.error) throw new Error(data.error);
        if (!data.embedUrl) throw new Error("No embed URL received");

        // Initialize Hyperbeam SDK into the container ref
        if (containerRef.current && isMounted) {
          hb = await Hyperbeam(containerRef.current, data.embedUrl);
          if (!isMounted) {
            // StrictMode double UI render cleanup
            hb.destroy();
          } else {
            setHbInstance(hb);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Hyperbeam Init Error:", err);
          setError(err.message || "Failed to load watch room");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (roomId && !hbInstance) {
      initHyperbeam();
    }

    return () => {
      isMounted = false;
      // Cleanup browser instance on unmount
      if (hb) hb.destroy();
    };
  }, [roomId, API_URL]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && user) {
      const now = new Date();
      try {
        await fetch(`${API_URL}/api/rooms/${roomId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: message.trim(),
            user: userName,
            userId: user.uid,
            isSystem: false,
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          })
        });
        setMessage('');
      } catch (err: any) {
        console.error("Failed to send message", err);
        alert("Failed to send message: " + err.message);
      }
    }
  };
  
  // Auto-scroll to bottom of chat
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="watch-room-page">
      {/* Top Navbar specifically for Watch Room */}
      <header className="room-header glass">
        <div className="room-header-left">
          <Link to="/dashboard" className="back-btn">
            <ArrowLeft size={20} />
          </Link>
          <div className="room-info">
            <h1 className="room-title">Watch Party <span className="room-badge">LIVE</span></h1>
            <span className="room-subtitle">Code: {roomId}</span>
          </div>
        </div>
        
        <div className="room-header-brand">
          <Tv size={20} color="var(--color-primary)" />
          <span className="text-gradient font-bold ml-2">SyncAnime</span>
        </div>

        <div className="room-header-actions">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleCopyLink}
            className="invite-btn"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Invite'}
          </Button>
          <Link to="/dashboard">
            <Button variant="outline" size="sm" className="leave-btn">Leave</Button>
          </Link>
        </div>
      </header>

      <div className="room-content">
        {/* Main Video/Browser Area */}
        <main className="room-main">
          <div className="embedded-browser-container" style={{ position: 'relative' }}>
            {isLoading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e1e24', color: 'white', zIndex: 10 }}>
                <div className="animate-float" style={{ marginBottom: 16 }}><Tv size={48} color="var(--color-primary)" /></div>
                <h3>Starting Virtual Browser...</h3>
                <p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>Provisioning your SyncAnime room...</p>
              </div>
            )}
            
            {error && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e1e24', color: 'white', zIndex: 10 }}>
                <div style={{ marginBottom: 16 }}><Tv size={48} color="#ff3b30" /></div>
                <h3>Oops! Something went wrong</h3>
                <p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>{error}</p>
                <Link to="/dashboard" style={{ marginTop: 24 }}>
                  <Button variant="outline">Return to Dashboard</Button>
                </Link>
              </div>
            )}

            {/* The Hyperbeam canvas will inject into this container */}
            <div 
              ref={containerRef} 
              style={{ width: '100%', height: '100%', outline: 'none' }} 
            />
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="room-sidebar">
          <div className="sidebar-tabs">
            <button 
              className={`sidebar-tab ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare size={18} /> Chat
            </button>
            <button 
              className={`sidebar-tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={18} /> Participants ({participants.length})
            </button>
          </div>

          <div className="sidebar-content">
            {activeTab === 'chat' ? (
              <div className="chat-container">
                <div className="chat-messages">
                  {messages.map(msg => (
                    <div key={msg.id} className={`chat-message ${msg.isSystem ? 'system-message' : ''} ${msg.userId === user?.uid ? 'own-message' : ''}`}>
                      {msg.isSystem ? (
                        <div className="msg-content system">{msg.text}</div>
                      ) : (
                        <>
                          <div className="msg-header">
                            <span className="msg-user">{msg.user}</span>
                            <span className="msg-time">{msg.time}</span>
                          </div>
                          <div className="msg-content">{msg.text}</div>
                        </>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <form className="chat-input-area" onSubmit={handleSendMessage}>
                  <input 
                    type="text" 
                    className="chat-input" 
                    placeholder="Type a message..." 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <button type="submit" className="chat-send-btn" disabled={!message.trim()}>
                    <Send size={18} />
                  </button>
                </form>
              </div>
            ) : (
              <div className="participants-list">
                {participants.map(p => (
                  <div key={p.id} className="participant-item">
                    <div className="participant-avatar" style={{backgroundColor: p.avatar}}>
                      {p.name.charAt(0)}
                    </div>
                    <div className="participant-info">
                      <span className="participant-name">{p.name}</span>
                      <span className="participant-role">{p.role}</span>
                    </div>
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
