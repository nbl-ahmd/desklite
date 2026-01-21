'use client';

import { forwardRef } from 'react';

const Input = forwardRef(({ 
  label, 
  error, 
  icon: Icon,
  rightIcon: RightIcon,
  onRightIconClick,
  helperText,
  className = '',
  disabled,
  ...props 
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={`
            block w-full rounded-xl border-0 bg-slate-50 sm:text-sm transition-all duration-200
            text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-normal
            focus:bg-white focus:ring-2 focus:ring-slate-900 focus:shadow-lg
            disabled:opacity-60 disabled:cursor-not-allowed
            ${Icon ? 'pl-11' : 'pl-4'}
            ${RightIcon ? 'pr-11' : 'pr-4'}
            ${error ? 'ring-2 ring-rose-500/20 bg-rose-50 text-rose-900' : ''}
            py-3.5
            ${className}
          `}
          {...props}
        />
        {RightIcon && (
          <div 
            className={`absolute inset-y-0 right-0 pr-4 flex items-center ${onRightIconClick ? 'cursor-pointer' : 'pointer-events-none'}`}
            onClick={onRightIconClick}
          >
            <RightIcon className={`h-5 w-5 ${error ? 'text-rose-500' : 'text-slate-400'}`} aria-hidden="true" />
          </div>
        )}
      </div>
      {error && (
        <p className="mt-2 text-sm text-rose-600 font-medium flex items-center gap-1.5 ml-1">
          <span className="w-1 h-1 rounded-full bg-rose-600 inline-block" />
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className="mt-2 text-xs text-slate-400 font-medium ml-1">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input; 