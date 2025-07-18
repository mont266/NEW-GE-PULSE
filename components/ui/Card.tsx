
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  isHoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, onClick, isHoverable }) => {
  const baseClasses = 'bg-gray-800/60 border border-gray-700/50 rounded-lg p-6 shadow-md';
  const hoverClasses = isHoverable ? 'transition-all duration-200 hover:bg-gray-700/80 hover:border-gray-600 cursor-pointer' : '';
  
  return (
    <div className={`${baseClasses} ${hoverClasses} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
};
