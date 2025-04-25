import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
  bgColor?: string;
  rounded?: boolean;
  shadow?: boolean;
  width?: string;
}

/**
 * Card component provides consistent card styling across the application
 */
const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'p-4',
  bgColor = 'bg-white',
  rounded = false,
  shadow = false,
  width,
}) => {
  // Build the class string with individual space-separated classes
  const classes = [
    bgColor,
    padding,
    rounded ? 'rounded-lg' : '',
    shadow ? 'shadow-md' : '',
    width,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <div>{children}</div>
    </div>
  );
};

export default Card;