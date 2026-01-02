'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SegmentAssets, GenerationStatus, PronunciationDictItem } from '@/types';
import { Button, Spinner, EditModal, ConfirmModal, VoiceSettingsPopover, IconButton } from '@/components/ui';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';

interface ConfigPanelProps {
    segmentId: string | null;
    segmentIndex: number;
    segmentText: string;
    assets: SegmentAssets | null;
    onTextChange: (text: string) => void;
    onPromptChange: (prompt: string) => void;
    onGeneratePrompt: () => void;
    onGenerateImage: () => void;
    onGenerateAudio: (pronunciationDict?: PronunciationDictItem[]) => void;
    onUpdateDictionary: (items: PronunciationDictItem[]) => void;
    onUpdateVoiceSettings: (key: 'voiceSpeed' | 'voiceEmotion', value: number | string) => void;
}

export function ConfigPanel({
    segmentId,
    segmentIndex,
    segmentText,
    assets,
    onTextChange,
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
    const [isTextModalOpen, setIsTextModalOpen] = useState(false);
    const [editedText, setEditedText] = useState('');

    // Audio Regeneration Prompt state
    const originalTextRef = useRef<string>('');
    const [showAudioRegenConfirm, setShowAudioRegenConfirm] = useState(false);

    // Global Dictionary Sync states
    const [globalDictWord, setGlobalDictWord] = useState('');
    const [globalDictPinyin, setGlobalDictPinyin] = useState('');
    const [globalDictRowIndex, setGlobalDictRowIndex] = useState<number | null>(null);
    const [isCheckingWord, setIsCheckingWord] = useState(false);
    const [isGeneratingPinyin, setIsGeneratingPinyin] = useState(false);
    const [isSavingDict, setIsSavingDict] = useState(false);
    const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
    const [dictSyncMessage, setDictSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Pending entries for batch save
    interface PendingDictEntry {
        word: string;
        pinyin: string;
        rowIndex: number | null;
        isExisting: boolean;
    }
    const [pendingEntries, setPendingEntries] = useState<PendingDictEntry[]>([]);

    // Sync prompt from assets
    useEffect(() => {
        if (assets?.imagePrompt) {
            setEditedPrompt(assets.imagePrompt);
        } else {
            setEditedPrompt('');
        }
    }, [assets?.imagePrompt]);

    // Sync text state
    useEffect(() => {
        setEditedText(segmentText);
    }, [segmentText]);

    const handlePromptSave = (newPrompt: string) => {
        setEditedPrompt(newPrompt);
        onPromptChange(newPrompt);
    };

    const handleTextSave = (newText: string) => {
        setEditedText(newText);
        onTextChange(newText);

        // Check if text changed
        if (newText.trim() !== originalTextRef.current.trim()) {
            setShowAudioRegenConfirm(true);
        }
    };

    // Global Dictionary Sync handlers
    const handleCheckAndGeneratePinyin = async () => {
        if (!globalDictWord.trim()) return;

        setIsCheckingWord(true);
        setDictSyncMessage(null);

        try {
            // Check if word exists
            const checkRes = await fetch('/api/dictionary/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word: globalDictWord.trim() }),
            });
            const checkData = await checkRes.json();

            if (checkData.exists) {
                // Word exists, ask for overwrite confirmation
                setGlobalDictRowIndex(checkData.entry.rowIndex);
                setGlobalDictPinyin(checkData.entry.pinyin);
                setShowOverwriteConfirm(true);
                setIsCheckingWord(false);
                return;
            }

            // Word doesn't exist, generate pinyin
            setGlobalDictRowIndex(null);
            await generatePinyinForWord();
        } catch (error) {
            setDictSyncMessage({ type: 'error', text: '檢查字詞失敗' });
        } finally {
            setIsCheckingWord(false);
        }
    };

    const generatePinyinForWord = async () => {
        setIsGeneratingPinyin(true);
        try {
            const res = await fetch('/api/dictionary/generate-pinyin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word: globalDictWord.trim() }),
            });
            const data = await res.json();
            setGlobalDictPinyin(data.pinyin || '');
        } catch (error) {
            setDictSyncMessage({ type: 'error', text: 'AI 拼音生成失敗' });
        } finally {
            setIsGeneratingPinyin(false);
        }
    };

    const handleOverwriteConfirm = async () => {
        setShowOverwriteConfirm(false);
        await generatePinyinForWord();
    };

    const handleAddToPending = () => {
        if (!globalDictWord.trim() || !globalDictPinyin.trim()) return;

        const newEntry: PendingDictEntry = {
            word: globalDictWord.trim(),
            pinyin: globalDictPinyin.trim(),
            rowIndex: globalDictRowIndex,
            isExisting: !!globalDictRowIndex,
        };

        // Check if word already in pending, update if so
        const existingIdx = pendingEntries.findIndex(e => e.word === newEntry.word);
        if (existingIdx >= 0) {
            const newPending = [...pendingEntries];
            newPending[existingIdx] = newEntry;
            setPendingEntries(newPending);
        } else {
            setPendingEntries([...pendingEntries, newEntry]);
        }

        // Clear inputs
        setGlobalDictWord('');
        setGlobalDictPinyin('');
        setGlobalDictRowIndex(null);
    };

    const handleRemovePending = (index: number) => {
        setPendingEntries(pendingEntries.filter((_, i) => i !== index));
    };

    const handleBatchSave = async () => {
        if (pendingEntries.length === 0) return;

        setIsSavingDict(true);
        setDictSyncMessage(null);

        try {
            // Batch Save to Google Sheet
            const saveRes = await fetch('/api/dictionary/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entries: pendingEntries.map(e => ({
                        word: e.word,
                        pinyin: e.pinyin,
                        rowIndex: e.rowIndex
                    }))
                }),
            });

            if (!saveRes.ok) {
                throw new Error('Failed to save');
            }

            const data = await saveRes.json();

            // Update local dictionary for current segment
            // We need to merge all new entries into the current segment's pronunciations
            const currentItems = [...(assets?.customPronunciations || [])];

            pendingEntries.forEach(entry => {
                const existingIndex = currentItems.findIndex(item => item.text === entry.word);
                if (existingIndex >= 0) {
                    currentItems[existingIndex].pronunciation = entry.pinyin;
                } else {
                    currentItems.push({ text: entry.word, pronunciation: entry.pinyin });
                }
            });

            onUpdateDictionary(currentItems);

            setDictSyncMessage({ type: 'success', text: `成功保存 ${pendingEntries.length} 筆資料！` });

            // Trigger audio regeneration ONLY ONCE with the updated dictionary
            // Call without args to force fetching fresh global dictionary
            onGenerateAudio();

            // Clear pending list
            setPendingEntries([]);
        } catch (error) {
            setDictSyncMessage({ type: 'error', text: '保存失敗' });
        } finally {
            setIsSavingDict(false);
        }
    };

    const getStatusBadge = (status: GenerationStatus) => {
        switch (status) {
            case 'success':
                return <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-sm rounded-full">✓</span>;
            case 'loading':
                return <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-sm rounded-full">...</span>;
            case 'error':
                return <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-sm rounded-full">✗</span>;
            default:
                return <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-sm rounded-full">○</span>;
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

            <PanelGroup orientation="vertical" className="flex-1 min-h-0 bg-transparent p-1">
                {/* Text Content Panel (Top) */}
                <Panel defaultSize={60} minSize="30">
                    <div className="h-full p-1">
                        <div className="h-full w-full bg-gray-900/40 border border-white/10 rounded-xl flex flex-col min-h-0 overflow-hidden shadow-lg">
                            <div className="px-4 py-3 flex flex-col min-h-0 h-full">
                                <div className="flex items-center justify-between mb-2 flex-shrink-0">
                                    <label className="block text-sm font-medium text-gray-400">📝 文字內容</label>
                                </div>
                                <div
                                    className="bg-white/5 rounded-lg p-3 text-gray-300 text-base leading-relaxed flex-1 overflow-y-auto hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-white/10 custom-scrollbar"
                                    onClick={() => {
                                        originalTextRef.current = segmentText;
                                        setIsTextModalOpen(true);
                                    }}
                                    title="點擊編輯文字"
                                >
                                    {segmentText}
                                </div>
                            </div>
                        </div>
                    </div>
                </Panel>

                {/* Vertical Resize Handle */}
                <PanelResizeHandle className="h-2 flex items-center justify-center bg-transparent transition-colors cursor-row-resize group outline-none -my-1 z-10">
                    <div className="w-8 h-1 rounded-full bg-white/20 group-hover:bg-indigo-500/80 transition-colors backdrop-blur-sm" />
                </PanelResizeHandle>

                {/* Settings Panel (Bottom) */}
                <Panel defaultSize={40} minSize="20">
                    <PanelGroup orientation="horizontal" className="h-full">
                        {/* Image Config (Left) */}
                        <Panel defaultSize={50} minSize="30">
                            <div className="h-full p-1">
                                <div className="h-full w-full bg-gray-900/40 border border-white/10 rounded-xl flex flex-col overflow-hidden shadow-lg">
                                    <div className="h-full p-4 overflow-y-auto custom-scrollbar flex flex-col">
                                        <div className="flex items-center justify-between mb-2 flex-shrink-0">
                                            <label className="text-sm font-medium text-gray-400">🎨 Image</label>
                                            {getStatusBadge(assets.promptStatus)}
                                        </div>

                                        <div className="space-y-3 flex-1">
                                            {/* Compact Prompt View */}
                                            <div
                                                onClick={() => setIsPromptModalOpen(true)}
                                                className="bg-white/5 rounded-lg px-3 py-2 text-sm text-gray-400 cursor-pointer hover:bg-white/10 transition-colors truncate border border-transparent hover:border-white/10"
                                                title={editedPrompt}
                                            >
                                                {assets.promptStatus === 'loading' ? (
                                                    <span className="flex items-center gap-2"><Spinner size="sm" /> 生成 Prompt...</span>
                                                ) : (
                                                    editedPrompt || '點擊編輯 Prompt...'
                                                )}
                                            </div>

                                            {/* Image Actions */}
                                            <div className="flex gap-2">
                                                <Button
                                                    variant={assets.imagePrompt ? 'secondary' : 'primary'}
                                                    size="sm"
                                                    onClick={onGeneratePrompt}
                                                    disabled={assets.promptStatus === 'loading'}
                                                    className="flex-1 text-sm"
                                                    title="AI 自動生成 Prompt"
                                                >
                                                    {assets.promptStatus === 'loading' ? (
                                                        <><Spinner size="sm" /> 生成中...</>
                                                    ) : (
                                                        assets.imagePrompt ? (
                                                            <>🔄 重新生成 Prompt</>
                                                        ) : (
                                                            <>✨ 生成 Prompt</>
                                                        )
                                                    )}
                                                </Button>

                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={onGenerateImage}
                                                    disabled={!assets.imagePrompt || assets.imageStatus === 'loading'}
                                                >
                                                    {assets.imageStatus === 'loading' ? (
                                                        <><Spinner size="sm" /> 繪製中...</>
                                                    ) : (
                                                        assets.imageUrl ? '🔄 重新生成圖片' : '🖼️ 生成圖片'
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Panel>

                        {/* Horizontal Resize Handle */}
                        <PanelResizeHandle className="w-2 flex items-center justify-center bg-transparent transition-colors cursor-col-resize group outline-none -mx-1 z-10">
                            <div className="w-1 h-8 rounded-full bg-white/20 group-hover:bg-indigo-500/80 transition-colors backdrop-blur-sm" />
                        </PanelResizeHandle>

                        {/* Audio Config (Right) */}
                        <Panel defaultSize={50} minSize="30">
                            <div className="h-full p-1">
                                <div className="h-full w-full bg-gray-900/40 border border-white/10 rounded-xl flex flex-col overflow-hidden shadow-lg">
                                    <div className="h-full p-4 overflow-y-auto custom-scrollbar flex flex-col bg-black/10">
                                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                            <div className="flex items-center gap-2">
                                                <label className="text-sm font-medium text-gray-400">🔊 語音設定</label>
                                                {getStatusBadge(assets.audioStatus)}
                                            </div>
                                            {/* New Popover for Settings & Regenerate */}
                                            <VoiceSettingsPopover
                                                speed={assets.voiceSpeed || 1.2}
                                                emotion={assets.voiceEmotion || 'neutral'}
                                                onSpeedChange={(v) => onUpdateVoiceSettings('voiceSpeed', v)}
                                                onEmotionChange={(v) => onUpdateVoiceSettings('voiceEmotion', v)}
                                                onRegenerate={() => onGenerateAudio()}
                                                isRegenerating={assets.audioStatus === 'loading'}
                                            />
                                        </div>

                                        {/* Dictionary Section */}
                                        <div className="flex-1 flex flex-col min-h-0">
                                            <label className="block text-sm font-medium text-gray-400 mb-2">📖 發音字典（同步雲端）</label>

                                            {/* Word Input */}
                                            <div className="flex gap-1 mb-2 flex-shrink-0">
                                                <input
                                                    type="text"
                                                    placeholder="輸入字詞"
                                                    value={globalDictWord}
                                                    onChange={(e) => setGlobalDictWord(e.target.value)}
                                                    className="flex-1 bg-white/5 border border-white/20 rounded px-2 py-1.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                                                />
                                                <Button
                                                    size="sm"
                                                    onClick={handleCheckAndGeneratePinyin}
                                                    disabled={isCheckingWord || isGeneratingPinyin || !globalDictWord.trim()}
                                                    className="whitespace-nowrap"
                                                >
                                                    {isCheckingWord || isGeneratingPinyin ? (
                                                        <Spinner size="sm" />
                                                    ) : (
                                                        '✨ AI'
                                                    )}
                                                </Button>
                                            </div>

                                            {/* Pinyin Result & Add */}
                                            {globalDictPinyin && (
                                                <div className="mb-3 p-2 bg-white/5 rounded border border-white/10 animate-in fade-in slide-in-from-top-1 flex-shrink-0">
                                                    <label className="block text-[10px] text-gray-500 mb-1">拼音結果</label>
                                                    <div className="flex gap-1 mb-1">
                                                        <input
                                                            type="text"
                                                            value={globalDictPinyin}
                                                            onChange={(e) => setGlobalDictPinyin(e.target.value)}
                                                            className="flex-1 bg-black/20 border border-white/10 rounded px-2 py-1.5 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                                                        />
                                                    </div>
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={handleAddToPending}
                                                        className="w-full bg-green-600 hover:bg-green-700 from-transparent to-transparent shadow-none border-0"
                                                    >
                                                        ➕ 加入待處理清單
                                                    </Button>
                                                    {globalDictRowIndex && (
                                                        <p className="text-[10px] text-yellow-500 mt-1 text-center">⚠️ 將覆蓋舊發音</p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Pending List */}
                                            {pendingEntries.length > 0 && (
                                                <div className="mb-3 flex-1 flex flex-col min-h-0">
                                                    <div className="flex items-center justify-between text-[10px] text-gray-400 px-1 mb-1 flex-shrink-0">
                                                        <span>待處理 ({pendingEntries.length})</span>
                                                        <Button
                                                            variant="link"
                                                            size="sm"
                                                            onClick={() => setPendingEntries([])}
                                                            className="text-red-400 hover:text-red-300 h-auto p-0"
                                                        >
                                                            清空
                                                        </Button>
                                                    </div>
                                                    <div className="flex-1 min-h-0 overflow-y-auto space-y-1 custom-scrollbar pr-1 border border-white/10 rounded p-1">
                                                        {pendingEntries.map((entry, idx) => (
                                                            <div key={`${entry.word}-${idx}`} className="flex items-center justify-between bg-white/5 px-2 py-1.5 rounded border border-white/10 group hover:border-white/20 transition-colors">
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="text-xs text-white truncate">{entry.word}</span>
                                                                    <span className="text-[10px] text-gray-500 font-mono truncate">{entry.pinyin}</span>
                                                                </div>
                                                                <IconButton
                                                                    icon="🗑️"
                                                                    variant="danger"
                                                                    size="sm"
                                                                    onClick={() => handleRemovePending(idx)}
                                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {/* Batch Save Button */}
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="w-full mt-2 flex-shrink-0"
                                                        onClick={handleBatchSave}
                                                        disabled={isSavingDict}
                                                    >
                                                        {isSavingDict ? (
                                                            <><Spinner size="sm" /> 保存中...</>
                                                        ) : (
                                                            `📥 保存並重成語音`
                                                        )}
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Status Message */}
                                            {dictSyncMessage && (
                                                <div className={`text-[10px] p-2 rounded flex-shrink-0 ${dictSyncMessage.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                    {dictSyncMessage.text}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Panel>
                    </PanelGroup>
                </Panel>
            </PanelGroup>

            {/* Edit Modal for Prompt */}
            <EditModal
                isOpen={isPromptModalOpen}
                title="編輯 Image Prompt"
                value={editedPrompt}
                onChange={handlePromptSave}
                onClose={() => setIsPromptModalOpen(false)}
                placeholder="輸入或編輯用於生成圖片的 Prompt..."
            />

            {/* Edit Modal for Text */}
            <EditModal
                isOpen={isTextModalOpen}
                title="編輯段落文字"
                value={editedText}
                onChange={handleTextSave}
                onClose={() => setIsTextModalOpen(false)}
                placeholder="輸入段落文字..."
                rows={6}
            />

            {/* Overwrite Confirm Modal */}
            <ConfirmModal
                isOpen={showOverwriteConfirm}
                onClose={() => setShowOverwriteConfirm(false)}
                onConfirm={handleOverwriteConfirm}
                title="字詞已存在"
                message={`「${globalDictWord}」已存在於字典中（拼音：${globalDictPinyin}）。是否要重新生成拼音並覆蓋？`}
                confirmText="重新生成"
                cancelText="取消"
            />

            {/* Audio Regeneration Confirm Modal */}
            <ConfirmModal
                isOpen={showAudioRegenConfirm}
                onClose={() => setShowAudioRegenConfirm(false)}
                onConfirm={() => {
                    setShowAudioRegenConfirm(false);
                    onGenerateAudio();
                }}
                title="文字已更改"
                message="是否要重新生成語音？"
                confirmText="是，重新生成"
                cancelText="不用"
            />
        </div>
    );
}
