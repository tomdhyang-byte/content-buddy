'use client';

import React, { useState, useEffect } from 'react';
import { SegmentAssets, GenerationStatus, PronunciationDictItem } from '@/types';
import { Button, Spinner } from '@/components/ui';

interface InspectorPanelProps {
    segmentId: string | null;
    segmentIndex: number;
    segmentText: string;
    assets: SegmentAssets | null;
    onPromptChange: (prompt: string) => void;
    onGenerateImage: () => void;
    onGenerateAudio: () => void;
    onUpdateDictionary: (items: PronunciationDictItem[]) => void;
    allComplete: boolean;
    onGeneratePreview: () => void;
}

export function InspectorPanel({
    segmentId,
    segmentIndex,
    segmentText,
    assets,
    onPromptChange,
    onGenerateImage,
    onGenerateAudio,
    onUpdateDictionary,
    allComplete,
    onGeneratePreview,
}: InspectorPanelProps) {
    const [editedPrompt, setEditedPrompt] = useState('');
    const [isEditingPrompt, setIsEditingPrompt] = useState(false);

    // Dictionary state
    const [newDictText, setNewDictText] = useState('');
    const [newDictPron, setNewDictPron] = useState('');

    // Sync prompt from assets
    useEffect(() => {
        if (assets?.imagePrompt) {
            setEditedPrompt(assets.imagePrompt);
        }
    }, [assets?.imagePrompt]);

    const handleSavePrompt = () => {
        onPromptChange(editedPrompt);
        setIsEditingPrompt(false);
    };

    const handleAddDictItem = () => {
        if (!newDictText.trim() || !newDictPron.trim()) return;

        const currentItems = assets?.customPronunciations || [];
        const newItem: PronunciationDictItem = {
            text: newDictText.trim(),
            pronunciation: newDictPron.trim()
        };

        onUpdateDictionary([...currentItems, newItem]);
        setNewDictText('');
        setNewDictPron('');
    };

    const handleDeleteDictItem = (index: number) => {
        const currentItems = assets?.customPronunciations || [];
        const newItems = [...currentItems];
        newItems.splice(index, 1);
        onUpdateDictionary(newItems);
    };

    const getStatusBadge = (status: GenerationStatus) => {
        switch (status) {
            case 'success':
                return <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">✓ 完成</span>;
            case 'loading':
                return <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">生成中...</span>;
            case 'error':
                return <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">✗ 失敗</span>;
            default:
                return <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs rounded-full">待生成</span>;
        }
    };

    // Empty state when no segment is selected
    if (!segmentId || !assets) {
        return (
            <div className="w-full h-full p-4 flex flex-col">
                <h3 className="text-lg font-semibold text-white mb-4">屬性面板</h3>
                <div className="flex-1 flex items-center justify-center text-gray-500">
                    <p className="text-center text-sm">
                        點擊時間軸上的區塊<br />以查看詳細資訊
                    </p>
                </div>
                {/* Generate Preview Button */}
                <div className="mt-auto pt-4 border-t border-white/10">
                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        disabled={!allComplete}
                        onClick={onGeneratePreview}
                    >
                        {allComplete ? '▶️ 生成預覽' : '⏳ 等待素材完成'}
                    </Button>
                </div>
            </div>
        );
    }

    // Active segment state
    return (
        <div className="w-full h-full p-4 flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                    {segmentIndex + 1}
                </span>
                <h3 className="text-lg font-semibold text-white">段落 {segmentIndex + 1}</h3>
            </div>

            {/* Text Preview */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                    📝 文字內容 (唯讀)
                </label>
                <div className="bg-white/5 rounded-lg p-3 text-gray-300 text-sm leading-relaxed max-h-24 overflow-y-auto">
                    {segmentText}
                </div>
            </div>

            <hr className="border-white/10 mb-4" />

            {/* Prompt Section */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-400">🎨 Image Prompt</label>
                    {getStatusBadge(assets.promptStatus)}
                </div>

                {assets.promptStatus === 'loading' ? (
                    <div className="bg-white/5 rounded-lg p-3 flex items-center gap-2 text-gray-400">
                        <Spinner size="sm" />
                        <span className="text-sm">正在生成 Prompt...</span>
                    </div>
                ) : isEditingPrompt ? (
                    <div className="space-y-2">
                        <textarea
                            value={editedPrompt}
                            onChange={(e) => setEditedPrompt(e.target.value)}
                            className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none text-sm"
                            rows={4}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsEditingPrompt(false)}>
                                取消
                            </Button>
                            <Button variant="primary" size="sm" onClick={handleSavePrompt}>
                                儲存
                            </Button>
                        </div>
                    </div>
                ) : assets.imagePrompt ? (
                    <div
                        onClick={() => setIsEditingPrompt(true)}
                        className="bg-white/5 rounded-lg p-3 text-gray-300 text-sm leading-relaxed cursor-pointer hover:bg-white/10 transition-colors mb-2"
                    >
                        {assets.imagePrompt}
                        <span className="ml-2 text-gray-500 text-xs">(點擊編輯)</span>
                    </div>
                ) : (
                    <div className="bg-white/5 rounded-lg p-3 text-gray-500 text-sm mb-2">
                        等待生成...
                    </div>
                )}

                {/* Generate Image Button */}
                <Button
                    variant={assets.imageStatus === 'success' ? 'secondary' : 'primary'}
                    size="sm"
                    className="w-full"
                    onClick={onGenerateImage}
                    disabled={!assets.imagePrompt || assets.promptStatus !== 'success'}
                    loading={assets.imageStatus === 'loading'}
                >
                    {assets.imageStatus === 'loading' ? '生成中...' : assets.imageStatus === 'success' ? '🔄 重新生成圖片' : '🎨 生成圖片'}
                </Button>
            </div>

            <hr className="border-white/10 mb-4" />

            {/* Audio Section */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-400">🔊 語音</label>
                    {getStatusBadge(assets.audioStatus)}
                </div>

                {/* Generate Audio Button */}
                <Button
                    variant={assets.audioStatus === 'success' ? 'secondary' : 'primary'}
                    size="sm"
                    className="w-full mb-4"
                    onClick={onGenerateAudio}
                    loading={assets.audioStatus === 'loading'}
                >
                    {assets.audioStatus === 'loading' ? '生成中...' : assets.audioStatus === 'success' ? '🔄 重新生成語音' : '🔊 生成語音'}
                </Button>

                {/* Simple Player */}
                {assets.audioUrl && (
                    <div className="bg-white/5 rounded-lg p-3 flex items-center gap-3 mb-4">
                        <button
                            className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center hover:bg-indigo-600 transition-colors"
                            onClick={() => {
                                const audio = new Audio(assets.audioUrl!);
                                audio.play();
                            }}
                        >
                            ▶
                        </button>
                        <div className="flex-1">
                            <div className="text-xs text-gray-400">預覽播放</div>
                            <div className="text-sm text-white font-medium">
                                {assets.audioDuration ? `${assets.audioDuration.toFixed(1)}s` : 'Unknown'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Dictionary Section */}
                <div className="mt-4 border-t border-white/10 pt-4">
                    <div className="flex items-center gap-2 mb-2">
                        <label className="text-xs font-medium text-gray-400">📖 發音字典 (修正錯別字/讀音)</label>
                        <div className="group relative cursor-help">
                            <span className="text-gray-500 text-xs border border-gray-600 rounded-full w-4 h-4 inline-flex items-center justify-center">?</span>
                            <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-800 text-xs text-gray-300 p-2 rounded shadow-xl hidden group-hover:block border border-white/10 z-50">
                                輸入原文和對應的發音替代文字。例如：<br />
                                原文: OMG<br />
                                發音: Oh My God<br />
                                或者中文拼音(加聲調)：<br />
                                原文: 燕少飞<br />
                                發音: (yan4)(shao3)(fei1)
                            </div>
                        </div>
                    </div>

                    {/* List */}
                    {assets.customPronunciations && assets.customPronunciations.length > 0 && (
                        <div className="space-y-2 mb-3">
                            {assets.customPronunciations.map((item, idx) => (
                                <div key={idx} className="flex gap-2 items-center bg-white/5 p-1 rounded">
                                    <div className="flex-1 text-xs text-white px-2 truncate">{item.text}</div>
                                    <span className="text-gray-500 text-xs">→</span>
                                    <div className="flex-1 text-xs text-indigo-300 px-2 truncate">{item.pronunciation}</div>
                                    <button
                                        onClick={() => handleDeleteDictItem(idx)}
                                        className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-red-400"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add Form */}
                    <div className="flex gap-2">
                        <input
                            placeholder="原文 (如: 長期)"
                            className="bg-white/5 border border-white/20 rounded px-2 py-1 text-xs text-white placeholder-gray-500 w-1/3 focus:outline-none focus:border-indigo-500"
                            value={newDictText}
                            onChange={(e) => setNewDictText(e.target.value)}
                        />
                        <input
                            placeholder="發音/拼音 (如: (chang2)(qi1))"
                            className="bg-white/5 border border-white/20 rounded px-2 py-1 text-xs text-white placeholder-gray-500 flex-1 focus:outline-none focus:border-indigo-500"
                            value={newDictPron}
                            onChange={(e) => setNewDictPron(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddDictItem()}
                        />
                        <Button variant="secondary" size="sm" onClick={handleAddDictItem} disabled={!newDictText.trim() || !newDictPron.trim()}>
                            +
                        </Button>
                    </div>
                </div>
            </div>

            {/* Spacer */}
            <div className="flex-1" />
        </div>
    );
}
