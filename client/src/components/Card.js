'use client';

export default function Card({ children, className = '', padding = 'p-6', ...props }) {
  return (
    <div 
      className={`bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
