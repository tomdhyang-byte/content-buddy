'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
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
    const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const animationFrameRef = useRef<number>();

    // Sync currentSegmentIndex with currentTime
    useEffect(() => {
        let accumulatedTime = 0;
        let foundIndex = -1;

        for (let i = 0; i < segments.length; i++) {
            const duration = segments[i].duration;
            if (currentTime >= accumulatedTime && currentTime < accumulatedTime + duration) {
                foundIndex = i;
                break;
            }
            accumulatedTime += duration;
        }

        // Handle end case (currentTime >= totalDuration), select last segment
        if (foundIndex === -1 && segments.length > 0) {
            foundIndex = segments.length - 1;
        }

        if (foundIndex !== -1 && foundIndex !== currentSegmentIndex) {
            setCurrentSegmentIndex(foundIndex);
        }
    }, [currentTime, segments, currentSegmentIndex]);

    // Get current segment
    const currentSegment = segments[currentSegmentIndex];

    // Check if all segments are ready
    const allReady = segments.every(
        (seg) => seg.assets.imageStatus === 'success' && seg.assets.audioStatus === 'success'
    );

    // Update current image when segment changes
    useEffect(() => {
        if (currentSegment?.assets.imageUrl) {
            setCurrentImage(currentSegment.assets.imageUrl);
        }
    }, [currentSegment]);

    // Handle play/pause
    useEffect(() => {
        if (!audioRef.current || !currentSegment) return;

        if (isPlaying) {
            // Set audio source for current segment
            if (currentSegment.assets.audioUrl) {
                audioRef.current.src = currentSegment.assets.audioUrl;
                audioRef.current.play().catch(console.error);
            }
        } else {
            audioRef.current.pause();
        }
    }, [isPlaying, currentSegment]);

    // Time tracking
    useEffect(() => {
        if (!isPlaying) {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            return;
        }

        const updateTime = () => {
            if (!audioRef.current) return;

            // Calculate global time
            const segmentStartTime = segments
                .slice(0, currentSegmentIndex)
                .reduce((sum, seg) => sum + seg.duration, 0);
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
    }, [isPlaying, currentSegmentIndex, segments, onTimeUpdate]);

    // Handle audio end - move to next segment
    const handleAudioEnd = useCallback(() => {
        if (currentSegmentIndex < segments.length - 1) {
            setCurrentSegmentIndex(currentSegmentIndex + 1);
        } else {
            // All segments played
            onPlayStateChange(false);
            onPlayComplete();
            setCurrentSegmentIndex(0);
        }
    }, [currentSegmentIndex, segments.length, onPlayStateChange, onPlayComplete]);

    // Auto-play next segment
    useEffect(() => {
        if (!isPlaying || !audioRef.current) return;

        const audio = audioRef.current;
        audio.addEventListener('ended', handleAudioEnd);

        return () => {
            audio.removeEventListener('ended', handleAudioEnd);
        };
    }, [isPlaying, handleAudioEnd]);

    // Play next segment after index changes
    useEffect(() => {
        if (isPlaying && currentSegment?.assets.audioUrl && audioRef.current) {
            audioRef.current.src = currentSegment.assets.audioUrl;
            audioRef.current.play().catch(console.error);
        }
    }, [currentSegmentIndex, isPlaying, currentSegment]);

    const handlePlayPause = () => {
        if (!allReady) return;
        onPlayStateChange(!isPlaying);
    };

    const handleReset = () => {
        onPlayStateChange(false);
        setCurrentSegmentIndex(0);
        onTimeUpdate(0);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    return (
        <div className="bg-gray-900/50 rounded-xl border border-white/10 overflow-hidden">
            {/* Video Preview Area */}
            <div className="aspect-video bg-black relative flex items-center justify-center">
                {currentImage ? (
                    <img
                        src={currentImage}
                        alt="Preview"
                        className="w-full h-full object-contain"
                    />
                ) : (
                    <div className="text-gray-500 text-center">
                        <div className="text-4xl mb-2">🎬</div>
                        <p>生成素材後可預覽</p>
                    </div>
                )}

                {/* Segment indicator */}
                {isPlaying && (
                    <div className="absolute top-4 left-4 bg-black/70 px-3 py-1 rounded-full text-white text-sm">
                        段落 {currentSegmentIndex + 1} / {segments.length}
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="p-4 flex items-center justify-center gap-4">
                <div className="w-10 h-10" /> {/* Spacer for balance */}

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

                <div className="w-10 h-10" /> {/* Spacer for balance */}
            </div>

            {/* Hidden audio element */}
            <audio ref={audioRef} className="hidden" />
        </div>
    );
}
