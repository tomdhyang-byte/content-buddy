'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Segment } from '@/types';
import { Button } from '@/components/ui';

interface SegmentCardProps {
    segment: Segment;
    index: number;
    isLast: boolean;
    onTextChange: (text: string) => void;
    onMerge: () => void;
    onSplit: (splitIndex: number) => void;
}

export function SegmentCard({
    segment,
    index,
    isLast,
    onTextChange,
    onMerge,
    onSplit,
}: SegmentCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(segment.text);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Sync with prop changes
    useEffect(() => {
        setEditText(segment.text);
    }, [segment.text]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [editText, isEditing]);

    const handleSave = () => {
        onTextChange(editText.trim());
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditText(segment.text);
        setIsEditing(false);
    };

    const handleSplitAtCursor = () => {
        if (textareaRef.current) {
            const cursorPos = textareaRef.current.selectionStart;
            if (cursorPos > 0 && cursorPos < editText.length) {
                onTextChange(editText); // Save current edit first
                onSplit(cursorPos);
                setIsEditing(false);
            }
        }
    };

    // Calculate word count
    const wordCount = editText.length;
    const estimatedDuration = Math.ceil(wordCount / 5); // ~5 chars per second for Chinese

    return (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden transition-all hover:border-white/20">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 bg-white/5 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                        {index + 1}
                    </span>
                    <span className="text-gray-400 text-sm">
                        {wordCount} 字 · 約 {estimatedDuration} 秒
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {!isLast && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onMerge}
                            title="與下一段合併"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                            合併
                        </Button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {isEditing ? (
                    <div className="space-y-4">
                        <textarea
                            ref={textareaRef}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none min-h-[120px]"
                            autoFocus
                        />
                        <div className="flex items-center justify-between">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSplitAtCursor}
                                title="在游標位置拆分"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                在游標處拆分
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={handleCancel}>
                                    取消
                                </Button>
                                <Button variant="primary" size="sm" onClick={handleSave}>
                                    儲存
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div
                        onClick={() => setIsEditing(true)}
                        className="text-gray-300 leading-relaxed cursor-pointer hover:text-white transition-colors whitespace-pre-wrap"
                    >
                        {segment.text}
                        <span className="ml-2 text-gray-500 text-sm">(點擊編輯)</span>
                    </div>
                )}
            </div>
        </div>
    );
}
