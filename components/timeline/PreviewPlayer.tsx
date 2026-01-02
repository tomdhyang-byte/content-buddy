'use client';

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { flushSync } from 'react-dom';
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

    const lastAudioUrlRef = useRef<string | null>(null);

    // Handle segment change: Reset and load new audio
    useEffect(() => {
        console.log('[PreviewPlayer] Segment Change Effect', {
            currentSegmentIndex,
            lastSegmentIndex: lastSegmentIndexRef.current,
            audioUrl: currentSegment?.assets.audioUrl?.slice(-30),
            lastAudioUrl: lastAudioUrlRef.current?.slice(-30),
            isPlaying
        });

        if (!audioRef.current || !currentSegment?.assets.audioUrl) return;

        const currentAudioUrl = currentSegment.assets.audioUrl;

        // Only reset audio if segment actually changed OR audio URL changed (regeneration)
        const hasSegmentChanged = lastSegmentIndexRef.current !== currentSegmentIndex;
        const hasUrlChanged = lastAudioUrlRef.current !== currentAudioUrl;

        if (hasSegmentChanged || hasUrlChanged) {
            console.log('[PreviewPlayer] Switching audio source', { hasSegmentChanged, hasUrlChanged });

            // Update refs
            lastSegmentIndexRef.current = currentSegmentIndex;
            lastAudioUrlRef.current = currentAudioUrl;

            const audio = audioRef.current;

            // If only URL changed (regeneration) and we are playing same segment, 
            // we want to maintain playback state but load new source.
            // If segment changed, we fundamentally switch.

            const wasPlaying = !audio.paused;

            audio.pause();
            audio.src = currentAudioUrl;
            audio.currentTime = 0;

            // Should we auto-play?
            // 1. If isPlaying is true globally
            // 2. BUT if this is a background update (not user seeking), interrupts might be jarring?
            // User requested: "If I regenerate, auto-jump and play". That logic is handled in ReviewPage (handleGenerateAudio).
            // Here we just ensure we respond to the prop change.

            if (isPlaying) {
                console.log('[PreviewPlayer] Auto-playing new segment audio');
                audio.play().catch((e) => {
                    // AbortError is expected if pause() is called before play() completes
                    if (e.name !== 'AbortError') {
                        console.error('Audio play error:', e);
                    }
                });
            }

            // Apply playback rate
            audio.playbackRate = playbackRate;

            // Notify parent about segment change for UI sync
            if (onSegmentChange && currentSegment && hasSegmentChanged) {
                onSegmentChange(currentSegment.id);
            }
        }
    }, [currentSegmentIndex, currentSegment, isPlaying, onSegmentChange, playbackRate]);

    // Sync audio time with global time (handle seeking)
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentSegment?.assets.audioUrl) return;

        // Calculate local time for this segment
        // If currentTime < segmentStartTime (shouldn't happen with correct index), clamp to 0
        const localTime = Math.max(0, currentTime - segmentStartTime);

        // Check if we need to seek (diff > 0.5s)
        if (Math.abs(audio.currentTime - localTime) > 0.5) {
            audio.currentTime = localTime;
        }
    }, [currentTime, segmentStartTime, currentSegment]);

    // Sync audio time with global time (handle seeking)
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentSegment?.assets.audioUrl) return;

        // Calculate local time for this segment
        // If currentTime < segmentStartTime (shouldn't happen with correct index), clamp to 0
        const localTime = Math.max(0, currentTime - segmentStartTime);

        // Check if we need to seek (diff > 0.5s)
        if (Math.abs(audio.currentTime - localTime) > 0.5) {
            audio.currentTime = localTime;
        }
    }, [currentTime, segmentStartTime, currentSegment]);

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
                audioRef.current.play().catch((e) => {
                    if (e.name !== 'AbortError') {
                        console.error('Audio play error:', e);
                    }
                });
            }
        } else {
            audioRef.current.pause();
        }
    }, [isPlaying]);

    // Time tracking loop (only while playing)
    useEffect(() => {
        let isCancelled = false;

        if (!isPlaying) {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            return;
        }

        const updateTime = () => {
            if (isCancelled) return;

            if (!audioRef.current || audioRef.current.ended || audioRef.current.paused) {
                animationFrameRef.current = requestAnimationFrame(updateTime);
                return;
            }

            const globalTime = segmentStartTime + audioRef.current.currentTime;
            // Use flushSync to force React to render synchronously
            // Note: flushSync triggers re-render/cleanup synchronously if parent state updates.
            // We must ensure we don't schedule a new rAF if this effect is cleaned up during flushSync.
            flushSync(() => {
                onTimeUpdate(globalTime);
            });

            if (!isCancelled) {
                animationFrameRef.current = requestAnimationFrame(updateTime);
            }
        };

        animationFrameRef.current = requestAnimationFrame(updateTime);

        return () => {
            isCancelled = true;
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isPlaying, segmentStartTime, onTimeUpdate]);

    const [waitingForNextSegment, setWaitingForNextSegment] = React.useState(false);

    // Derived: Current segment is ready if assets exist (Relaxed to Audio only for playback continuity)
    const currentReady = currentSegment?.assets.audioStatus === 'success';

    // Track currentTime in ref to access inside stable callback without re-binding
    const currentTimeRef = useRef(currentTime);
    useEffect(() => {
        currentTimeRef.current = currentTime;
    }, [currentTime]);

    // Track last auto-advance time to prevent double-handling 'ended' events
    const lastAdvanceTimeRef = useRef(0);

    // Handle audio end - notify parent to advance or wait
    const handleAudioEnd = useCallback(() => {
        const now = Date.now();
        // Ignore 'ended' events if we just advanced (debounce 500ms)
        if (now - lastAdvanceTimeRef.current < 500) {
            console.log('[PreviewPlayer] Ignoring ended event due to recent advance');
            return;
        }

        console.log('[PreviewPlayer] Audio ended', {
            currentSegmentIndex,
            totalSegments: segments.length,
            isPlaying,
            currentTime: currentTimeRef.current,
            segmentStartTime
        });

        let finishedSegmentIndex = currentSegmentIndex;

        // Drift detection:
        // If the 'ended' event fires but we have already advanced to the start of the Next segment
        // (due to audio duration being slightly longer than metadata duration),
        // we should attribute this event to the Previous segment.
        const timeInCurrentSegment = currentTimeRef.current - segmentStartTime;
        if (timeInCurrentSegment < 0.5 && currentSegmentIndex > 0) {
            console.log('[PreviewPlayer] Drift detected: attributing ended event to previous segment');
            finishedSegmentIndex = currentSegmentIndex - 1;
        }

        if (finishedSegmentIndex < segments.length - 1) {
            const nextSegmentIndex = finishedSegmentIndex + 1;
            const nextSegment = segments[nextSegmentIndex];
            // Relaxed check: Only need Audio to advance
            const nextReady = nextSegment.assets.audioStatus === 'success';

            console.log('[PreviewPlayer] Checking next segment readiness:', {
                nextSegmentIndex,
                nextSegmentId: nextSegment.id,
                audioStatus: nextSegment.assets.audioStatus,
                isReady: nextReady
            });

            if (nextReady) {
                // Next segment is ready, advance immediately
                // We calculate start time of Next segment.
                // If we drifted, we might already be there, but setting it explicitly ensures alignment.
                // Add tiny epsilon to ensure we land IN the next segment
                const nextStartTime = segments
                    .slice(0, nextSegmentIndex)
                    .reduce((sum, seg) => sum + seg.duration, 0) + 0.01;

                console.log('[PreviewPlayer] Advancing to segment', nextSegmentIndex, 'at', nextStartTime);
                lastAdvanceTimeRef.current = Date.now(); // Mark advance time
                onTimeUpdate(nextStartTime);

                // Ensure we are playing
                if (!isPlaying) onPlayStateChange(true);
            } else {
                // Next segment not ready, enter wait state
                console.log('[PreviewPlayer] Next segment not ready, waiting...');
                setWaitingForNextSegment(true);
                onPlayStateChange(false);
            }
        } else {
            // All segments finished
            console.log('[PreviewPlayer] All segments finished');
            onPlayStateChange(false);
            onPlayComplete();
            onTimeUpdate(0);
        }
    }, [currentSegmentIndex, segments, onTimeUpdate, onPlayStateChange, onPlayComplete, isPlaying, segmentStartTime]);

    // Effect: Watch for next segment becoming ready while waiting
    useEffect(() => {
        if (!waitingForNextSegment) return;

        const nextSegment = segments[currentSegmentIndex + 1];
        if (!nextSegment) return;

        // Relaxed check: Resume as soon as Audio is ready
        const nextReady = nextSegment.assets.audioStatus === 'success';

        if (nextReady) {
            // Next segment is now ready! Resume playback.
            setWaitingForNextSegment(false);
            const nextStartTime = segments
                .slice(0, currentSegmentIndex + 1)
                .reduce((sum, seg) => sum + seg.duration, 0) + 0.01; // Add epsilon
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
        // Allow pause even if not ready
        if (!isPlaying && !currentReady) return;
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
