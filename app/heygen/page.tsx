'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useProject } from '@/context/ProjectContext';
import { Button, Card, Spinner } from '@/components/ui';
import JSZip from 'jszip';

export default function HeygenPage() {
    const router = useRouter();
    const { state, setMergedAudio, setHeygenVideo, setCurrentStep } = useProject();

    // Audio merge state
    const [isMerging, setIsMerging] = useState(false);
    const [mergeError, setMergeError] = useState<string | null>(null);

    // ZIP download state
    const [isZipping, setIsZipping] = useState(false);

    // Video upload state
    const [isDragging, setIsDragging] = useState(false);

    // Redirect if no segments
    React.useEffect(() => {
        if (state.segments.length === 0) {
            router.push('/');
        }
    }, [state.segments.length, router]);

    // Calculate total audio duration
    const { totalDuration, audioCount, allAudioReady } = useMemo(() => {
        let duration = 0;
        let count = 0;
        let ready = true;

        state.segments.forEach((segment) => {
            const assets = state.generatedAssets.get(segment.id);
            if (assets?.audioUrl && assets?.audioDuration) {
                duration += assets.audioDuration;
                count++;
            } else if (assets?.audioStatus !== 'success') {
                ready = false;
            }
        });

        return {
            totalDuration: duration,
            audioCount: count,
            allAudioReady: ready && count === state.segments.length,
        };
    }, [state.segments, state.generatedAssets]);

    // Merge audio using Web Audio API
    const handleMergeAudio = useCallback(async () => {
        setIsMerging(true);
        setMergeError(null);

        try {
            const audioContext = new AudioContext();
            const audioBuffers: AudioBuffer[] = [];

            // Decode all audio files
            for (const segment of state.segments) {
                const assets = state.generatedAssets.get(segment.id);
                if (!assets?.audioUrl) {
                    throw new Error(`Segment ${segment.id} missing audio`);
                }

                // Fetch the audio data (base64 data URL or blob URL)
                const response = await fetch(assets.audioUrl);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                audioBuffers.push(audioBuffer);
            }

            // Calculate total length
            const totalLength = audioBuffers.reduce((sum, buf) => sum + buf.length, 0);
            const sampleRate = audioBuffers[0]?.sampleRate || 44100;
            const numberOfChannels = audioBuffers[0]?.numberOfChannels || 1;

            // Create merged buffer
            const mergedBuffer = audioContext.createBuffer(numberOfChannels, totalLength, sampleRate);

            // Copy audio data
            let offset = 0;
            for (const buffer of audioBuffers) {
                for (let channel = 0; channel < numberOfChannels; channel++) {
                    const channelData = buffer.getChannelData(channel);
                    mergedBuffer.getChannelData(channel).set(channelData, offset);
                }
                offset += buffer.length;
            }

            // Convert to WAV (simpler than MP3, works without external libs)
            const wavBlob = audioBufferToWav(mergedBuffer);
            const blobUrl = URL.createObjectURL(wavBlob);

            // Calculate duration
            const duration = mergedBuffer.duration;

            setMergedAudio(blobUrl, duration);
            await audioContext.close();
        } catch (error) {
            setMergeError(error instanceof Error ? error.message : 'Failed to merge audio');
        } finally {
            setIsMerging(false);
        }
    }, [state.segments, state.generatedAssets, setMergedAudio]);

    // Download ZIP with all audio files
    const handleDownloadZip = useCallback(async () => {
        setIsZipping(true);

        try {
            const zip = new JSZip();

            for (let i = 0; i < state.segments.length; i++) {
                const segment = state.segments[i];
                const assets = state.generatedAssets.get(segment.id);

                if (assets?.audioUrl) {
                    const response = await fetch(assets.audioUrl);
                    const blob = await response.blob();
                    const fileName = `${String(i + 1).padStart(2, '0')}_${segment.id}.mp3`;
                    zip.file(fileName, blob);
                }
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'audio_segments.zip';
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to create ZIP:', error);
        } finally {
            setIsZipping(false);
        }
    }, [state.segments, state.generatedAssets]);

    // Handle video file upload
    const handleVideoUpload = (file: File) => {
        if (file.type.startsWith('video/')) {
            setHeygenVideo(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleVideoUpload(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleVideoUpload(file);
    };

    const handleBack = () => {
        setCurrentStep(3);
        router.push('/review');
    };

    const handleNext = () => {
        setCurrentStep(5);
        router.push('/export');
    };

    // Check if can proceed (HeyGen video uploaded)
    const canProceed = !!state.heygen.heygenVideoUrl;

    if (state.segments.length === 0) {
        return null;
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

                {/* Progress Indicator - 5 Steps */}
                <div className="flex items-center justify-center gap-2 mb-10">
                    {[1, 2, 3, 4, 5].map((step) => (
                        <React.Fragment key={step}>
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${step === 4
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                                    : step < 4
                                        ? 'bg-indigo-500/20 text-indigo-400'
                                        : 'bg-white/5 text-gray-500'
                                    }`}
                            >
                                {step < 4 ? (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    step
                                )}
                            </div>
                            {step < 5 && (
                                <div className={`w-12 h-0.5 ${step < 4 ? 'bg-indigo-500/40' : 'bg-white/10'}`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* Step Title */}
                <div className="mb-8">
                    <h2 className="text-2xl font-semibold text-white mb-2">
                        Step 4: HeyGen 對嘴影片
                    </h2>
                    <p className="text-gray-400">
                        匯出音頻，上傳由 HeyGen 生成的對嘴影片
                    </p>
                </div>

                {/* Section 1: MP3 Export */}
                <Card className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4">🎵 音頻匯出</h3>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 text-center mb-6">
                        <div className="bg-white/5 rounded-xl p-4">
                            <p className="text-3xl font-bold text-indigo-400">{audioCount}</p>
                            <p className="text-gray-400 text-sm mt-1">音頻段落</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                            <p className="text-3xl font-bold text-purple-400">
                                {totalDuration.toFixed(1)}s
                            </p>
                            <p className="text-gray-400 text-sm mt-1">總時長</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                            <p className="text-3xl font-bold text-pink-400">
                                {state.heygen.mergedAudioUrl ? '✓' : '—'}
                            </p>
                            <p className="text-gray-400 text-sm mt-1">已合併</p>
                        </div>
                    </div>

                    {/* Export Options */}
                    <div className="space-y-4">
                        {/* Option 1: Merge Audio */}
                        <div className="bg-white/5 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h4 className="text-white font-medium">選項 1：合併音頻</h4>
                                    <p className="text-gray-400 text-sm">自動合併成一個 WAV 檔案</p>
                                </div>
                                {isMerging ? (
                                    <Spinner size="sm" />
                                ) : (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={handleMergeAudio}
                                        disabled={!allAudioReady}
                                    >
                                        合併音頻
                                    </Button>
                                )}
                            </div>
                            {mergeError && (
                                <p className="text-red-400 text-sm mb-2">{mergeError}</p>
                            )}
                            {state.heygen.mergedAudioUrl && (
                                <div className="flex items-center gap-4">
                                    <audio
                                        src={state.heygen.mergedAudioUrl}
                                        controls
                                        className="flex-1 h-10"
                                    />
                                    <a
                                        href={state.heygen.mergedAudioUrl}
                                        download="merged_audio.wav"
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                                    >
                                        下載
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Option 2: Download ZIP */}
                        <div className="bg-white/5 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-white font-medium">選項 2：下載 ZIP</h4>
                                    <p className="text-gray-400 text-sm">下載所有分段音頻，自己在剪映合併</p>
                                </div>
                                {isZipping ? (
                                    <Spinner size="sm" />
                                ) : (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={handleDownloadZip}
                                        disabled={audioCount === 0}
                                    >
                                        下載 ZIP
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="mt-6 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                        <p className="text-indigo-300 text-sm">
                            💡 請將匯出的音頻上傳到 HeyGen，生成對嘴影片後再回來上傳
                        </p>
                    </div>
                </Card>

                {/* Section 2: HeyGen Video Upload */}
                <Card className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4">📹 上傳 HeyGen 影片</h3>

                    {state.heygen.heygenVideoUrl ? (
                        // Video Preview
                        <div className="space-y-4">
                            <video
                                src={state.heygen.heygenVideoUrl}
                                controls
                                className="w-full rounded-xl border border-white/10"
                            />
                            <div className="flex items-center justify-between">
                                <p className="text-gray-400 text-sm">
                                    {state.heygen.heygenVideoFile?.name}
                                </p>
                                <label className="cursor-pointer">
                                    <input
                                        type="file"
                                        accept="video/mp4"
                                        onChange={handleFileInput}
                                        className="hidden"
                                    />
                                    <span className="text-indigo-400 hover:text-indigo-300 text-sm">
                                        更換影片
                                    </span>
                                </label>
                            </div>
                        </div>
                    ) : (
                        // Upload Area
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${isDragging
                                ? 'border-indigo-500 bg-indigo-500/10'
                                : 'border-white/20 hover:border-white/40'
                                }`}
                        >
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <p className="text-white mb-2">拖放 HeyGen 影片到這裡</p>
                            <p className="text-gray-400 text-sm mb-4">或</p>
                            <label className="cursor-pointer">
                                <input
                                    type="file"
                                    accept="video/mp4"
                                    onChange={handleFileInput}
                                    className="hidden"
                                />
                                <span className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                                    選擇檔案
                                </span>
                            </label>
                            <p className="text-gray-500 text-xs mt-4">支援 MP4 格式</p>
                        </div>
                    )}
                </Card>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={handleBack}>
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                        </svg>
                        返回
                    </Button>
                    <Button onClick={handleNext} disabled={!canProceed}>
                        下一步 (匯出) →
                    </Button>
                </div>

                {/* Info */}
                {!canProceed && (
                    <div className="mt-8 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                        <p className="text-yellow-300 text-sm text-center">
                            ⚠️ 請先上傳 HeyGen 影片才能進入下一步
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Helper: Convert AudioBuffer to WAV Blob
function audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = buffer.length * blockAlign;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const arrayBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(arrayBuffer);

    // WAV Header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, totalSize - 8, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Interleave channels and write PCM data
    const offset = 44;
    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }

    let pos = offset;
    for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, channels[channel][i]));
            view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            pos += 2;
        }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
}
