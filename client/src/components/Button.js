'use client';

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 focus:ring-slate-900',
  secondary: 'bg-white text-slate-900 border border-slate-200 shadow-sm hover:bg-slate-50 focus:ring-slate-900',
  outline: 'bg-transparent text-slate-900 border-2 border-slate-900 hover:bg-slate-50 focus:ring-slate-900',
  ghost: 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-500',
  danger: 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:bg-rose-600 focus:ring-rose-500',
};

const sizes = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3.5 text-sm',
  lg: 'px-8 py-4 text-base',
};

const Button = forwardRef(({ 
  children, 
  className = '', 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  disabled, 
  type = 'button',
  icon: Icon,
  ...props 
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95';
  
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={`
        ${baseStyles}
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${className}
      `}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {!isLoading && Icon && <Icon className="mr-2 h-4 w-4" />}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button; 