'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Segment, SegmentAssets } from '@/types';
import { LAYOUT_CONSTANTS } from '@/config/constants';

export interface TimelineSegment extends Segment {
    startTime: number;
    duration: number;
    assets: SegmentAssets;
}

export function calculateTimelineSegments(
    segments: Segment[],
    generatedAssets: Map<string, SegmentAssets>
): TimelineSegment[] {
    let currentTime = 0;

    return segments.map((segment) => {
        const assets = generatedAssets.get(segment.id) || {
            imagePrompt: null,
            promptStatus: 'idle' as const,
            imageUrl: null,
            imageStatus: 'idle' as const,
            audioUrl: null,
            audioStatus: 'idle' as const,
        };

        // Duration based on audio if available, otherwise default
        const duration = assets.audioDuration || LAYOUT_CONSTANTS.DEFAULT_SEGMENT_DURATION;

        const timelineSegment: TimelineSegment = {
            ...segment,
            startTime: currentTime,
            duration,
            assets,
        };

        currentTime += duration;
        return timelineSegment;
    });
}

interface TimelineContainerProps {
    segments: Segment[];
    generatedAssets: Map<string, SegmentAssets>;
    selectedSegmentId: string | null;
    onSelectSegment: (id: string) => void;
    isPlaying: boolean;
    currentPlayTime: number;
    onSeek?: (time: number) => void;
}

