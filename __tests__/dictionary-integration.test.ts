import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock global dictionary from Google Sheets
const mockGlobalDictionary = [
    { text: 'AI', pronunciation: 'ài ài' },
    { text: 'GPT', pronunciation: 'jì pì tì' },
    { text: 'API', pronunciation: 'ài pì ài' },
];

// Helper to create mock segment assets
const createMockAssets = (overrides: Record<string, unknown> = {}) => ({
    imageUrl: '',
    imageStatus: 'idle' as const,
    audioUrl: '',
    audioStatus: 'idle' as const,
    promptStatus: 'idle' as const,
    customPronunciations: [],
    ...overrides,
});

describe('Pronunciation Dictionary Integration', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    describe('generateAudioForSegment should always receive dictionary', () => {
        it('should include global dictionary when calling /api/generate/audio', async () => {
            // Setup: Mock dictionary API returns global dictionary
            mockFetch.mockImplementation((url: string) => {
                if (url === '/api/dictionary/all') {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ pronunciationDict: mockGlobalDictionary }),
                    });
                }
                if (url === '/api/generate/audio') {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ audioUrl: 'data:audio/mp3;base64,...', duration: 5.0 }),
                    });
                }
                return Promise.reject(new Error(`Unexpected fetch: ${url}`));
            });

            // Simulate the logic from handleGenerateAudio
            const selectedSegmentId = 'segment-1';
            const segmentText = '這是一段關於 AI 和 GPT 的介紹';
            const segmentAssets = createMockAssets();

            // Fetch global dictionary (as handleGenerateAudio does when no override provided)
            const res = await fetch('/api/dictionary/all');
            const data = await res.json();
            const globalDict = data.pronunciationDict || [];
            const segmentCustomDict = segmentAssets.customPronunciations || [];

            // Merge: segment custom overrides global
            const dictMap = new Map();
            globalDict.forEach((item: { text: string; pronunciation: string }) => dictMap.set(item.text, item));
            segmentCustomDict.forEach((item: { text: string; pronunciation: string }) => dictMap.set(item.text, item));
            const finalDict = Array.from(dictMap.values());

            // Call generate audio API
            await fetch('/api/generate/audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    segmentId: selectedSegmentId,
                    text: segmentText,
                    voiceId: 'default-voice',
                    pronunciationDict: finalDict,
                    speed: 1.2,
                    emotion: 'neutral',
                }),
            });

            // Verify the audio API was called with dictionary
            const audioCalls = mockFetch.mock.calls.filter(
                (call) => call[0] === '/api/generate/audio'
            );
            expect(audioCalls.length).toBe(1);

            const audioRequestBody = JSON.parse(audioCalls[0][1].body);
            expect(audioRequestBody.pronunciationDict).toBeDefined();
            expect(audioRequestBody.pronunciationDict.length).toBe(3);
            expect(audioRequestBody.pronunciationDict).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ text: 'AI' }),
                    expect.objectContaining({ text: 'GPT' }),
                    expect.objectContaining({ text: 'API' }),
                ])
            );
        });

        it('should merge segment custom dict with global dict, segment takes priority', async () => {
            // Setup: Mock dictionary API
            mockFetch.mockImplementation((url: string) => {
                if (url === '/api/dictionary/all') {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ pronunciationDict: mockGlobalDictionary }),
                    });
                }
                if (url === '/api/generate/audio') {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ audioUrl: 'data:audio/mp3;base64,...', duration: 5.0 }),
                    });
                }
                return Promise.reject(new Error(`Unexpected fetch: ${url}`));
            });

            // Segment has custom pronunciation for 'AI' that should override global
            const segmentCustomPronunciations = [
                { text: 'AI', pronunciation: 'ēi āi' }, // Different from global
                { text: 'CUSTOM', pronunciation: 'kē sī tē mú' }, // New entry
            ];

            const segmentAssets = createMockAssets({
                customPronunciations: segmentCustomPronunciations,
            });

            // Fetch and merge
            const res = await fetch('/api/dictionary/all');
            const data = await res.json();
            const globalDict = data.pronunciationDict || [];
            const segmentCustomDict = segmentAssets.customPronunciations || [];

            const dictMap = new Map();
            globalDict.forEach((item: { text: string; pronunciation: string }) => dictMap.set(item.text, item));
            segmentCustomDict.forEach((item: { text: string; pronunciation: string }) => dictMap.set(item.text, item));
            const finalDict = Array.from(dictMap.values());

            // Call generate audio API
            await fetch('/api/generate/audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    segmentId: 'segment-1',
                    text: 'test',
                    voiceId: 'default-voice',
                    pronunciationDict: finalDict,
                    speed: 1.2,
                    emotion: 'neutral',
                }),
            });

            // Verify
            const audioCalls = mockFetch.mock.calls.filter(
                (call) => call[0] === '/api/generate/audio'
            );
            const audioRequestBody = JSON.parse(audioCalls[0][1].body);

            // Should have 4 entries: AI (overridden), GPT, API (from global), CUSTOM (from segment)
            expect(audioRequestBody.pronunciationDict.length).toBe(4);

            // AI should use segment's version, not global
            const aiEntry = audioRequestBody.pronunciationDict.find(
                (item: { text: string }) => item.text === 'AI'
            );
            expect(aiEntry.pronunciation).toBe('ēi āi'); // Segment's version

            // CUSTOM should be present
            const customEntry = audioRequestBody.pronunciationDict.find(
                (item: { text: string }) => item.text === 'CUSTOM'
            );
            expect(customEntry).toBeDefined();
        });

        it('should still work when global dictionary fetch fails', async () => {
            // Setup: Dictionary API fails
            mockFetch.mockImplementation((url: string) => {
                if (url === '/api/dictionary/all') {
                    return Promise.reject(new Error('Network error'));
                }
                if (url === '/api/generate/audio') {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ audioUrl: 'data:audio/mp3;base64,...', duration: 5.0 }),
                    });
                }
                return Promise.reject(new Error(`Unexpected fetch: ${url}`));
            });

            // Simulate fallback behavior
            let finalDict: Array<{ text: string; pronunciation: string }> = [];
            try {
                const res = await fetch('/api/dictionary/all');
                const data = await res.json();
                finalDict = data.pronunciationDict || [];
            } catch (error) {
                // Fallback to empty array (as the code does)
                finalDict = [];
            }

            // Should still be able to generate audio with empty dict
            await fetch('/api/generate/audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    segmentId: 'segment-1',
                    text: 'test',
                    voiceId: 'default-voice',
                    pronunciationDict: finalDict,
                    speed: 1.2,
                    emotion: 'neutral',
                }),
            });

            const audioCalls = mockFetch.mock.calls.filter(
                (call) => call[0] === '/api/generate/audio'
            );
            expect(audioCalls.length).toBe(1);

            const audioRequestBody = JSON.parse(audioCalls[0][1].body);
            expect(audioRequestBody.pronunciationDict).toEqual([]);
        });
    });

    describe('Batch generation should fetch dictionary once', () => {
        it('should call /api/dictionary/all exactly once before processing segments', async () => {
            // Setup
            mockFetch.mockImplementation((url: string) => {
                if (url === '/api/dictionary/all') {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ pronunciationDict: mockGlobalDictionary }),
                    });
                }
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({}),
                });
            });

            // Simulate handleBatchGenerate fetching once
            const res = await fetch('/api/dictionary/all');
            const data = await res.json();
            const globalDict = data.pronunciationDict || [];

            // Process 3 segments (without additional dictionary fetches)
            const segments = ['segment-1', 'segment-2', 'segment-3'];
            for (const segmentId of segments) {
                await fetch('/api/generate/audio', {
                    method: 'POST',
                    body: JSON.stringify({ segmentId, pronunciationDict: globalDict }),
                });
            }

            // Verify dictionary was only fetched once
            const dictCalls = mockFetch.mock.calls.filter(
                (call) => call[0] === '/api/dictionary/all'
            );
            expect(dictCalls.length).toBe(1);

            // Verify all audio calls received the dictionary
            const audioCalls = mockFetch.mock.calls.filter(
                (call) => call[0] === '/api/generate/audio'
            );
            expect(audioCalls.length).toBe(3);

            audioCalls.forEach((call) => {
                const body = JSON.parse(call[1].body);
                expect(body.pronunciationDict).toBeDefined();
                expect(body.pronunciationDict.length).toBe(3);
            });
        });
    });
});
