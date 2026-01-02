'use client';

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { TimelineSegment } from './TimelineContainer';
import { IconButton, Button } from '@/components/ui';

interface PreviewPlayerProps {
    segments: TimelineSegment[];
    isPlaying: boolean;
    currentTime: number;
    onPlayStateChange: (playing: boolean) => void;
    onTimeUpdate: (time: number) => void;
    onPlayComplete: () => void;
    onBatchGenerate: () => void;
    isBatchGenerating: boolean;
    onSegmentChange?: (segmentId: string) => void;
    playbackRate: number;
}

export function PreviewPlayer({
    segments,
    isPlaying,
    currentTime,
    onPlayStateChange,
    onTimeUpdate,
    onPlayComplete,
    onBatchGenerate,
    isBatchGenerating,
    onSegmentChange,
    playbackRate,
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

            // Apply playback rate
            audio.playbackRate = playbackRate;

            // Notify parent about segment change for UI sync
            if (onSegmentChange && currentSegment) {
                onSegmentChange(currentSegment.id);
            }
        }
    }, [currentSegmentIndex, currentSegment, isPlaying, onSegmentChange, playbackRate]);

    // Handle playback rate changes
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

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

    const [waitingForNextSegment, setWaitingForNextSegment] = React.useState(false);

    // Derived: Current segment is ready if assets exist
    const currentReady = currentSegment?.assets.imageStatus === 'success' && currentSegment?.assets.audioStatus === 'success';

    // Handle audio end - notify parent to advance or wait
    const handleAudioEnd = useCallback(() => {
        if (currentSegmentIndex < segments.length - 1) {
            const nextSegment = segments[currentSegmentIndex + 1];
            const nextReady = nextSegment.assets.imageStatus === 'success' && nextSegment.assets.audioStatus === 'success';

            if (nextReady) {
                // Next segment is ready, advance immediately
                const nextStartTime = segments
                    .slice(0, currentSegmentIndex + 1)
                    .reduce((sum, seg) => sum + seg.duration, 0);
                onTimeUpdate(nextStartTime);
            } else {
                // Next segment not ready, enter wait state
                setWaitingForNextSegment(true);
                onPlayStateChange(false);
            }
        } else {
            // All segments finished
            onPlayStateChange(false);
            onPlayComplete();
            onTimeUpdate(0);
        }
    }, [currentSegmentIndex, segments, onTimeUpdate, onPlayStateChange, onPlayComplete]);

    // Effect: Watch for next segment becoming ready while waiting
    useEffect(() => {
        if (!waitingForNextSegment) return;

        const nextSegment = segments[currentSegmentIndex + 1];
        if (!nextSegment) return;

        const nextReady = nextSegment.assets.imageStatus === 'success' && nextSegment.assets.audioStatus === 'success';

        if (nextReady) {
            // Next segment is now ready! Resume playback.
            setWaitingForNextSegment(false);
            const nextStartTime = segments
                .slice(0, currentSegmentIndex + 1)
                .reduce((sum, seg) => sum + seg.duration, 0);
            onTimeUpdate(nextStartTime);
            onPlayStateChange(true);
        }
    }, [waitingForNextSegment, segments, currentSegmentIndex, onTimeUpdate, onPlayStateChange]);


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
        // Can play if current segment is ready (don't need allReady anymore)
        if (!currentReady) return;
        onPlayStateChange(!isPlaying);
    };

    const completedCount = segments.filter(s => s.assets.imageStatus === 'success' && s.assets.audioStatus === 'success').length;

    return (
        <div className="bg-gray-900/50 rounded-xl border border-white/10 overflow-hidden flex flex-col w-full h-full">
            {/* Video Preview Area */}
            <div className="flex-1 min-h-0 bg-black relative flex items-center justify-center overflow-hidden">
                {currentImage ? (
                    <img
                        src={currentImage}
                        alt="Preview"
                        className={`max-w-full max-h-full object-contain ${waitingForNextSegment ? 'opacity-50' : ''}`}
                    />
                ) : (
                    <div className="text-gray-500 text-center p-4">
                        <div className="text-4xl mb-2">🎬</div>
                        <p>生成素材後可預覽 {completedCount} / {segments.length}</p>
                    </div>
                )}

                {/* Waiting State Overlay */}
                {waitingForNextSegment && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className="text-white font-medium bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm">
                            等待下一段生成...
                        </p>
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

                {(currentReady || isPlaying || waitingForNextSegment) ? (
                    <IconButton
                        icon={
                            isPlaying ? (
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6 ml-1 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            )
                        }
                        onClick={handlePlayPause}
                        variant="primary"
                        className={`w-14 h-14 rounded-full group ${!currentReady ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={isPlaying ? '暫停' : '播放'}
                    />
                ) : (
                    <Button
                        onClick={onBatchGenerate}
                        disabled={isBatchGenerating}
                        variant={isBatchGenerating ? 'secondary' : 'primary'}
                        size="lg"
                        className={`h-14 rounded-full min-w-[200px] shadow-lg ${isBatchGenerating ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 transition-transform'}`}
                    >
                        {isBatchGenerating ? (
                            <>
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm font-medium">生成中... ({completedCount}/{segments.length})</span>
                            </>
                        ) : (
                            <>
                                <span className="text-lg">⚡</span>
                                <span className="text-sm font-medium">一鍵生成全部素材 ({completedCount}/{segments.length})</span>
                            </>
                        )}
                    </Button>
                )}

                <div className="w-10 h-10" />
            </div>

            {/* Hidden audio element */}
            <audio ref={audioRef} className="hidden" />
        </div>
    );
}
