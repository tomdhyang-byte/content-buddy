'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useProject } from '@/context/ProjectContext';
import { Button, Card } from '@/components/ui';
import { VisualStyle } from '@/types';

const VISUAL_STYLES: { value: VisualStyle; label: string; description: string }[] = [
  { value: 'default', label: '預設風格', description: '平衡的視覺風格' },
  { value: 'cinematic', label: '電影風格', description: '戲劇性的電影感畫面' },
  { value: 'anime', label: '動漫風格', description: '日系動漫插畫風格' },
];

export default function SetupPage() {
  const router = useRouter();
  const {
    state,
    setAvatar,
    setVoiceId,
    setVisualStyle,
    setScript,
    setCurrentStep,
  } = useProject();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);

  const handleAvatarSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, avatar: '請上傳圖片檔案 (jpg, png)' }));
      return;
    }
    setErrors(prev => ({ ...prev, avatar: '' }));
    setAvatar(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleAvatarSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // if (!state.avatar) {
    //   newErrors.avatar = '請上傳頭像圖片';
    // }
    // if (!state.voiceId.trim()) {
    //   newErrors.voiceId = '請輸入 Minimax Voice ID';
    // }
    if (!state.script.trim()) {
      newErrors.script = '請輸入影片逐字稿';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    setCurrentStep(2);
    router.push('/slice');
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
            ContentBuddy
          </h1>
          <p className="text-gray-400 text-lg">
            AI 驅動的文字轉影片工具
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[1, 2, 3, 4].map((step) => (
            <React.Fragment key={step}>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${step === 1
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-white/10 text-gray-500'
                  }`}
              >
                {step}
              </div>
              {step < 4 && (
                <div className="w-12 h-0.5 bg-white/10" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-2">
            Step 1: 專案設定
          </h2>
          <p className="text-gray-400">
            上傳頭像、設定語音 ID，並貼上你的影片腳本
          </p>
        </div>

        {/* Form */}
        <Card className="space-y-8">
          {/* Avatar Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              頭像圖片 <span className="text-gray-500 text-xs">(選填)</span>
            </label>
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${isDragging
                ? 'border-indigo-500 bg-indigo-500/10'
                : errors.avatar
                  ? 'border-red-500/50 bg-red-500/5'
                  : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarSelect(file);
                }}
              />

              {state.avatarPreviewUrl ? (
                <div className="flex items-center justify-center gap-4">
                  <img
                    src={state.avatarPreviewUrl}
                    alt="Avatar preview"
                    className="w-24 h-24 rounded-full object-cover border-2 border-white/20"
                  />
                  <div className="text-left">
                    <p className="text-white font-medium">{state.avatar?.name}</p>
                    <p className="text-gray-400 text-sm">點擊或拖放以更換</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-300 mb-1">拖放圖片至此，或點擊選擇</p>
                  <p className="text-gray-500 text-sm">支援 JPG、PNG 格式</p>
                </>
              )}
            </div>
            {errors.avatar && (
              <p className="mt-2 text-sm text-red-400">{errors.avatar}</p>
            )}
          </div>

          {/* Voice ID */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Minimax Voice ID <span className="text-gray-500 text-xs">(選填)</span>
            </label>
            <input
              type="text"
              value={state.voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              placeholder="貼上你的 Voice ID..."
              className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${errors.voiceId
                ? 'border-red-500/50 focus:ring-red-500/50'
                : 'border-white/10 focus:ring-indigo-500/50 focus:border-indigo-500/50'
                }`}
            />
            {errors.voiceId && (
              <p className="mt-2 text-sm text-red-400">{errors.voiceId}</p>
            )}
          </div>

          {/* Visual Style */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              視覺風格
            </label>
            <div className="grid grid-cols-3 gap-3">
              {VISUAL_STYLES.map((style) => (
                <button
                  key={style.value}
                  type="button"
                  onClick={() => setVisualStyle(style.value)}
                  className={`p-4 rounded-xl border text-left transition-all ${state.visualStyle === style.value
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                    }`}
                >
                  <p className={`font-medium ${state.visualStyle === style.value ? 'text-indigo-400' : 'text-white'
                    }`}>
                    {style.label}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{style.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Script Textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              影片逐字稿 <span className="text-red-400">*</span>
            </label>
            <textarea
              value={state.script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="貼上你的完整逐字稿..."
              rows={10}
              className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all resize-none ${errors.script
                ? 'border-red-500/50 focus:ring-red-500/50'
                : 'border-white/10 focus:ring-indigo-500/50 focus:border-indigo-500/50'
                }`}
            />
            {errors.script && (
              <p className="mt-2 text-sm text-red-400">{errors.script}</p>
            )}
            <div className="flex justify-between mt-2 text-sm text-gray-500">
              <span>字數：{state.script.length}</span>
            </div>
          </div>

          {/* Next Button */}
          <div className="pt-4">
            <Button
              size="lg"
              className="w-full"
              onClick={handleNext}
            >
              下一步：切分段落
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Button>
          </div>
        </Card>

        {/* Footer Note */}
        <p className="text-center text-gray-500 text-sm mt-8">
          ⚠️ MVP 版本：重新整理頁面將遺失所有進度
        </p>
      </div>
    </div>
  );
}
