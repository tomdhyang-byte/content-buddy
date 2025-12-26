'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProject } from '@/context/ProjectContext';
import { Button, SegmentSkeleton } from '@/components/ui';
import { SegmentCard } from '@/components/SegmentCard';
import { Segment, SliceResponse } from '@/types';

export default function SlicePage() {
    const router = useRouter();
    const {
        state,
        setSegments,
        updateSegmentText,
        mergeSegments,
        splitSegment,
        setCurrentStep,
    } = useProject();

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Redirect if no script
    useEffect(() => {
        if (!state.script) {
            router.push('/');
        }
    }, [state.script, router]);

    // Fetch sliced segments on mount (only if not already loaded)
    useEffect(() => {
        if (state.segments.length > 0) {
            setIsLoading(false);
            return;
        }

        const fetchSegments = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const response = await fetch('/api/slice', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ script: state.script }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to slice script');
                }

                const data: SliceResponse = await response.json();
                setSegments(data.segments);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setIsLoading(false);
            }
        };

        if (state.script) {
            fetchSegments();
        }
    }, [state.script, state.segments.length, setSegments]);

    const handleBack = () => {
        setCurrentStep(1);
        router.push('/');
    };

    const handleNext = () => {
        if (state.segments.length === 0) return;
        setCurrentStep(3);
        router.push('/review');
    };

    const handleRetry = () => {
        setSegments([]);
        setError(null);
        setIsLoading(true);
        // Re-trigger the useEffect by clearing segments
    };

    if (!state.script) {
        return null; // Will redirect
    }

    return (
        <div className="min-h-screen py-12 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
                        ContentBuddy
                    </h1>
                </div>

                {/* Progress Indicator */}
                <div className="flex items-center justify-center gap-2 mb-10">
                    {[1, 2, 3, 4].map((step) => (
                        <React.Fragment key={step}>
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${step === 2
                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                                        : step < 2
                                            ? 'bg-indigo-500/20 text-indigo-400'
                                            : 'bg-white/10 text-gray-500'
                                    }`}
                            >
                                {step < 2 ? (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    step
                                )}
                            </div>
                            {step < 4 && (
                                <div className={`w-12 h-0.5 ${step < 2 ? 'bg-indigo-500/40' : 'bg-white/10'}`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* Step Title */}
                <div className="mb-8">
                    <h2 className="text-2xl font-semibold text-white mb-2">
                        Step 2: 結構切分
                    </h2>
                    <p className="text-gray-400">
                        檢視 AI 切分的段落，你可以編輯、合併或拆分
                    </p>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <SegmentSkeleton key={i} />
                        ))}
                        <p className="text-center text-gray-400 mt-4">
                            AI 正在分析你的腳本...
                        </p>
                    </div>
                ) : error ? (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-red-400 mb-2">切分失敗</h3>
                        <p className="text-gray-400 mb-6">{error}</p>
                        <Button variant="danger" onClick={handleRetry}>
                            重試
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {state.segments.map((segment, index) => (
                            <SegmentCard
                                key={segment.id}
                                segment={segment}
                                index={index}
                                isLast={index === state.segments.length - 1}
                                onTextChange={(text) => updateSegmentText(segment.id, text)}
                                onMerge={() => mergeSegments(segment.id)}
                                onSplit={(splitIndex) => splitSegment(segment.id, splitIndex)}
                            />
                        ))}
                    </div>
                )}

                {/* Navigation Buttons */}
                {!isLoading && !error && state.segments.length > 0 && (
                    <div className="flex justify-between mt-10">
                        <Button variant="ghost" onClick={handleBack}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                            </svg>
                            上一步
                        </Button>
                        <Button onClick={handleNext}>
                            下一步：生成素材
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Button>
                    </div>
                )}

                {/* Info Banner */}
                <div className="mt-8 bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
                    <p className="text-indigo-300 text-sm text-center">
                        💡 點擊「下一步」即代表確認文本結構，之後無法再修改文字內容
                    </p>
                </div>
            </div>
        </div>
    );
}
