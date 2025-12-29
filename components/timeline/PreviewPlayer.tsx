'use client';

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { TimelineSegment } from './TimelineContainer';

interface PreviewPlayerProps {
    segments: TimelineSegment[];
    isPlaying: boolean;
    currentTime: number;
    onPlayStateChange: (playing: boolean) => void;
    onTimeUpdate: (time: number) => void;
    onPlayComplete: () => void;
}

export function PreviewPlayer({
    segments,
    isPlaying,
    currentTime,
    onPlayStateChange,
    onTimeUpdate,
    onPlayComplete,
}: PreviewPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastSegmentIndexRef = useRef<number>(-1);

    // Check if all segments are ready
    const allReady = segments.every(
        (seg) => seg.assets.imageStatus === 'success' && seg.assets.audioStatus === 'success'
    );

    // Derive current segment index from currentTime (Single Source of Truth)
    const { currentSegmentIndex, segmentStartTime, currentSegment } = useMemo(() => {
        let accumulatedTime = 0;
        for (let i = 0; i < segments.length; i++) {
            const duration = segments[i].duration;
            if (currentTime >= accumulatedTime && currentTime < accumulatedTime + duration) {
                return {
                    currentSegmentIndex: i,
                    segmentStartTime: accumulatedTime,
                    currentSegment: segments[i],
                };
            }
            accumulatedTime += duration;
        }
        // Fallback to last segment if time exceeds total
        if (segments.length > 0) {
            const lastIndex = segments.length - 1;
            const lastStart = segments.slice(0, lastIndex).reduce((sum, s) => sum + s.duration, 0);
            return {
                currentSegmentIndex: lastIndex,
                segmentStartTime: lastStart,
                currentSegment: segments[lastIndex],
            };
        }
        return { currentSegmentIndex: 0, segmentStartTime: 0, currentSegment: undefined };
    }, [currentTime, segments]);

    // Derive current image
    const currentImage = currentSegment?.assets.imageUrl || null;

    // Handle segment change: Reset and load new audio
    useEffect(() => {
        if (!audioRef.current || !currentSegment?.assets.audioUrl) return;

        // Only reset audio if segment actually changed
        if (lastSegmentIndexRef.current !== currentSegmentIndex) {
            lastSegmentIndexRef.current = currentSegmentIndex;

            const audio = audioRef.current;
            audio.pause();
            audio.src = currentSegment.assets.audioUrl;
            audio.currentTime = 0;

            if (isPlaying) {
                audio.play().catch(console.error);
            }
        }
    }, [currentSegmentIndex, currentSegment, isPlaying]);

    // Handle play/pause state changes
    useEffect(() => {
        if (!audioRef.current) return;

        if (isPlaying) {
            if (audioRef.current.paused && audioRef.current.src) {
                audioRef.current.play().catch(console.error);
            }
        } else {
            audioRef.current.pause();
        }
    }, [isPlaying]);

    // Time tracking loop (only while playing)
    useEffect(() => {
        if (!isPlaying) {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            return;
        }

        const updateTime = () => {
            if (!audioRef.current || audioRef.current.ended || audioRef.current.paused) {
                animationFrameRef.current = requestAnimationFrame(updateTime);
                return;
            }

            const globalTime = segmentStartTime + audioRef.current.currentTime;
            onTimeUpdate(globalTime);
            animationFrameRef.current = requestAnimationFrame(updateTime);
        };

        animationFrameRef.current = requestAnimationFrame(updateTime);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isPlaying, segmentStartTime, onTimeUpdate]);

    // Handle audio end - notify parent to advance
    const handleAudioEnd = useCallback(() => {
        if (currentSegmentIndex < segments.length - 1) {
            // Calculate next segment start time
            const nextStartTime = segments
                .slice(0, currentSegmentIndex + 1)
                .reduce((sum, seg) => sum + seg.duration, 0);
            onTimeUpdate(nextStartTime);
        } else {
            // All segments finished
            onPlayStateChange(false);
            onPlayComplete();
            onTimeUpdate(0);
        }
    }, [currentSegmentIndex, segments, onTimeUpdate, onPlayStateChange, onPlayComplete]);

    // Attach audio end listener
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.addEventListener('ended', handleAudioEnd);
        return () => {
            audio.removeEventListener('ended', handleAudioEnd);
        };
    }, [handleAudioEnd]);

    const handlePlayPause = () => {
        if (!allReady) return;
        onPlayStateChange(!isPlaying);
    };

    return (
        <div className="bg-gray-900/50 rounded-xl border border-white/10 overflow-hidden flex flex-col w-full h-full">
            {/* Video Preview Area */}
            <div className="flex-1 min-h-0 bg-black relative flex items-center justify-center overflow-hidden">
                {currentImage ? (
                    <img
                        src={currentImage}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain"
                    />
                ) : (
                    <div className="text-gray-500 text-center p-4">
                        <div className="text-4xl mb-2">🎬</div>
                        <p>生成素材後可預覽</p>
                    </div>
                )}

                {/* Segment indicator */}
                {isPlaying && (
                    <div className="absolute top-4 left-4 bg-black/70 px-3 py-1 rounded-full text-white text-sm z-10">
                        段落 {currentSegmentIndex + 1} / {segments.length}
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="p-4 flex-shrink-0 flex items-center justify-center gap-4 bg-gray-900/30 backdrop-blur-sm border-t border-white/5">
                <div className="w-10 h-10" />

                {allReady ? (
                    <button
                        onClick={handlePlayPause}
                        className="w-14 h-14 rounded-full flex items-center justify-center text-white transition-all bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg group"
                        title={isPlaying ? '暫停' : '播放'}
                    >
                        {isPlaying ? (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6 ml-1 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        )}
                    </button>
                ) : (
                    <div className="h-14 px-5 rounded-full bg-gray-800 border border-white/10 flex flex-col items-center justify-center min-w-[140px] cursor-not-allowed opacity-80">
                        <span className="text-xs text-gray-400 mb-0.5">⏳ 等待生成</span>
                        <span className="text-sm font-mono text-white font-medium">
                            {segments.filter(s => s.assets.imageStatus === 'success' && s.assets.audioStatus === 'success').length} / {segments.length}
                        </span>
                    </div>
                )}

                <div className="w-10 h-10" />
            </div>

            {/* Hidden audio element */}
            <audio ref={audioRef} className="hidden" />
        </div>
    );
}
