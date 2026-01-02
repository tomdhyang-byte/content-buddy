'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useProject } from '@/context/ProjectContext';
import { Button, ConfirmModal } from '@/components/ui';
import {
    TimelineContainer,
    ConfigPanel,
    PreviewPlayer,
    calculateTimelineSegments,
} from '@/components/timeline';
import { Segment, SegmentAssets, GeneratePromptResponse, GenerateImageResponse, GenerateAudioResponse, ApiError, PronunciationDictItem } from '@/types';

export default function ReviewPage() {
    const router = useRouter();
    const {
        state,
        updateAssetStatus,
        initializeAssets,
        clearGeneratedAssets,
        setCurrentStep,
        updateSegmentText,
        setPlaybackRate,
    } = useProject();

    const [showBackModal, setShowBackModal] = useState(false);
    const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentPlayTime, setCurrentPlayTime] = useState(0);
    const [isBatchGenerating, setIsBatchGenerating] = useState(false);

    // Redirect if no segments
    useEffect(() => {
        if (state.segments.length === 0) {
            router.push('/');
        } else if (!selectedSegmentId && state.segments.length > 0) {
            // Default select first segment
            setSelectedSegmentId(state.segments[0].id);
        }
    }, [state.segments, router, selectedSegmentId]);

    // Initialize assets on mount (without auto-generating prompts)
    useEffect(() => {
        if (state.segments.length === 0) return;

        // Initialize asset map if empty
        if (state.generatedAssets.size === 0) {
            initializeAssets();
        }
    }, [state.segments, state.generatedAssets.size, initializeAssets]);

    const generatePromptForSegment = async (segmentId: string, text: string): Promise<string | null> => {
        updateAssetStatus(segmentId, 'promptStatus', 'loading');

        try {
            const response = await fetch('/api/generate/prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    segmentId,
                    text,
                    style: state.visualStyle,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate prompt');
            }

            const data: GeneratePromptResponse = await response.json();
            updateAssetStatus(segmentId, 'imagePrompt', data.prompt);
            updateAssetStatus(segmentId, 'promptStatus', 'success');
            return data.prompt;
        } catch (error) {
            updateAssetStatus(segmentId, 'promptStatus', 'error');
            updateAssetStatus(segmentId, 'promptError', error instanceof Error ? error.message : 'Unknown error');
            return null;
        }
    };

    const generateImageForSegment = async (segmentId: string, promptOverride?: string) => {
        const assets = state.generatedAssets.get(segmentId);
        const promptToUse = promptOverride || assets?.imagePrompt;

        if (!promptToUse) return;

        updateAssetStatus(segmentId, 'imageStatus', 'loading');

        try {
            const response = await fetch('/api/generate/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    segmentId,
                    prompt: promptToUse,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate image');
            }

            const data: GenerateImageResponse = await response.json();
            updateAssetStatus(segmentId, 'imageUrl', data.imageUrl);
            updateAssetStatus(segmentId, 'imageStatus', 'success');
        } catch (error) {
            updateAssetStatus(segmentId, 'imageStatus', 'error');
            updateAssetStatus(segmentId, 'imageError', error instanceof Error ? error.message : 'Unknown error');
        }
    };

    const generateAudioForSegment = async (segmentId: string, text: string, pronunciationDictOverride?: PronunciationDictItem[]) => {
        updateAssetStatus(segmentId, 'audioStatus', 'loading');

        // Get current assets for this segment
        const segmentAssets = state.generatedAssets.get(segmentId);

        // Use override if provided, otherwise read from state
        const pronunciationDict = pronunciationDictOverride ?? segmentAssets?.customPronunciations ?? [];

        try {
            const response = await fetch('/api/generate/audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    segmentId,
                    text,
                    voiceId: state.voiceId,
                    pronunciationDict,
                    speed: segmentAssets?.voiceSpeed || 1.2,
                    emotion: segmentAssets?.voiceEmotion || 'neutral',
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate audio');
            }

            const data: GenerateAudioResponse = await response.json();
            updateAssetStatus(segmentId, 'audioUrl', data.audioUrl);
            updateAssetStatus(segmentId, 'audioDuration', data.duration);
            updateAssetStatus(segmentId, 'audioStatus', 'success');

            // Auto-jump logic: Calculate new start time for this segment
            // We need to recalculate timeline based on updated assets to get the correct start time
            // Since state updates are async, we can't rely on `timelineSegments` immediately here.
            // However, we can approximate or use a fire-and-forget effect, OR manually calculate.

            // Better approach: Calculate start time based on current state + this update
            // We can read the *latest* segments from the ref if we had one, but effectively:
            // The segment order doesn't change.
            // We just need to sum durations of all previous segments.

            // Note: `state` in closure might be stale if multiple updates happened, but usually okay for this action.
            const segmentIndex = state.segments.findIndex(s => s.id === segmentId);
            if (segmentIndex !== -1) {
                let startTime = 0;
                for (let i = 0; i < segmentIndex; i++) {
                    const prevSegId = state.segments[i].id;
                    const prevAssets = state.generatedAssets.get(prevSegId);
                    // If playing previous segments, their duration is already known
                    startTime += prevAssets?.audioDuration || 5; // Default 5s matches constant
                }

                // Jump to this start time!
                setCurrentPlayTime(startTime);
                // Auto-play to verify
                setIsPlaying(true);
            }
        } catch (error) {
            updateAssetStatus(segmentId, 'audioStatus', 'error');
            updateAssetStatus(segmentId, 'audioError', error instanceof Error ? error.message : 'Unknown error');
        }
    };

    const handlePromptChange = useCallback((prompt: string) => {
        if (selectedSegmentId) {
            updateAssetStatus(selectedSegmentId, 'imagePrompt', prompt);
        }
    }, [selectedSegmentId, updateAssetStatus]);

    const handleGenerateImage = useCallback(() => {
        if (selectedSegmentId) {
            generateImageForSegment(selectedSegmentId);
        }
    }, [selectedSegmentId, state.generatedAssets]);

    const handleGenerateAudio = useCallback(async (pronunciationDictOverride?: PronunciationDictItem[]) => {
        if (selectedSegmentId) {
            const segment = state.segments.find(s => s.id === selectedSegmentId);
            if (segment) {
                // If no override provided, fetch global dictionary and merge with segment custom pronunciations
                let finalDict = pronunciationDictOverride;
                if (!finalDict) {
                    try {
                        const res = await fetch('/api/dictionary/all');
                        const data = await res.json();
                        const globalDict: PronunciationDictItem[] = data.pronunciationDict || [];
                        const segmentAssets = state.generatedAssets.get(selectedSegmentId);
                        const segmentCustomDict = segmentAssets?.customPronunciations || [];
                        // Merge: segment custom overrides global (use Map for deduplication)
                        const dictMap = new Map<string, PronunciationDictItem>();
                        globalDict.forEach(item => dictMap.set(item.text, item));
                        segmentCustomDict.forEach(item => dictMap.set(item.text, item));
                        finalDict = Array.from(dictMap.values());
                    } catch (error) {
                        console.error('Failed to fetch global dictionary:', error);
                        finalDict = [];
                    }
                }
                generateAudioForSegment(selectedSegmentId, segment.text, finalDict);
            }
        }
    }, [selectedSegmentId, state.segments, state.generatedAssets]);

    const processSegment = async (segment: Segment, globalDict: PronunciationDictItem[]) => {
        try {
            const assets = state.generatedAssets.get(segment.id);
            let currentPrompt = assets?.imagePrompt;

            // 1. Generate Prompt if missing
            if (!currentPrompt) {
                currentPrompt = await generatePromptForSegment(segment.id, segment.text);
            }

            // Parallelize Image and Audio generation
            const tasks: Promise<void>[] = [];

            // 2. Generate Image if missing (and we have a prompt)
            if (currentPrompt && !assets?.imageUrl) {
                tasks.push(generateImageForSegment(segment.id, currentPrompt));
            }

            // 3. Generate Audio if missing
            if (!assets?.audioUrl) {
                // Merge global dict with segment custom pronunciations
                const segmentCustomDict = assets?.customPronunciations || [];
                const dictMap = new Map<string, PronunciationDictItem>();
                globalDict.forEach(item => dictMap.set(item.text, item));
                segmentCustomDict.forEach(item => dictMap.set(item.text, item));
                const mergedDict = Array.from(dictMap.values());
                tasks.push(generateAudioForSegment(segment.id, segment.text, mergedDict));
            }

            // Execute tasks in parallel
            if (tasks.length > 0) {
                await Promise.all(tasks);
            }
        } catch (error) {
            console.error(`Error processing segment ${segment.id}`, error);
            // Individual errors are caught here, allowing other segments to proceed
            // UI will naturally reflect the error state set by updateAssetStatus in the helper functions
        }
    };

    const handleBatchGenerate = async () => {
        if (isBatchGenerating) return;
        setIsBatchGenerating(true);

        // Auto-select first segment so user can start reviewing immediately
        if (state.segments.length > 0) {
            setSelectedSegmentId(state.segments[0].id);
        }

        // Fetch global dictionary once before processing all segments
        let globalDict: PronunciationDictItem[] = [];
        try {
            const res = await fetch('/api/dictionary/all');
            const data = await res.json();
            globalDict = data.pronunciationDict || [];
        } catch (error) {
            console.error('Failed to fetch global dictionary:', error);
        }

        // Helper function to chunk array
        const chunkArray = <T,>(array: T[], size: number): T[][] => {
            const chunks: T[][] = [];
            for (let i = 0; i < array.length; i += size) {
                chunks.push(array.slice(i, i + size));
            }
            return chunks;
        };

        // Process segments in batches of 3 for better UX and rate limit handling
        const BATCH_SIZE = 3;
        const chunks = chunkArray(state.segments, BATCH_SIZE);

        for (const chunk of chunks) {
            await Promise.all(chunk.map(segment => processSegment(segment, globalDict)));
        }

        setIsBatchGenerating(false);
    };

    const handleBack = () => {
        // Check if any assets or prompts have been generated
        let hasGeneratedContent = false;
        state.generatedAssets.forEach((assets) => {
            if (assets.imagePrompt || assets.imageUrl || assets.audioUrl) {
                hasGeneratedContent = true;
            }
        });

        if (hasGeneratedContent) {
            setShowBackModal(true);
        } else {
            setCurrentStep(2);
            router.push('/slice');
        }
    };

    const confirmBack = () => {
        clearGeneratedAssets();
        setShowBackModal(false);
        setCurrentStep(2);
        router.push('/slice');
    };

    const togglePlaybackRate = () => {
        const rates = [0.5, 1, 1.25, 1.5, 2];
        const currentIndex = rates.indexOf(state.playbackRate);
        const nextRate = rates[(currentIndex + 1) % rates.length];
        setPlaybackRate(nextRate);
    };



    // Calculate timeline segments with timing
    const timelineSegments = useMemo(
        () => calculateTimelineSegments(state.segments, state.generatedAssets),
        [state.segments, state.generatedAssets]
    );

    // Get selected segment info
    const selectedSegmentIndex = state.segments.findIndex(s => s.id === selectedSegmentId);
    const selectedSegment = state.segments[selectedSegmentIndex];
    const selectedAssets = selectedSegmentId ? state.generatedAssets.get(selectedSegmentId) || null : null;

    // Check if all segments are complete
    const allComplete = state.segments.length > 0 && state.segments.every((segment) => {
        const assets = state.generatedAssets.get(segment.id);
        return assets?.imageStatus === 'success' && assets?.audioStatus === 'success';
    });

    // Calculate progress
    const totalSegments = state.segments.length;
    const completedSegments = state.segments.filter((seg) => {
        const assets = state.generatedAssets.get(seg.id);
        return assets?.imageStatus === 'success' && assets?.audioStatus === 'success';
    }).length;

    const handleSelectSegment = (id: string) => {
        setSelectedSegmentId(id);

        // ALWAYS update preview position when clicking a segment
        const segment = timelineSegments.find(s => s.id === id);
        if (segment && segment.startTime !== undefined) {
            setCurrentPlayTime(segment.startTime);

            // Context-Aware Logic:
            // Only auto-play if all assets are ready (Preview Mode)
            if (allComplete) {
                setIsPlaying(true);
            }
        }
    };

    const handleSeek = (time: number) => {
        setCurrentPlayTime(time);

        // Optional: Update selected segment based on time
        const segmentAtTime = timelineSegments.find(
            seg => time >= seg.startTime && time < (seg.startTime + seg.duration)
        );
        if (segmentAtTime && segmentAtTime.id !== selectedSegmentId) {
            setSelectedSegmentId(segmentAtTime.id);
        }
    };

    const handleNextStep = () => {
        setCurrentStep(4);
        router.push('/heygen');
    };

    if (state.segments.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col h-screen bg-gray-950 text-white">
            {/* Header */}
            <header className="h-16 border-b border-white/10 bg-gray-900/50 backdrop-blur flex items-center justify-between px-6 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={handleBack}>
                        ← 返回
                    </Button>
                    <h1>Review & Export</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-xs text-gray-400">
                        進度: {completedSegments} / {totalSegments}
                    </div>
                    <Button variant="primary" onClick={handleNextStep} disabled={!allComplete}>
                        下一步 (匯出) →
                    </Button>
                </div>
            </header>

            {/* Main Content - Quadrant Layout */}
            <div className="flex-1 min-h-0 flex flex-col gap-4 p-4 overflow-hidden">
                {/* Top Row: Preview + Config (Equal Heights) */}
                <div className="flex-1 min-h-0 flex gap-4">
                    {/* Left: Preview Player (16:9 handled internally by PreviewPlayer) */}
                    <div className="flex-[1.5] min-w-0 relative">
                        <PreviewPlayer
                            segments={timelineSegments}
                            isPlaying={isPlaying}
                            currentTime={currentPlayTime}
                            onPlayStateChange={setIsPlaying}
                            onTimeUpdate={setCurrentPlayTime}
                            onPlayComplete={() => setIsPlaying(false)}
                            onBatchGenerate={handleBatchGenerate}
                            isBatchGenerating={isBatchGenerating}
                            onSegmentChange={setSelectedSegmentId}
                            playbackRate={state.playbackRate}
                        />

                        {/* Speed Control Overlay (Bottom Right of Preview Area) */}
                        <div className="absolute bottom-4 right-4 z-10">
                            <button
                                onClick={togglePlaybackRate}
                                className="bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/10 transition-all flex items-center gap-1"
                                title="調整播放倍速"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                {state.playbackRate}x
                            </button>
                        </div>
                    </div>

                    {/* Right: Config Panel */}
                    <div className="flex-1 min-w-[320px]">
                        <ConfigPanel
                            segmentId={selectedSegmentId}
                            segmentIndex={selectedSegmentIndex}
                            segmentText={selectedSegment?.text || ''}
                            assets={selectedAssets}
                            onTextChange={(text) => {
                                if (selectedSegmentId) {
                                    updateSegmentText(selectedSegmentId, text);
                                }
                            }}
                            onPromptChange={handlePromptChange}
                            onGeneratePrompt={() => {
                                if (selectedSegmentId && selectedSegment) {
                                    generatePromptForSegment(selectedSegmentId, selectedSegment.text);
                                }
                            }}
                            onGenerateImage={handleGenerateImage}
                            onGenerateAudio={handleGenerateAudio}
                            onUpdateDictionary={(items: PronunciationDictItem[]) => {
                                if (selectedSegmentId) {
                                    updateAssetStatus(selectedSegmentId, 'customPronunciations', items);
                                }
                            }}
                            onUpdateVoiceSettings={(key: 'voiceSpeed' | 'voiceEmotion', value: number | string) => {
                                if (selectedSegmentId) {
                                    updateAssetStatus(selectedSegmentId, key, value);
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Bottom Row: Timeline (Full Width, Fixed Height) */}
                <div className="h-[220px] flex-shrink-0 flex flex-col">
                    <TimelineContainer
                        segments={state.segments}
                        generatedAssets={state.generatedAssets}
                        selectedSegmentId={selectedSegmentId}
                        onSelectSegment={handleSelectSegment}
                        isPlaying={isPlaying}
                        currentPlayTime={currentPlayTime}
                        onSeek={handleSeek}
                    />
                </div>
            </div>

            {/* Info Banner */}
            <div className="flex-shrink-0 bg-yellow-500/10 border-t border-yellow-500/30 px-6 py-2">
                <p className="text-yellow-300 text-xs text-center">
                    ⚠️ 返回上一步將清除所有已生成的素材
                </p>
            </div>

            {/* Destructive Back Modal */}
            <ConfirmModal
                isOpen={showBackModal}
                onClose={() => setShowBackModal(false)}
                onConfirm={confirmBack}
                title="⚠️ 警告"
                message="返回將遺失所有已生成的 Prompt、圖片與語音素材，確定要返回嗎？"
                confirmText="確認返回"
                cancelText="取消"
            />
        </div>
    );
}

