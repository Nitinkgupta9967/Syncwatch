import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Users, MessageCircle, Plus, History as HistoryIcon, Tv } from 'lucide-react';
import './LandingPage.css';

export const LandingPage: React.FC = () => {
  return (
    <div className="landing-page">
      <div className="blob-container">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <nav className="floating-navbar glass-card">
        <div className="nav-container">
          <div className="nav-brand">
            <div className="logo-spark">✨</div>
            <span>SyncAnime</span>
          </div>
          <div className="nav-links desktop-only">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
          </div>
          <div className="nav-auth">
            <Link to="/auth" className="login-link">Login</Link>
            <Link to="/auth?signup=true" className="btn-get-started">Get Started</Link>
          </div>
        </div>
      </nav>
      
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Watch Anime Together — <span className="text-highlight">In Perfect Sync</span>
          </h1>
          <p className="hero-subtitle">
            Create private rooms, invite friends, and experience the ultimate synchronized virtual watch party. It's like your personal cinema, anywhere.
          </p>
          <div className="hero-buttons">
            <Link to="/auth?signup=true" className="btn-primary">
              Create Room <Plus size={20} />
            </Link>
            <Link to="/auth" className="btn-secondary">
              Join Room <Play size={20} />
            </Link>
          </div>
        </div>
        
        <div className="hero-visual">
          <div className="anime-abstract">
            <div className="circle-ring"></div>
            <div className="glass-peek-card">
              <div className="peek-header">
                <div className="peek-dots"><span></span><span></span><span></span></div>
              </div>
              <div className="peek-body">
                <div className="peek-video-placeholder">
                  <Play size={40} fill="white" color="white" />
                </div>
                <div className="peek-chat">
                  <div className="chat-line">🔥 EPIC MOMENT!</div>
                  <div className="chat-line">I can't believe it! 😱</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="features-section">
        <div className="section-title-box">
          <h2>Premium Features</h2>
          <p>Everything you need for a startup-grade watch party.</p>
        </div>
        
        <div className="features-grid">
          {[
            { icon: <Play />, title: "Real-time Sync", desc: "Perfectly synced playback for everyone." },
            { icon: <Plus />, title: "Private Rooms", desc: "Invite-only spaces for you and your friends." },
            { icon: <MessageCircle />, title: "Live Chat", desc: "Express yourself with real-time messaging." },
            { icon: <Users />, title: "Invite Friends", desc: "Shareable links for instant joining." },
            { icon: <HistoryIcon />, title: "Watch History", desc: "Keep track of all your past parties." },
            { icon: <Tv />, title: "Multi-device", desc: "Works seamlessly on desktop and mobile." }
          ].map((f, i) => (
            <div key={i} className="feature-card glass-card">
              <div className="f-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="how-it-works">
        <h2>How It Works</h2>
        <div className="timeline">
          <div className="timeline-item">
            <div className="t-num">1</div>
            <h3>Create Room</h3>
            <p>Start a new private room in one click.</p>
          </div>
          <div className="timeline-item">
            <div className="t-num">2</div>
            <h3>Share Link</h3>
            <p>Invite your friends with a magic link.</p>
          </div>
          <div className="timeline-item">
            <div className="t-num">3</div>
            <h3>Watch Together</h3>
            <p>Enjoy anime in perfect sub-second sync.</p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">SyncAnime</div>
          <p>© 2026 SyncAnime. Built for the community.</p>
        </div>
      </footer>
    </div>
  );
};
