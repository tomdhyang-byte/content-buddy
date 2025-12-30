'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SegmentAssets, GenerationStatus, PronunciationDictItem } from '@/types';
import { Button, Spinner, EditModal } from '@/components/ui';

interface ConfigPanelProps {
    segmentId: string | null;
    segmentIndex: number;
    segmentText: string;
    assets: SegmentAssets | null;
    onPromptChange: (prompt: string) => void;
    onGeneratePrompt: () => void;
    onGenerateImage: () => void;
    onGenerateAudio: () => void;
    onUpdateDictionary: (items: PronunciationDictItem[]) => void;
    onUpdateVoiceSettings: (key: 'voiceSpeed' | 'voiceEmotion', value: number | string) => void;
}

export function ConfigPanel({
    segmentId,
    segmentIndex,
    segmentText,
    assets,
    onPromptChange,
    onGeneratePrompt,
    onGenerateImage,
    onGenerateAudio,
    onUpdateDictionary,
    onUpdateVoiceSettings,
}: ConfigPanelProps) {
    // Modal states
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
    const [editedPrompt, setEditedPrompt] = useState('');

    // Dictionary state
    const [newDictText, setNewDictText] = useState('');
    const [newDictPron, setNewDictPron] = useState('');

    // Audio player state
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioInstanceRef = useRef<HTMLAudioElement | null>(null); // Persistent instance
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);

    // Sync prompt from assets
    useEffect(() => {
        if (assets?.imagePrompt) {
            setEditedPrompt(assets.imagePrompt);
        } else {
            setEditedPrompt('');
        }
    }, [assets?.imagePrompt]);

    // Handle audio lifecycle
    useEffect(() => {
        if (!audioInstanceRef.current) {
            audioInstanceRef.current = new Audio();
        }
        const audio = audioInstanceRef.current;

        const handleEnded = () => setIsAudioPlaying(false);
        const handlePause = () => setIsAudioPlaying(false);
        const handlePlay = () => setIsAudioPlaying(true);

        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('play', handlePlay);

        return () => {
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('play', handlePlay);
            audio.pause();
            audio.src = '';
        };
    }, []);

    // Update audio source when asset changes
    useEffect(() => {
        if (!audioInstanceRef.current) return;
        const audio = audioInstanceRef.current;
        if (assets?.audioUrl && audio.src !== assets.audioUrl) {
            audio.src = assets.audioUrl;
            // Don't auto-play, just load. Only auto-play if it was playing the *same* track logic? 
            // Better behavior: Reset state on track change
            setIsAudioPlaying(false);
        }
    }, [assets?.audioUrl]);

    const handlePromptSave = (newPrompt: string) => {
        setEditedPrompt(newPrompt);
        onPromptChange(newPrompt);
    };

    const handleAddDictItem = () => {
        if (!newDictText.trim() || !newDictPron.trim()) return;
        const currentItems = assets?.customPronunciations || [];
        onUpdateDictionary([...currentItems, { text: newDictText.trim(), pronunciation: newDictPron.trim() }]);
        setNewDictText('');
        setNewDictPron('');
    };

    const handleDeleteDictItem = (index: number) => {
        const currentItems = assets?.customPronunciations || [];
        const newItems = [...currentItems];
        newItems.splice(index, 1);
        onUpdateDictionary(newItems);
    };

    const handlePlayAudio = () => {
        if (!assets?.audioUrl) return;

        if (!audioInstanceRef.current) {
            audioInstanceRef.current = new Audio();
        }
        const audio = audioInstanceRef.current;

        // Ensure source is set (in case it wasn't caught by effect for some reason, though effect should handle it)
        if (audio.src !== assets.audioUrl) {
            audio.src = assets.audioUrl;
        }

        if (isAudioPlaying) {
            audio.pause();
        } else {
            audio.play().catch(console.error);
        }
    };

    const getStatusBadge = (status: GenerationStatus) => {
        switch (status) {
            case 'success':
                return <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">✓</span>;
            case 'loading':
                return <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">...</span>;
            case 'error':
                return <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">✗</span>;
            default:
                return <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs rounded-full">○</span>;
        }
    };

    // Empty state when no segment is selected
    if (!segmentId || !assets) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500 bg-gray-900/50 rounded-xl border border-white/10">
                <p className="text-center text-sm">
                    點擊時間軸上的區塊<br />以查看詳細資訊
                </p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-900/50 rounded-xl border border-white/10 overflow-hidden">
            {/* Header with segment number */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0">
                <span className="w-7 h-7 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                    {segmentIndex + 1}
                </span>
                <h3 className="text-base font-semibold text-white">段落 {segmentIndex + 1}</h3>
            </div>

            {/* Script Text Preview (Fixed Height) */}
            <div className="px-4 py-3 border-b border-white/10 flex-shrink-0">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">📝 文字內容</label>
                <div className="bg-white/5 rounded-lg p-2.5 text-gray-300 text-sm leading-relaxed h-16 overflow-hidden line-clamp-3">
                    {segmentText}
                </div>
            </div>

            {/* Image & Audio Config (Side by Side) */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* Left Column: Image Config */}
                <div className="flex-1 flex flex-col p-4 border-r border-white/10 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-gray-400">🎨 Image Prompt</label>
                            {getStatusBadge(assets.promptStatus)}
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onGeneratePrompt();
                            }}
                            disabled={assets.promptStatus === 'loading'}
                            className="text-[10px] px-2 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded border border-indigo-500/30 transition-all flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="AI 自動優化 Prompt"
                        >
                            {assets.promptStatus === 'loading' ? (
                                <><Spinner size="sm" /> 生成中...</>
                            ) : (
                                assets.imagePrompt ? (
                                    <>🔄 重新生成</>
                                ) : (
                                    <>✨ AI 生成</>
                                )
                            )}
                        </button>
                    </div>

                    {/* Prompt Preview (Adaptive Height) */}
                    <div className="flex-1 min-h-0 flex flex-col mb-3">
                        <div
                            onClick={() => setIsPromptModalOpen(true)}
                            className="flex-1 bg-white/5 rounded-lg p-2.5 text-gray-300 text-xs leading-relaxed overflow-hidden cursor-pointer hover:bg-white/10 transition-colors"
                        >
                            {assets.promptStatus === 'loading' ? (
                                <span className="flex items-center gap-2 text-gray-400">
                                    <Spinner size="sm" /> 生成中...
                                </span>
                            ) : (
                                editedPrompt || <span className="text-gray-500 italic">點擊編輯 Prompt...</span>
                            )}
                        </div>
                    </div>

                    {/* Image Buttons */}
                    <div className="space-y-2 mt-auto">

                        <Button
                            variant="primary"
                            size="sm"
                            className="w-full"
                            onClick={onGenerateImage}
                            disabled={!assets.imagePrompt || assets.imageStatus === 'loading'}
                        >
                            {assets.imageStatus === 'loading' ? (
                                <><Spinner size="sm" /> 生成中...</>
                            ) : (
                                assets.imageUrl ? '🔄 重新生成圖片' : '🖼️ 生成圖片'
                            )}
                        </Button>
                    </div>


                </div>

                {/* Right Column: Audio Config */}
                <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-gray-400">🔊 語音設定</label>
                        {getStatusBadge(assets.audioStatus)}
                    </div>

                    {/* Speed Control */}
                    <div className="mb-3">
                        <label className="block text-xs text-gray-500 mb-1">語速 (Speed): {assets.voiceSpeed || 1.2}</label>
                        <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.1"
                            value={assets.voiceSpeed || 1.2}
                            onChange={(e) => onUpdateVoiceSettings('voiceSpeed', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>

                    {/* Emotion Control */}
                    <div className="mb-3">
                        <label className="block text-xs text-gray-500 mb-1">情緒 (Emotion)</label>
                        <select
                            value={assets.voiceEmotion || 'neutral'}
                            onChange={(e) => onUpdateVoiceSettings('voiceEmotion', e.target.value)}
                            className="w-full bg-white/5 border border-white/20 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                        >
                            <option value="neutral">😐 Neutral (中性)</option>
                            <option value="happy">😊 Happy (開心)</option>
                            <option value="sad">😢 Sad (悲傷)</option>
                            <option value="angry">😠 Angry (憤怒)</option>
                            <option value="fearful">😰 Fearful (恐懼)</option>
                            <option value="surprised">😲 Surprised (驚訝)</option>
                        </select>
                    </div>

                    {/* Pronunciation Dictionary (Compact) */}
                    <div className="mb-3">
                        <label className="block text-xs text-gray-500 mb-1">發音字典</label>
                        <div className="flex gap-1 mb-1">
                            <input
                                type="text"
                                placeholder="文字"
                                value={newDictText}
                                onChange={(e) => setNewDictText(e.target.value)}
                                className="flex-1 bg-white/5 border border-white/20 rounded px-2 py-1 text-white text-xs placeholder-gray-500 focus:outline-none"
                            />
                            <input
                                type="text"
                                placeholder="拼音"
                                value={newDictPron}
                                onChange={(e) => setNewDictPron(e.target.value)}
                                className="flex-1 bg-white/5 border border-white/20 rounded px-2 py-1 text-white text-xs placeholder-gray-500 focus:outline-none"
                            />
                            <button
                                onClick={handleAddDictItem}
                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition-colors"
                            >
                                +
                            </button>
                        </div>
                        {/* Dictionary Items */}
                        {(assets.customPronunciations || []).length > 0 && (
                            <div className="space-y-1 max-h-16 overflow-y-auto">
                                {assets.customPronunciations?.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between bg-white/5 rounded px-2 py-1 text-xs">
                                        <span className="text-gray-300">{item.text} → {item.pronunciation}</span>
                                        <button
                                            onClick={() => handleDeleteDictItem(index)}
                                            className="text-gray-500 hover:text-red-400"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Audio Generate & Preview */}
                    <div className="mt-auto space-y-2">
                        <Button
                            variant="primary"
                            size="sm"
                            className="w-full"
                            onClick={onGenerateAudio}
                            disabled={assets.audioStatus === 'loading'}
                        >
                            {assets.audioStatus === 'loading' ? (
                                <><Spinner size="sm" /> 生成中...</>
                            ) : (
                                assets.audioUrl ? '🔄 重新生成語音' : '🔊 生成語音'
                            )}
                        </Button>
                        {assets.audioUrl && (
                            <button
                                onClick={handlePlayAudio}
                                className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white transition-colors"
                            >
                                {isAudioPlaying ? '⏸️ 暫停' : '▶️ 播放語音'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Modal for Prompt */}
            <EditModal
                isOpen={isPromptModalOpen}
                title="編輯 Image Prompt"
                value={editedPrompt}
                onChange={handlePromptSave}
                onClose={() => setIsPromptModalOpen(false)}
                placeholder="輸入或編輯用於生成圖片的 Prompt..."
            />
        </div>
    );
}
