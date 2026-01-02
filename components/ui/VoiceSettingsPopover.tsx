'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { Spinner } from './Spinner';
import { IconButton } from './IconButton';

import { createPortal } from 'react-dom';

interface VoiceSettingsPopoverProps {
    speed: number;
    emotion: string;
    onSpeedChange: (speed: number) => void;
    onEmotionChange: (emotion: string) => void;
    onRegenerate: () => void;
    isRegenerating: boolean;
}

const EMOTIONS = [
    { value: 'neutral', label: '😐 中性' },
    { value: 'happy', label: '😄 開心' },
    { value: 'sad', label: '😢 悲傷' },
    { value: 'angry', label: '😠 生氣' },
    { value: 'fearful', label: '😨 恐懼' },
];

export function VoiceSettingsPopover({
    speed,
    emotion,
    onSpeedChange,
    onEmotionChange,
    onRegenerate,
    isRegenerating
}: VoiceSettingsPopoverProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Calculate position
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            // Align top-right of popover with bottom-right of button (roughly)
            // Or just below the button, aligned to the right edge
            // Popover width is w-64 (16rem = 256px)
            const popoverWidth = 256;

            setPosition({
                top: rect.bottom + 8, // 8px Offset
                left: rect.right - popoverWidth
            });
        }
    }, [isOpen]);

    // Close on click outside
    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: Event) => {
            // Check if click is inside popover
            if (popoverRef.current && popoverRef.current.contains(event.target as Node)) {
                return;
            }
            // Check if click is on the trigger button (prevent immediate internal re-toggle)
            if (buttonRef.current && buttonRef.current.contains(event.target as Node)) {
                return;
            }
            setIsOpen(false);
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            // Handle scrolling - close on scroll could be nice, or recalculate. 
            // For simplicity, let's close on scroll to prevent detached UI.
            document.addEventListener('scroll', handleClickOutside, true);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('scroll', handleClickOutside, true);
        };
    }, [isOpen]);

    return (
        <>
            <div ref={buttonRef as any} className="inline-block" title="語音設定">
                <IconButton
                    icon="⚙️"
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-1.5"
                    title="語音設定"
                />
            </div>

            {isOpen && createPortal(
                <div
                    ref={popoverRef}
                    className="fixed w-64 bg-gray-900 border border-white/10 rounded-xl shadow-2xl z-[100] p-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar"
                    style={{
                        top: position.top,
                        left: position.left,
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <span className="text-xs font-semibold text-white">語音設定</span>
                        <IconButton
                            icon="✕"
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsOpen(false)}
                        />
                    </div>

                    {/* Speed Control */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>語速</span>
                            <span className="text-white font-mono">{speed}x</span>
                        </div>
                        <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.1"
                            value={speed}
                            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                            className="w-full text-indigo-500"
                        />
                    </div>

                    {/* Emotion Control */}
                    <div className="space-y-2">
                        <label className="block text-xs text-gray-400">情緒</label>
                        <select
                            value={emotion}
                            onChange={(e) => onEmotionChange(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                            {EMOTIONS.map(e => (
                                <option key={e.value} value={e.value}>{e.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-white/10" />

                    {/* Regenerate Button */}
                    <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                            onRegenerate();
                            setIsOpen(false);
                        }}
                        disabled={isRegenerating}
                    >
                        {isRegenerating ? (
                            <><Spinner size="sm" /> 生成中...</>
                        ) : (
                            '🔄 重新生成語音'
                        )}
                    </Button>
                </div>,
                document.body
            )}
        </>
    );
}