export function TimelineContainer({
    segments,
    generatedAssets,
    selectedSegmentId,
    onSelectSegment,
    isPlaying,
    currentPlayTime,
    onSeek,
}: TimelineContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);

    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

    // Performance optimization: Memoize timeline calculation
    const timelineSegments = useMemo(
        () => calculateTimelineSegments(segments, generatedAssets),
        [segments, generatedAssets]
    );

    // Calculate total duration
    const totalDuration = timelineSegments.reduce((sum, seg) => sum + seg.duration, 0);
    const totalWidth = totalDuration * LAYOUT_CONSTANTS.PIXELS_PER_SECOND;

    // Reset auto-scroll when play starts
    useEffect(() => {
        if (isPlaying) {
            setAutoScrollEnabled(true);
        }
    }, [isPlaying]);

    // Handle manual scroll detection
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;

        // Sync header scroll
        if (headerRef.current) {
            headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    };



    // Handle seek logic (common for header and tracks)
    const handleSeek = (timeOrEvent: React.MouseEvent<HTMLDivElement> | number) => {
        if (!onSeek) return;

        let newTime: number;

        if (typeof timeOrEvent === 'number') {
            newTime = timeOrEvent;
        } else {
            // Mouse Event
            const e = timeOrEvent;
            // Find the scrolling container to calculate relative X
            if (!containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const scrollLeft = containerRef.current.scrollLeft;

            // Calculate relative X within the scrolling content
            // e.clientX is viewport x
            // rect.left is container viewport x
            const relativeX = e.clientX - rect.left;

            // Absolute X in the timeline = scrollLeft + relativeX
            const clickX = scrollLeft + relativeX;

            newTime = Math.max(0, Math.min(totalDuration, clickX / LAYOUT_CONSTANTS.PIXELS_PER_SECOND));

            // Also update selection based on this time
            const segment = timelineSegments.find(
                seg => newTime >= seg.startTime && newTime < (seg.startTime + seg.duration)
            );
            if (segment) {
                onSelectSegment(segment.id);
            }
        }

        onSeek(newTime);
    };

    // Auto-scroll to follow playhead
    useEffect(() => {
        if (isPlaying && autoScrollEnabled && containerRef.current) {
            const playheadPosition = currentPlayTime * LAYOUT_CONSTANTS.PIXELS_PER_SECOND;
            const containerWidth = containerRef.current.clientWidth;
            const scrollLeft = containerRef.current.scrollLeft;

            // Scroll if playhead is near the edge (keep it in view)
            if (playheadPosition > scrollLeft + containerWidth - 100) {
                containerRef.current.scrollTo({
                    left: playheadPosition - 100,
                    behavior: 'smooth',
                });
            } else if (playheadPosition < scrollLeft) {
                // If playhead jumps back (looping or seeking), scroll back
                containerRef.current.scrollTo({
                    left: playheadPosition - 20,
                    behavior: 'smooth',
                });
            }
        }
    }, [currentPlayTime, isPlaying, autoScrollEnabled]);

    return (
        <div className="bg-gray-900/50 rounded-xl border border-white/10 h-full flex flex-col relative group">
            {/* Resume Auto-Scroll Button (Floating) */}
            {!autoScrollEnabled && isPlaying && (
                <button
                    onClick={() => {
                        // Instantly jump to current playhead
                        if (containerRef.current) {
                            const playheadPosition = currentPlayTime * LAYOUT_CONSTANTS.PIXELS_PER_SECOND;
                            containerRef.current.scrollTo({
                                left: playheadPosition - 100,
                                behavior: 'auto', // Instant jump
                            });
                        }
                        setAutoScrollEnabled(true);
                    }}
                    className="absolute bottom-4 right-4 z-20 bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 hover:bg-indigo-700 transition-colors animate-in fade-in"
                >
                    📍 回到播放點
                </button>
            )}

            {/* Track Labels */}
            <div className="flex border-b border-white/10">
                <div className="w-20 flex-shrink-0 bg-gray-800/50 p-2 text-xs text-gray-400 font-medium z-20 relative">
                    軌道
                </div>
                <div
                    ref={headerRef}
                    onClick={handleSeek}
                    className="flex-1 overflow-hidden relative cursor-pointer hover:bg-white/5 transition-colors"
                    title="點擊以跳轉時間"
                >
                    {/* Time ruler placeholder */}
                    <div
                        className="h-8 bg-gray-800/30 flex items-center px-2 text-xs text-gray-500 pointer-events-none"
                        style={{ width: `${totalWidth}px`, minWidth: '100%' }}
                    >
                        {Array.from({ length: Math.ceil(totalDuration / 5) + 1 }).map((_, i) => (
                            <span
                                key={i}
                                className="absolute border-l border-white/20 pl-1 h-3 flex items-center"
                                style={{ left: `${(i * 5 * LAYOUT_CONSTANTS.PIXELS_PER_SECOND)}px` }}
                            >
                                {i * 5}s
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tracks Container */}
            <div className="flex relative flex-1 min-h-0">
                {/* Track Labels Column */}
                <div className="w-20 flex-shrink-0 bg-gray-800/50 z-20 relative h-full">
                    <div className="h-16 flex items-center justify-center text-xs text-gray-400 border-b border-white/5">
                        🖼️ 圖片
                    </div>
                    <div className="h-12 flex items-center justify-center text-xs text-gray-400 border-b border-white/5">
                        📝 文字
                    </div>
                    <div className="h-16 flex items-center justify-center text-xs text-gray-400">
                        🔊 語音
                    </div>
                </div>

                {/* Scrollable Timeline */}
                <div
                    ref={containerRef}
                    className="flex-1 overflow-x-auto relative h-full"
                    style={{ minWidth: 0 }}
                    onScroll={handleScroll}
                    onWheel={() => {
                        if (isPlaying) setAutoScrollEnabled(false);
                    }}
                    onTouchMove={() => {
                        if (isPlaying) setAutoScrollEnabled(false);
                    }}
                    onMouseDown={(e) => {
                        if (isPlaying) setAutoScrollEnabled(false);
                        // Only handle clicks directly on the container background or gaps
                        // The track items will stopPropagation if needed, OR we just let it all bubble
                        // Actually, we want clicking segments to ALSO seek.
                        handleSeek(e);
                    }}
                >
                    <div style={{ width: `${totalWidth}px`, minWidth: '100%' }} className="cursor-pointer relative min-h-full">
                        {/* Playhead with Handle - MOVED to top level of tracks container to overlay everything */}
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 pointer-events-none"
                            style={{
                                left: `${currentPlayTime * LAYOUT_CONSTANTS.PIXELS_PER_SECOND}px`,
                                transition: 'left 0.1s linear',
                                height: '100%'
                            }}
                        >
                            {/* Handle (Circle) - Visual Indicator Only */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 flex items-center justify-center pointer-events-none">
                                <div className="w-4 h-4 bg-red-500 rounded-full shadow-md border-2 border-white ring-1 ring-black/20" />
                            </div>

                            {/* Line Body DOT */}
                            <div className="w-2.5 h-2.5 bg-red-500 rounded-full -ml-[4px] mt-0 hidden" />
                        </div>

                        {/* Image Track */}
                        <div className="h-16 flex border-b border-white/5 relative z-10">
                            {timelineSegments.map((seg) => (
                                <div
                                    key={`img-${seg.id}`}
                                    onClick={(e) => {
                                        // e.stopPropagation(); // We want to allow seek!
                                        // onSelectSegment(seg.id); // handleSeek will handle selection too!
                                    }}
                                    className={`h-full flex items-center justify-center transition-all border-r border-white/10 pointer-events-none ${selectedSegmentId === seg.id
                                        ? 'ring-2 ring-indigo-500 ring-inset'
                                        : 'hover:bg-white/5'
                                        } ${seg.assets.imageStatus === 'success'
                                            ? 'bg-green-500/20'
                                            : seg.assets.imageStatus === 'loading'
                                                ? 'bg-yellow-500/20'
                                                : seg.assets.imageStatus === 'error'
                                                    ? 'bg-red-500/20'
                                                    : 'bg-gray-700/30'
                                        }`}
                                    style={{ width: `${seg.duration * LAYOUT_CONSTANTS.PIXELS_PER_SECOND}px` }}
                                >
                                    {seg.assets.imageUrl ? (
                                        <img
                                            src={seg.assets.imageUrl}
                                            alt=""
                                            className="h-12 w-auto rounded object-cover"
                                        />
                                    ) : seg.assets.imageStatus === 'loading' ? (
                                        <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <span className="text-gray-500 text-xs">無圖</span>
                                    )}
                                </div>
                            ))}

                        </div>

                        {/* Text Track */}
                        <div className="h-12 flex border-b border-white/5">
                            {timelineSegments.map((seg) => (
                                <div
                                    key={`txt-${seg.id}`}
                                    onClick={() => onSelectSegment(seg.id)}
                                    className={`h-full flex items-center px-2 cursor-pointer transition-all border-r border-white/10 overflow-hidden ${selectedSegmentId === seg.id
                                        ? 'ring-2 ring-indigo-500 ring-inset bg-indigo-500/10'
                                        : 'hover:bg-white/5 bg-gray-700/20'
                                        }`}
                                    style={{ width: `${seg.duration * LAYOUT_CONSTANTS.PIXELS_PER_SECOND}px` }}
                                >
                                    <span className="text-gray-300 text-xs truncate">
                                        {seg.text.slice(0, 20)}...
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Audio Track */}
                        <div className="h-16 flex">
                            {timelineSegments.map((seg) => (
                                <div
                                    key={`aud-${seg.id}`}
                                    onClick={() => onSelectSegment(seg.id)}
                                    className={`h-full flex items-center justify-center cursor-pointer transition-all border-r border-white/10 ${selectedSegmentId === seg.id
                                        ? 'ring-2 ring-indigo-500 ring-inset'
                                        : 'hover:bg-white/5'
                                        } ${seg.assets.audioStatus === 'success'
                                            ? 'bg-purple-500/20'
                                            : seg.assets.audioStatus === 'loading'
                                                ? 'bg-yellow-500/20'
                                                : seg.assets.audioStatus === 'error'
                                                    ? 'bg-red-500/20'
                                                    : 'bg-gray-700/30'
                                        }`}
                                    style={{ width: `${seg.duration * LAYOUT_CONSTANTS.PIXELS_PER_SECOND}px` }}
                                >
                                    {seg.assets.audioStatus === 'success' ? (
                                        <div className="flex items-center gap-1">
                                            {/* Waveform visualization */}
                                            {[3, 5, 7, 5, 8, 6, 4, 7, 5, 3].map((h, i) => (
                                                <div
                                                    key={i}
                                                    className="w-1 bg-purple-400 rounded-full"
                                                    style={{ height: `${h * 2}px` }}
                                                />
                                            ))}
                                        </div>
                                    ) : seg.assets.audioStatus === 'loading' ? (
                                        <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <span className="text-gray-500 text-xs">無音</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
