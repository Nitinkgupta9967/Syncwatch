import React from 'react';
import './CursorOverlay.css';

interface Cursor {
  userId: string;
  userName: string;
  x: number;
  y: number;
  color: string;
}

interface CursorOverlayProps {
  cursors: Record<string, Cursor>;
}

export const CursorOverlay: React.FC<CursorOverlayProps> = ({ cursors }) => {
  return (
    <div className="cursor-overlay-container">
      {Object.values(cursors).map((cursor) => (
        <div
          key={cursor.userId}
          className="remote-cursor"
          style={{
            left: `${cursor.x}%`,
            top: `${cursor.y}%`,
            backgroundColor: cursor.color,
          }}
        >
          <div className="cursor-pointer" style={{ borderColor: `${cursor.color} transparent transparent ${cursor.color}` }}></div>
          <div className="cursor-label" style={{ backgroundColor: cursor.color }}>
            {cursor.userName}
          </div>
        </div>
      ))}
    </div>
  );
};
