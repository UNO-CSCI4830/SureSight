import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  padded?: boolean;
}

/**
 * Card component provides consistent card styling across the application
 */
const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = true,
  padded = true,
}) => {
  return (
    <div 
      className={`
        bg-white rounded-xl shadow-card
        ${hoverable ? 'transition-shadow duration-200 hover:shadow-hover' : ''}
        ${padded ? 'p-6' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;