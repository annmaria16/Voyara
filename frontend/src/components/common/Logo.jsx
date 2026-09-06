import React from 'react';
import { Link } from 'react-router-dom';

export const Logo = ({ size = 'md', className = '', showSlogan = true, to = '/' }) => {
  const sizeClasses = {
    sm: 'h-9',
    md: 'h-12',
    lg: 'h-16',
    xl: 'h-24',
  };

  const imgContent = (
    <div className={`flex items-center space-x-3 group ${className}`}>
      <img
        src="/logo.png"
        alt="VOYARA"
        className={`${sizeClasses[size] || 'h-12'} w-auto object-contain rounded-xl transition-transform duration-300 group-hover:scale-105`}
      />
    </div>
  );

  if (to) {
    return <Link to={to} className="inline-block">{imgContent}</Link>;
  }

  return imgContent;
};
