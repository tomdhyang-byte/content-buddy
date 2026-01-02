import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: React.ReactNode;
    variant?: 'default' | 'ghost' | 'danger' | 'primary';
    size?: 'sm' | 'md' | 'lg';
    title?: string;
}

export function IconButton({
    icon,
    variant = 'default',
    size = 'md',
    className = '',
    title,
    ...props
}: IconButtonProps) {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        default: 'text-gray-400 hover:text-white hover:bg-white/10 focus:ring-indigo-500',
        primary: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg focus:ring-indigo-500',
        ghost: 'text-gray-500 hover:text-gray-300 hover:bg-white/5 focus:ring-gray-500',
        danger: 'text-gray-500 hover:text-red-400 hover:bg-red-500/10 focus:ring-red-500',
    };

    const sizes = {
        sm: 'w-6 h-6 text-sm',
        md: 'w-8 h-8 text-base',
        lg: 'w-10 h-10 text-lg',
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            title={title}
            {...props}
        >
            {icon}
        </button>
    );
}
