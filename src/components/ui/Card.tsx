import React, { type HTMLAttributes } from 'react';
import './Card.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  glass = false,
  hoverable = false,
  className = '',
  ...props
}) => {
  const classes = [
    'sync-card',
    glass ? 'glass' : '',
    hoverable ? 'sync-card-hover' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};
