import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Play, Users, MessageCircle, Star } from 'lucide-react';
import './LandingPage.css';

export const LandingPage: React.FC = () => {
  return (
    <div className="landing-page">
      <Navbar />
      
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge animate-fade-in">✨ Synchronized Anime Experience</div>
          <h1 className="hero-title animate-fade-in">Watch Anime Together.<br/><span className="text-gradient">Anytime. Anywhere.</span></h1>
          <p className="hero-subtitle animate-fade-in">
            Create a watch room, invite your friends, and enjoy synchronized playback with our built-in shared browser. No more "3, 2, 1, play!"
          </p>
          <div className="hero-actions animate-fade-in">
            <Link to="/auth?signup=true">
              <Button size="lg" variant="primary">Create Room <Play size={20} fill="currentColor" /></Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="secondary">Join Room</Button>
            </Link>
          </div>
        </div>
        
        {/* Abstract Anime UI Illustration */}
        <div className="hero-illustration animate-float">
          <div className="abstract-shape shape-1"></div>
          <div className="abstract-shape shape-2"></div>
          <Card glass className="glass-mockup">
            <div className="mockup-header">
              <div className="mockup-dots"><span></span><span></span><span></span></div>
              <div className="mockup-url">syncanime.com/room/abc-xyz</div>
            </div>
            <div className="mockup-body">
              <div className="mockup-video">
                <Play size={48} color="rgba(255, 255, 255, 0.8)" fill="currentColor" />
              </div>
              <div className="mockup-chat">
                <div className="chat-bubble">OMG this episode is so good!</div>
                <div className="chat-bubble right">I know right?! 😭</div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2 className="section-title">Why SyncAnime?</h2>
          <p className="section-subtitle">Everything you need for the perfect remote watch party.</p>
        </div>
        
        <div className="features-grid">
          <Card hoverable className="feature-card">
            <div className="feature-icon"><Play size={32} color="var(--color-primary)" /></div>
            <h3>Perfect Sync</h3>
            <p>Our shared virtual browser ensures everyone is watching the exact same frame at the exact same time.</p>
          </Card>
          <Card hoverable className="feature-card">
            <div className="feature-icon"><MessageCircle size={32} color="var(--color-secondary)" /></div>
            <h3>Live Chat & Reactions</h3>
            <p>React to your favorite moments in real-time with our built-in chat and emoji system.</p>
          </Card>
          <Card hoverable className="feature-card">
            <div className="feature-icon"><Users size={32} color="var(--color-tertiary)" /></div>
            <h3>Any Site, Any Anime</h3>
            <p>Access Crunchyroll, Netflix, or any other site through the shared browser. No limits.</p>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="how-section">
        <div className="how-content">
          <h2 className="section-title">As easy as 1, 2, 3</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-text">
                <h3>Create a Room</h3>
                <p>Sign up in seconds and spin up a new watch room instantly.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-text">
                <h3>Share the Link</h3>
                <p>Send the unique room code or link to your friends. They don't even need an account to join.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-text">
                <h3>Start Watching</h3>
                <p>Navigate to your favorite anime site in the shared browser and hit play!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section">
        <div className="section-header">
          <h2 className="section-title">Loved by Otakus</h2>
        </div>
        <div className="testimonials-grid">
          <Card glass className="testimonial-card">
            <div className="testimonial-stars">
              {[1, 2, 3, 4, 5].map(i => <Star key={i} size={16} color="#FFD700" fill="#FFD700" />)}
            </div>
            <p className="testimonial-text">"SyncAnime completely changed how my long-distance friends and I watch weekly episodes. No more countdowns!"</p>
            <div className="testimonial-author">
              <div className="author-avatar" style={{backgroundColor: "var(--color-primary)"}}>K</div>
              <div>
                <div className="author-name">Kenji</div>
                <div className="author-role">Weekly Watcher</div>
              </div>
            </div>
          </Card>
          <Card glass className="testimonial-card">
            <div className="testimonial-stars">
              {[1, 2, 3, 4, 5].map(i => <Star key={i} size={16} color="#FFD700" fill="#FFD700" />)}
            </div>
            <p className="testimonial-text">"The built-in virtual browser is magic. We can literally watch anything without worrying about regional locks if the host has it."</p>
            <div className="testimonial-author">
              <div className="author-avatar" style={{backgroundColor: "var(--color-secondary)"}}>S</div>
              <div>
                <div className="author-name">Sarah M.</div>
                <div className="author-role">Movie Night Host</div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};
