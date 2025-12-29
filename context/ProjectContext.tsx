'use client';

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { ProjectState, Segment, SegmentAssets, VisualStyle, GenerationStatus, PronunciationDictItem, HeyGenState } from '@/types';

// Default empty segment assets
const createEmptyAssets = (): SegmentAssets => ({
    imagePrompt: null,
    promptStatus: 'idle',
    imageUrl: null,
    imageStatus: 'idle',
    audioUrl: null,
    audioStatus: 'idle',
});

// Default empty heygen state
const createEmptyHeygenState = (): HeyGenState => ({
    mergedAudioUrl: null,
    mergedAudioDuration: null,
    heygenVideoFile: null,
    heygenVideoUrl: null,
});

// Initial state
const initialState: ProjectState = {
    avatar: null,
    avatarPreviewUrl: null,
    voiceId: '',
    visualStyle: 'default',
    script: '',
    segments: [],
    generatedAssets: new Map(),
    heygen: createEmptyHeygenState(),
    currentStep: 1,
};

// Actions
type Action =
    | { type: 'SET_AVATAR'; payload: File | null }
    | { type: 'SET_VOICE_ID'; payload: string }
    | { type: 'SET_VISUAL_STYLE'; payload: VisualStyle }
    | { type: 'SET_SCRIPT'; payload: string }
    | { type: 'SET_SEGMENTS'; payload: Segment[] }
    | { type: 'UPDATE_SEGMENT_TEXT'; payload: { id: string; text: string } }
    | { type: 'MERGE_SEGMENTS'; payload: string }
    | { type: 'SPLIT_SEGMENT'; payload: { id: string; splitIndex: number } }
    | { type: 'UPDATE_ASSET_STATUS'; payload: { segmentId: string; field: keyof SegmentAssets; value: string | GenerationStatus | number | PronunciationDictItem[] | undefined } }
    | { type: 'INITIALIZE_ASSETS' }
    | { type: 'CLEAR_GENERATED_ASSETS' }
    | { type: 'SET_MERGED_AUDIO'; payload: { url: string; duration: number } }
    | { type: 'SET_HEYGEN_VIDEO'; payload: File }
    | { type: 'CLEAR_HEYGEN' }
    | { type: 'SET_CURRENT_STEP'; payload: 1 | 2 | 3 | 4 | 5 }
    | { type: 'RESET_PROJECT' };

// Reducer
function projectReducer(state: ProjectState, action: Action): ProjectState {
    switch (action.type) {
        case 'SET_AVATAR':
            return {
                ...state,
                avatar: action.payload,
                avatarPreviewUrl: action.payload ? URL.createObjectURL(action.payload) : null,
            };
        case 'SET_VOICE_ID':
            return { ...state, voiceId: action.payload };
        case 'SET_VISUAL_STYLE':
            return { ...state, visualStyle: action.payload };
        case 'SET_SCRIPT':
            return { ...state, script: action.payload };
        case 'SET_SEGMENTS':
            return { ...state, segments: action.payload };
        case 'UPDATE_SEGMENT_TEXT':
            return {
                ...state,
                segments: state.segments.map(seg =>
                    seg.id === action.payload.id ? { ...seg, text: action.payload.text } : seg
                ),
            };
        case 'MERGE_SEGMENTS': {
            const index = state.segments.findIndex(seg => seg.id === action.payload);
            if (index === -1 || index >= state.segments.length - 1) return state;

            const current = state.segments[index];
            const next = state.segments[index + 1];
            const merged: Segment = {
                id: current.id,
                text: `${current.text}\n\n${next.text}`,
            };

            const newSegments = [
                ...state.segments.slice(0, index),
                merged,
                ...state.segments.slice(index + 2),
            ];

            return { ...state, segments: newSegments };
        }
        case 'SPLIT_SEGMENT': {
            const index = state.segments.findIndex(seg => seg.id === action.payload.id);
            if (index === -1) return state;

            const segment = state.segments[index];
            const firstText = segment.text.slice(0, action.payload.splitIndex).trim();
            const secondText = segment.text.slice(action.payload.splitIndex).trim();

            if (!firstText || !secondText) return state;

            const firstSegment: Segment = { id: segment.id, text: firstText };
            const secondSegment: Segment = { id: `${segment.id}_split`, text: secondText };

            const newSegments = [
                ...state.segments.slice(0, index),
                firstSegment,
                secondSegment,
                ...state.segments.slice(index + 1),
            ];

            return { ...state, segments: newSegments };
        }
        case 'INITIALIZE_ASSETS': {
            const newAssets = new Map<string, SegmentAssets>();
            state.segments.forEach(seg => {
                newAssets.set(seg.id, createEmptyAssets());
            });
            return { ...state, generatedAssets: newAssets };
        }
        case 'UPDATE_ASSET_STATUS': {
            const newAssets = new Map(state.generatedAssets);
            const currentAssets = newAssets.get(action.payload.segmentId) || createEmptyAssets();
            newAssets.set(action.payload.segmentId, { ...currentAssets, [action.payload.field]: action.payload.value });
            return { ...state, generatedAssets: newAssets };
        }
        case 'CLEAR_GENERATED_ASSETS':
            return { ...state, generatedAssets: new Map() };
        case 'SET_MERGED_AUDIO':
            return {
                ...state,
                heygen: {
                    ...state.heygen,
                    mergedAudioUrl: action.payload.url,
                    mergedAudioDuration: action.payload.duration,
                },
            };
        case 'SET_HEYGEN_VIDEO':
            // Revoke old URL if exists
            if (state.heygen.heygenVideoUrl) {
                URL.revokeObjectURL(state.heygen.heygenVideoUrl);
            }
            return {
                ...state,
                heygen: {
                    ...state.heygen,
                    heygenVideoFile: action.payload,
                    heygenVideoUrl: URL.createObjectURL(action.payload),
                },
            };
        case 'CLEAR_HEYGEN':
            // Revoke URLs
            if (state.heygen.mergedAudioUrl) {
                URL.revokeObjectURL(state.heygen.mergedAudioUrl);
            }
            if (state.heygen.heygenVideoUrl) {
                URL.revokeObjectURL(state.heygen.heygenVideoUrl);
            }
            return { ...state, heygen: createEmptyHeygenState() };
        case 'SET_CURRENT_STEP':
            return { ...state, currentStep: action.payload };
        case 'RESET_PROJECT':
            return initialState;
        default:
            return state;
    }
}

