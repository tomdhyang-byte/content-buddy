'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useProject } from '@/context/ProjectContext';
import { Button, Card, Spinner } from '@/components/ui';

type JobStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

interface JobState {
    jobId: string | null;
    status: JobStatus;
    message: string;
    outputFilePath: string | null;
    error: string | null;
}

export default function ExportPage() {
    const router = useRouter();
    const { state, setCurrentStep, resetProject } = useProject();

    // Job state
    const [jobState, setJobState] = useState<JobState>({
        jobId: null,
        status: 'idle',
        message: '',
        outputFilePath: null,
        error: null,
    });

    // Polling interval ref
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, []);

    // Redirect if no segments or no heygen video
    useEffect(() => {
        if (state.segments.length === 0) {
            router.push('/');
        }
    }, [state.segments.length, router]);

    // Poll job status
    const pollJobStatus = useCallback(async (jobId: string) => {
        try {
            const response = await fetch(`/api/export?jobId=${jobId}`);
            const data = await response.json();

            if (data.status === 'completed') {
                setJobState(prev => ({
                    ...prev,
                    status: 'completed',
                    message: '影片處理完成！',
                    outputFilePath: data.outputFilePath,
                }));

                // Stop polling
                if (pollingRef.current) {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                }

                // Auto-download
                if (data.outputFilePath) {
                    triggerDownload(data.outputFilePath);
                }

            } else if (data.status === 'failed') {
                setJobState(prev => ({
                    ...prev,
                    status: 'failed',
                    message: '影片處理失敗',
                    error: data.error || data.message,
                }));

                // Stop polling
                if (pollingRef.current) {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                }

            } else {
                // Still processing
                setJobState(prev => ({
                    ...prev,
                    status: 'processing',
                    message: data.message || '影片處理中...',
                }));
            }

        } catch (error) {
            console.error('Polling error:', error);
        }
    }, []);

    // Trigger file download
    const triggerDownload = (filePath: string) => {
        // For local files, we need to serve them through an API
        // This creates a download link using the file path
        const link = document.createElement('a');
        link.href = `/api/export/download?path=${encodeURIComponent(filePath)}`;
        link.download = 'final_video.mp4';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Handle export
    const handleExport = async () => {
        if (!state.heygen.heygenVideoFile) {
            setJobState(prev => ({
                ...prev,
                status: 'failed',
                error: '請先在 Step 4 上傳 HeyGen 影片',
            }));
            return;
        }

        setJobState({
            jobId: null,
            status: 'uploading',
            message: '正在上傳素材...',
            outputFilePath: null,
            error: null,
        });

        try {
            // Prepare form data
            const formData = new FormData();
            formData.append('avatarVideo', state.heygen.heygenVideoFile);
            formData.append('script', state.script);
            formData.append('skipSubtitle', 'false');

            // Prepare segments data
            const segmentsData = state.segments.map((segment) => {
                const assets = state.generatedAssets.get(segment.id);
                return {
                    id: segment.id,
                    text: segment.text,
                    imageUrl: assets?.imageUrl || '',
                    audioUrl: assets?.audioUrl || '',
                };
            });
            formData.append('segments', JSON.stringify(segmentsData));

            // Submit job
            const response = await fetch('/api/export', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Export failed');
            }

            const data = await response.json();

            setJobState(prev => ({
                ...prev,
                jobId: data.jobId,
                status: 'processing',
                message: '影片處理中...',
            }));

            // Start polling
            pollingRef.current = setInterval(() => {
                pollJobStatus(data.jobId);
            }, 3000);

        } catch (error) {
            setJobState(prev => ({
                ...prev,
                status: 'failed',
                error: error instanceof Error ? error.message : 'Export failed',
            }));
        }
    };

    const handleBack = () => {
        setCurrentStep(4);
        router.push('/heygen');
    };

    const handleStartNew = () => {
        resetProject();
        router.push('/');
    };

    const handleRetry = () => {
        setJobState({
            jobId: null,
            status: 'idle',
            message: '',
            outputFilePath: null,
            error: null,
        });
    };

    if (state.segments.length === 0) {
        return null;
    }

    // Check if HeyGen video is uploaded
    const hasHeygenVideo = !!state.heygen.heygenVideoUrl;

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
                    {[1, 2, 3, 4, 5].map((step) => (
                        <React.Fragment key={step}>
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${step === 5
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                                    : 'bg-indigo-500/20 text-indigo-400'
                                    }`}
                            >
                                {step < 5 ? (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    step
                                )}
                            </div>
                            {step < 5 && (
                                <div className="w-12 h-0.5 bg-indigo-500/40" />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* Step Title */}
                <div className="mb-8">
                    <h2 className="text-2xl font-semibold text-white mb-2">
                        Step 5: 匯出影片
                    </h2>
                    <p className="text-gray-400">
                        合成最終影片並下載
                    </p>
                </div>

                {/* Summary Card */}
                <Card className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4">📋 素材摘要</h3>
                    <div className="grid grid-cols-4 gap-4 text-center">
                        <div className="bg-white/5 rounded-xl p-4">
                            <p className="text-3xl font-bold text-indigo-400">{state.segments.length}</p>
                            <p className="text-gray-400 text-sm mt-1">段落數</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                            <p className="text-3xl font-bold text-purple-400">
                                {state.segments.filter(s => state.generatedAssets.get(s.id)?.imageUrl).length}
                            </p>
                            <p className="text-gray-400 text-sm mt-1">圖片數</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                            <p className="text-3xl font-bold text-pink-400">
                                {state.segments.filter(s => state.generatedAssets.get(s.id)?.audioUrl).length}
                            </p>
                            <p className="text-gray-400 text-sm mt-1">語音數</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                            <p className="text-3xl font-bold text-green-400">
                                {hasHeygenVideo ? '✓' : '✗'}
                            </p>
                            <p className="text-gray-400 text-sm mt-1">Avatar 影片</p>
                        </div>
                    </div>
                </Card>

                {/* Preview Grid */}
                <Card className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4">🖼️ 素材預覽</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {state.segments.slice(0, 6).map((segment, index) => {
                            const assets = state.generatedAssets.get(segment.id);
                            return (
                                <div key={segment.id} className="relative aspect-video rounded-lg overflow-hidden border border-white/10">
                                    {assets?.imageUrl ? (
                                        <img
                                            src={assets.imageUrl}
                                            alt={`Segment ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                            <span className="text-gray-500">無圖片</span>
                                        </div>
                                    )}
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                        <span className="text-white text-xs font-medium">#{index + 1}</span>
                                    </div>
                                </div>
                            );
                        })}
                        {state.segments.length > 6 && (
                            <div className="aspect-video rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                                <span className="text-gray-400">+{state.segments.length - 6} 更多</span>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Export Section */}
                <Card>
                    {jobState.status === 'completed' ? (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
                                <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-semibold text-white mb-2">匯出完成！</h3>
                            <p className="text-gray-400 mb-2">你的影片已自動下載</p>
                            {jobState.outputFilePath && (
                                <p className="text-gray-500 text-sm mb-6 font-mono">
                                    {jobState.outputFilePath}
                                </p>
                            )}
                            <div className="flex flex-col gap-4 max-w-xs mx-auto">
                                <Button variant="secondary" onClick={handleStartNew}>
                                    開始新專案
                                </Button>
                            </div>
                        </div>

                    ) : jobState.status === 'failed' ? (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                                <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-red-400 mb-2">匯出失敗</h3>
                            <p className="text-gray-400 mb-6">{jobState.error}</p>
                            <Button variant="danger" onClick={handleRetry}>
                                重試
                            </Button>
                        </div>

                    ) : jobState.status === 'uploading' || jobState.status === 'processing' ? (
                        <div className="text-center py-8">
                            <Spinner size="lg" className="mx-auto mb-6 text-indigo-400" />
                            <h3 className="text-xl font-semibold text-white mb-2">
                                {jobState.status === 'uploading' ? '正在上傳素材...' : '正在處理影片...'}
                            </h3>
                            <p className="text-gray-400 mb-4">{jobState.message}</p>

                            {/* Progress indicator */}
                            <div className="max-w-md mx-auto">
                                <div className="flex justify-between text-sm text-gray-400 mb-2">
                                    <span>狀態</span>
                                    <span>{jobState.status === 'uploading' ? '上傳中' : '處理中'}</span>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all animate-pulse"
                                        style={{ width: jobState.status === 'uploading' ? '30%' : '60%' }}
                                    />
                                </div>
                                {jobState.jobId && (
                                    <p className="text-gray-500 text-xs mt-2 font-mono">
                                        Job ID: {jobState.jobId}
                                    </p>
                                )}
                            </div>
                        </div>

                    ) : (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">準備匯出</h3>
                            <p className="text-gray-400 mb-6">
                                {hasHeygenVideo
                                    ? '點擊下方按鈕開始生成最終影片'
                                    : '請先返回 Step 4 上傳 Avatar 影片'
                                }
                            </p>
                            <Button
                                size="lg"
                                onClick={handleExport}
                                disabled={!hasHeygenVideo}
                            >
                                🎬 匯出影片
                            </Button>
                        </div>
                    )}
                </Card>

                {/* Back Button */}
                {jobState.status === 'idle' && (
                    <div className="mt-8">
                        <Button variant="ghost" onClick={handleBack}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                            </svg>
                            返回 Step 4
                        </Button>
                    </div>
                )}

                {/* Warning if no HeyGen video */}
                {!hasHeygenVideo && jobState.status === 'idle' && (
                    <div className="mt-8 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                        <p className="text-yellow-300 text-sm text-center">
                            ⚠️ 請先在 Step 4 上傳 Avatar 影片才能匯出
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
