import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Hyperbeam from '@hyperbeam/web';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';

import { ArrowLeft, MessageSquare, Send, Copy, Check, Tv } from 'lucide-react';
import './WatchRoomPage.css';

export const WatchRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
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
  const [activeParticipants, setActiveParticipants] = useState<any[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 1. Heartbeat & Participants
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

  // Handle Hyperbeam Initialization
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
        // Ensure input stays focused on mobile after sending
        inputRef.current?.focus();
      } catch (err: any) {
        console.error("Failed to send message", err);
      }
    }
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus fixed for keyboards
  useEffect(() => {
    if (activeTab === 'chat' && isSidebarOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeTab, isSidebarOpen]);

  const insertEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div className={`watch-room-page ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <header className="room-header">
        <div className="header-left">
          <button className="icon-btn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={20} />
          </button>
          <div className="room-meta-header">
            <h3>{isHost ? 'Your Watch Party' : "Watching Party"}</h3>
            <div className="status-badge">
              <span className="pulse"></span>
              {activeParticipants.length} active
            </div>
          </div>
        </div>

        <div className="header-center desktop-only">
          <div className="room-id-tag">
            <code>#{roomId?.slice(0, 8)}</code>
            <button className="copy-btn" onClick={handleCopyLink}>
              {copied ? <Check size={14} color="#27c93f" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <div className="header-right">
          <button className="btn-invite mobile-only" onClick={handleCopyLink}>
             <Copy size={18} />
          </button>
          <button className="btn-leave" onClick={handleLeaveRoom}>
            {isHost ? 'Disband' : 'Leave'}
          </button>
          <button 
            className={`btn-chat-toggle mobile-only ${isSidebarOpen ? 'active' : ''}`}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <MessageSquare size={20} />
          </button>
        </div>
      </header>

      <div className="main-layout">
        <main className="video-area">
          <div className="browser-frame" ref={containerRef}>
            {(isLoading || error) && (
              <div className="loading-overlay">
                 {error ? (
                    <div className="error-state">
                      <Tv size={48} color="#ff3b30" />
                      <p>{error}</p>
                      <Button onClick={() => navigate('/dashboard')}>Go Home</Button>
                    </div>
                 ) : (
                    <div className="loading-state">
                      <div className="spinner"></div>
                      <p>Waking up virtual browser...</p>
                    </div>
                 )}
              </div>
            )}
          </div>
        </main>

        <aside className="sidebar-area">
          <div className="sidebar-header">
            <button 
              className={activeTab === 'chat' ? 'active' : ''} 
              onClick={() => setActiveTab('chat')}
            >
              Chat
            </button>
            <button 
              className={activeTab === 'users' ? 'active' : ''} 
              onClick={() => setActiveTab('users')}
            >
              Members
            </button>
            <button className="mobile-only close-sidebar" onClick={() => setIsSidebarOpen(false)}>×</button>
          </div>

          <div className="sidebar-body">
            {activeTab === 'chat' ? (
              <div className="chat-wrapper">
                <div className="chat-log">
                  {messages.map((msg, i) => (
                    <div key={i} className={`msg-item ${msg.userId === user?.uid ? 'own' : ''}`}>
                      <div className="msg-bubble">
                        <span className="msg-sender">{msg.user}</span>
                        <p>{msg.text}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                
                <div className="chat-controls">
                  <div className="emoji-bar">
                    {['😊', '🍿', '🔥', '💖', '👏', '😂'].map(e => (
                      <button key={e} onClick={() => insertEmoji(e)}>{e}</button>
                    ))}
                  </div>
                  <form className="input-row" onSubmit={handleSendMessage}>
                    <input 
                      ref={inputRef}
                      placeholder="Type something..." 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    <button type="submit" disabled={!message.trim()}>
                      <Send size={18} />
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="member-list">
                {activeParticipants.map(p => (
                  <div key={p.userId} className="member-item">
                    <div className="member-avatar">
                      {p.userName?.charAt(0)}
                    </div>
                    <div className="member-info">
                      <span className="member-name">{p.userId === user?.uid ? 'You' : p.userName}</span>
                      {p.isHost && <span className="host-tag">Host</span>}
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
