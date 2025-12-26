'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useProject } from '@/context/ProjectContext';
import { Button, ConfirmModal } from '@/components/ui';
import {
    TimelineContainer,
    InspectorPanel,
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
    } = useProject();

    const [showBackModal, setShowBackModal] = useState(false);
    const [promptsGenerated, setPromptsGenerated] = useState(false);
    const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentPlayTime, setCurrentPlayTime] = useState(0);

    // Redirect if no segments
    useEffect(() => {
        if (state.segments.length === 0) {
            router.push('/');
        } else if (!selectedSegmentId && state.segments.length > 0) {
            // Default select first segment
            setSelectedSegmentId(state.segments[0].id);
        }
    }, [state.segments, router, selectedSegmentId]);

    // Initialize assets and generate prompts on mount
    useEffect(() => {
        if (state.segments.length === 0 || promptsGenerated) return;

        // Initialize asset map if empty
        if (state.generatedAssets.size === 0) {
            initializeAssets();
        }

        // Generate prompts for all segments
        const generatePrompts = async () => {
            for (const segment of state.segments) {
                await generatePromptForSegment(segment.id, segment.text);
            }
            setPromptsGenerated(true);
        };

        generatePrompts();
    }, [state.segments, state.generatedAssets.size, initializeAssets, promptsGenerated]);

    const generatePromptForSegment = async (segmentId: string, text: string) => {
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
        } catch (error) {
            updateAssetStatus(segmentId, 'promptStatus', 'error');
            updateAssetStatus(segmentId, 'promptError', error instanceof Error ? error.message : 'Unknown error');
        }
    };

    const generateImageForSegment = async (segmentId: string) => {
        const assets = state.generatedAssets.get(segmentId);
        if (!assets?.imagePrompt) return;

        updateAssetStatus(segmentId, 'imageStatus', 'loading');

        try {
            const response = await fetch('/api/generate/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    segmentId,
                    prompt: assets.imagePrompt,
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

    const generateAudioForSegment = async (segmentId: string, text: string) => {
        updateAssetStatus(segmentId, 'audioStatus', 'loading');

        try {
            const response = await fetch('/api/generate/audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    segmentId,
                    text,
                    voiceId: state.voiceId,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate audio');
            }

            const data: GenerateAudioResponse = await response.json();
            updateAssetStatus(segmentId, 'audioUrl', data.audioUrl);
            updateAssetStatus(segmentId, 'audioDuration', data.duration);
            updateAssetStatus(segmentId, 'audioStatus', 'success');
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
    }, [selectedSegmentId]);

    const handleGenerateAudio = useCallback(() => {
        if (selectedSegmentId) {
            const segment = state.segments.find(s => s.id === selectedSegmentId);
            if (segment) {
                generateAudioForSegment(selectedSegmentId, segment.text);
            }
        }
    }, [selectedSegmentId, state.segments]);

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

    const handleExport = () => {
        setCurrentStep(4);
        router.push('/export');
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
    const allComplete = state.segments.every((segment) => {
        const assets = state.generatedAssets.get(segment.id);
        return assets?.imageStatus === 'success' && assets?.audioStatus === 'success';
    });

    // Calculate progress
    const totalSegments = state.segments.length;
    const completedSegments = state.segments.filter((seg) => {
        const assets = state.generatedAssets.get(seg.id);
        return assets?.imageStatus === 'success' && assets?.audioStatus === 'success';
    }).length;

    if (state.segments.length === 0) {
        return null;
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="flex-shrink-0 bg-gray-900/80 backdrop-blur-xl border-b border-white/10 px-6 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={handleBack}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                            </svg>
                            返回
                        </Button>
                        <div>
                            <h1 className="text-lg font-semibold text-white">Step 3: 素材生成</h1>
                            <p className="text-xs text-gray-400">
                                完成進度：{completedSegments} / {totalSegments} 段落
                            </p>
                        </div>
                    </div>

                    <Button
                        onClick={handleExport}
                        disabled={!allComplete}
                        size="sm"
                    >
                        匯出影片 →
                    </Button>
                </div>

                {/* Progress Bar */}
                <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${(completedSegments / totalSegments) * 100}%` }}
                    />
                </div>
            </header>

            {/* Main Content - Classic Split Layout */}
            <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
                {/* Top Row: Preview + Inspector */}
                <div className="flex gap-4" style={{ height: '45%' }}>
                    {/* Preview Player - Left */}
                    <div className="w-1/2 flex-shrink-0">
                        <PreviewPlayer
                            segments={timelineSegments}
                            isPlaying={isPlaying}
                            currentTime={currentPlayTime}
                            onPlayStateChange={setIsPlaying}
                            onTimeUpdate={setCurrentPlayTime}
                            onPlayComplete={() => setIsPlaying(false)}
                        />
                    </div>

                    {/* Inspector Panel - Right (Inline, no fixed width) */}
                    <div className="flex-1 bg-gray-900/50 rounded-xl border border-white/10 overflow-hidden">
                        <InspectorPanel
                            segmentId={selectedSegmentId}
                            segmentIndex={selectedSegmentIndex}
                            segmentText={selectedSegment?.text || ''}
                            assets={selectedAssets}
                            onPromptChange={handlePromptChange}
                            onGenerateImage={handleGenerateImage}
                            onGenerateAudio={handleGenerateAudio}
                            allComplete={allComplete}
                            onGeneratePreview={() => setIsPlaying(true)}
                            onUpdateDictionary={(items) => {
                                if (selectedSegmentId) {
                                    updateAssetStatus(selectedSegmentId, 'customPronunciations', items);
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Bottom Row: Timeline (Full Width) */}
                <div className="flex-1 min-h-0">
                    <TimelineContainer
                        segments={state.segments}
                        generatedAssets={state.generatedAssets}
                        selectedSegmentId={selectedSegmentId}
                        onSelectSegment={(id) => {
                            setSelectedSegmentId(id);
                            // Also seek to the start of the segment
                            if (id) {
                                const segments = calculateTimelineSegments(state.segments, state.generatedAssets);
                                const segment = segments.find(s => s.id === id);
                                if (segment) {
                                    setCurrentPlayTime(segment.startTime);
                                }
                            }
                        }}
                        isPlaying={isPlaying}
                        currentPlayTime={currentPlayTime}
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
