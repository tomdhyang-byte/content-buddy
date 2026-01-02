'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { Spinner } from './Spinner';
import { IconButton } from './IconButton';

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
    { value: 'happy', label: '😄以此 開心' },
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
    const popoverRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative" ref={popoverRef}>
            <IconButton
                icon="⚙️"
                onClick={() => setIsOpen(!isOpen)}
                className="p-1.5"
                title="語音設定"
            />

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-gray-900 border border-white/10 rounded-xl shadow-2xl z-50 p-4 space-y-4">
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
                </div>
            )}
        </div>
    );
}