// Context type
interface ProjectContextType {
    state: ProjectState;
    setAvatar: (file: File | null) => void;
    setVoiceId: (voiceId: string) => void;
    setVisualStyle: (style: VisualStyle) => void;
    setScript: (script: string) => void;
    setSegments: (segments: Segment[]) => void;
    updateSegmentText: (id: string, text: string) => void;
    mergeSegments: (id: string) => void;
    splitSegment: (id: string, splitIndex: number) => void;
    updateAssetStatus: (segmentId: string, field: keyof SegmentAssets, value: string | GenerationStatus | number | PronunciationDictItem[] | undefined) => void;
    initializeAssets: () => void;
    clearGeneratedAssets: () => void;
    setMergedAudio: (url: string, duration: number) => void;
    setHeygenVideo: (file: File) => void;
    clearHeygen: () => void;
    setCurrentStep: (step: 1 | 2 | 3 | 4 | 5) => void;
    resetProject: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(projectReducer, initialState);

    const setAvatar = useCallback((file: File | null) => dispatch({ type: 'SET_AVATAR', payload: file }), []);
    const setVoiceId = useCallback((voiceId: string) => dispatch({ type: 'SET_VOICE_ID', payload: voiceId }), []);
    const setVisualStyle = useCallback((style: VisualStyle) => dispatch({ type: 'SET_VISUAL_STYLE', payload: style }), []);
    const setScript = useCallback((script: string) => dispatch({ type: 'SET_SCRIPT', payload: script }), []);
    const setSegments = useCallback((segments: Segment[]) => dispatch({ type: 'SET_SEGMENTS', payload: segments }), []);
    const updateSegmentText = useCallback((id: string, text: string) => dispatch({ type: 'UPDATE_SEGMENT_TEXT', payload: { id, text } }), []);
    const mergeSegments = useCallback((id: string) => dispatch({ type: 'MERGE_SEGMENTS', payload: id }), []);
    const splitSegment = useCallback((id: string, splitIndex: number) => dispatch({ type: 'SPLIT_SEGMENT', payload: { id, splitIndex } }), []);
    const updateAssetStatus = useCallback((segmentId: string, field: keyof SegmentAssets, value: string | GenerationStatus | number | PronunciationDictItem[] | undefined) =>
        dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { segmentId, field, value } }), []);
    const initializeAssets = useCallback(() => dispatch({ type: 'INITIALIZE_ASSETS' }), []);
    const clearGeneratedAssets = useCallback(() => dispatch({ type: 'CLEAR_GENERATED_ASSETS' }), []);
    const setMergedAudio = useCallback((url: string, duration: number) => dispatch({ type: 'SET_MERGED_AUDIO', payload: { url, duration } }), []);
    const setHeygenVideo = useCallback((file: File) => dispatch({ type: 'SET_HEYGEN_VIDEO', payload: file }), []);
    const clearHeygen = useCallback(() => dispatch({ type: 'CLEAR_HEYGEN' }), []);
    const setCurrentStep = useCallback((step: 1 | 2 | 3 | 4 | 5) => dispatch({ type: 'SET_CURRENT_STEP', payload: step }), []);
    const resetProject = useCallback(() => dispatch({ type: 'RESET_PROJECT' }), []);

    const value: ProjectContextType = {
        state,
        setAvatar,
        setVoiceId,
        setVisualStyle,
        setScript,
        setSegments,
        updateSegmentText,
        mergeSegments,
        splitSegment,
        updateAssetStatus,
        initializeAssets,
        clearGeneratedAssets,
        setMergedAudio,
        setHeygenVideo,
        clearHeygen,
        setCurrentStep,
        resetProject,
    };

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
}

export function useProject() {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
}
