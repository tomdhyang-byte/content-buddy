import { NextRequest, NextResponse } from 'next/server';
import { generateAudio } from '@/lib/minimax';
import { GenerateAudioResponse, ApiError } from '@/types';
import { GenerateAudioRequestSchema } from '@/lib/schemas';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { segmentId, text, voiceId, pronunciationDict } = GenerateAudioRequestSchema.parse(body);

        const result = await generateAudio(text, voiceId, pronunciationDict);

        return NextResponse.json<GenerateAudioResponse>({
            segmentId,
            audioUrl: result.audioUrl,
            duration: result.duration,
        });
    } catch (error) {
        console.error('Generate audio API error:', error);
        if (error && typeof error === 'object' && 'issues' in error) {
            return NextResponse.json<ApiError>(
                { error: 'Validation error', details: JSON.stringify(error) },
                { status: 400 }
            );
        }
        return NextResponse.json<ApiError>(
            {
                error: 'Failed to generate audio',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
