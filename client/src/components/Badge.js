'use client';

const variants = {
  default: 'bg-slate-100 text-slate-700',
  primary: 'bg-slate-900 text-white',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-rose-100 text-rose-700',
  neutral: 'bg-slate-50 text-slate-500 border border-slate-200',
};

const sizes = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1 text-sm',
};

export default function Badge({ children, variant = 'default', size = 'sm', className = '' }) {
  return (
    <span className={`inline-flex items-center font-bold rounded-lg ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}
