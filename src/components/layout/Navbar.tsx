import React from 'react';
import { Link } from 'react-router-dom';
import { Tv } from 'lucide-react';
import { Button } from '../ui/Button';
import './Navbar.css';

export const Navbar: React.FC = () => {
  return (
    <nav className="sync-navbar glass animate-fade-in">
      <div className="sync-navbar-container">
        <Link to="/" className="sync-navbar-brand">
          <div className="sync-navbar-logo">
            <Tv size={24} color="var(--color-primary)" />
          </div>
          <span className="sync-navbar-title text-gradient">SyncAnime</span>
        </Link>
        
        <div className="sync-navbar-links">
          <Link to="/#features" className="sync-nav-link">Features</Link>
          <Link to="/#how-it-works" className="sync-nav-link">How it Works</Link>
        </div>

        <div className="sync-navbar-actions">
          <Link to="/auth">
            <Button variant="ghost">Log in</Button>
          </Link>
          <Link to="/auth?signup=true">
            <Button variant="primary">Sign up</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};
