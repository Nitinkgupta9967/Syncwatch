import React from 'react';
import { Tv, Heart } from 'lucide-react';
import './Footer.css';

export const Footer: React.FC = () => {
  return (
    <footer className="sync-footer">
      <div className="sync-footer-content">
        <div className="sync-footer-brand">
          <div className="sync-footer-logo">
            <Tv size={24} color="var(--color-primary)" />
            <span className="sync-footer-title">SyncAnime</span>
          </div>
          <p className="sync-footer-tagline">Watch Anime Together. Anytime. Anywhere.</p>
        </div>
        
        <div className="sync-footer-links">
          <div className="sync-footer-column">
            <h4>Product</h4>
            <a href="#">Features</a>
            <a href="#">Pricing</a>
            <a href="#">Updates</a>
          </div>
          <div className="sync-footer-column">
            <h4>Support</h4>
            <a href="#">Help Center</a>
            <a href="#">Community</a>
            <a href="#">Contact Us</a>
          </div>
          <div className="sync-footer-column">
            <h4>Legal</h4>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </div>
      <div className="sync-footer-bottom">
        <p>Made with <Heart size={14} color="var(--color-secondary)" style={{ display: 'inline', margin: '0 4px', verticalAlign: 'middle' }} /> for anime lovers. © {new Date().getFullYear()} SyncAnime.</p>
      </div>
    </footer>
  );
};
