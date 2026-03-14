import React, { type InputHTMLAttributes } from 'react';
import './Input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  fullWidth = false,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  const containerClasses = [
    'sync-input-container',
    fullWidth ? 'sync-input-full' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {label && <label htmlFor={inputId} className="sync-input-label">{label}</label>}
      <input
        id={inputId}
        className={`sync-input ${error ? 'sync-input-error' : ''}`}
        {...props}
      />
      {error && <span className="sync-input-err-msg">{error}</span>}
    </div>
  );
};
