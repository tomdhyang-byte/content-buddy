import { z } from 'zod';

export const SliceRequestSchema = z.object({
    script: z.string().min(10, 'Script must be at least 10 characters long'),
});

export const GeneratePromptRequestSchema = z.object({
    segmentId: z.string(),
    text: z.string().min(1, 'Text cannot be empty'),
    style: z.string().optional().default('default'),
});

export const GenerateImageRequestSchema = z.object({
    segmentId: z.string(),
    prompt: z.string().min(1, 'Prompt cannot be empty'),
});

export const GenerateAudioRequestSchema = z.object({
    segmentId: z.string(),
    text: z.string().min(1, 'Text cannot be empty'),
    voiceId: z.string().min(1, 'Voice ID cannot be empty'),
    pronunciationDict: z.array(z.object({
        text: z.string(),
        pronunciation: z.string(),
    })).optional(),
    speed: z.number().min(0.5).max(2.0).optional().default(1.2),
    emotion: z.string().optional().default('neutral'),
});

export const ExportRequestSchema = z.object({
    avatarUrl: z.string().nullable().optional(),
    segments: z.array(z.object({
        id: z.string(),
        text: z.string(),
        imageUrl: z.string(),
        audioUrl: z.string(),
    })).min(1, 'At least one segment is required'),
});
