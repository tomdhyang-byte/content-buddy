'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button, IconButton } from '@/components/ui';

interface EditModalProps {
    isOpen: boolean;
    title: string;
    value: string;
    onChange: (value: string) => void;
    onClose: () => void;
    placeholder?: string;
    rows?: number;
}

export function EditModal({
    isOpen,
    title,
    value,
    onChange,
    onClose,
    placeholder = '輸入內容...',
    rows = 12,
}: EditModalProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    // Internal draft state - only synced to parent when user saves
    const [draft, setDraft] = useState(value);

    // Sync draft when modal opens or value changes from outside
    useEffect(() => {
        if (isOpen) {
            setDraft(value);
        }
    }, [isOpen, value]);

    // Focus textarea when modal opens
    useEffect(() => {
        if (isOpen && textareaRef.current) {
            textareaRef.current.focus();
            // Move cursor to end only on initial open
            textareaRef.current.setSelectionRange(
                textareaRef.current.value.length,
                textareaRef.current.value.length
            );
        }
    }, [isOpen]); // Only trigger on modal open, not on value change

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleSave = () => {
        onChange(draft); // Only call onChange when user clicks "完成"
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-[90vw] max-w-6xl h-[80vh] mx-4 bg-gray-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-white">{title}</h2>
                    <IconButton
                        icon="✕"
                        onClick={onClose}
                        className="rounded-full"
                        size="sm"
                    />
                </div>

                {/* Body */}
                <div className="flex-1 p-6 overflow-hidden">
                    <textarea
                        ref={textareaRef}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder={placeholder}
                        className="w-full h-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none text-lg leading-relaxed"
                    />
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/10 bg-gray-900/50">
                    <Button variant="ghost" onClick={onClose}>
                        取消
                    </Button>
                    <Button variant="primary" onClick={handleSave}>
                        完成
                    </Button>
                </div>
            </div>
        </div>
    );
}
