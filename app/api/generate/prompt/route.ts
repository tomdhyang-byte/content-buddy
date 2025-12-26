import { NextRequest, NextResponse } from 'next/server';
import { generateImagePrompt } from '@/lib/openai';
import { GeneratePromptResponse, ApiError } from '@/types';
import { GeneratePromptRequestSchema } from '@/lib/schemas';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { segmentId, text, style } = GeneratePromptRequestSchema.parse(body);

        const prompt = await generateImagePrompt(text, style);

        return NextResponse.json<GeneratePromptResponse>({
            segmentId,
            prompt,
        });
    } catch (error) {
        console.error('Generate prompt API error:', error);
        if (error && typeof error === 'object' && 'issues' in error) {
            return NextResponse.json<ApiError>(
                { error: 'Validation error', details: JSON.stringify(error) },
                { status: 400 }
            );
        }
        return NextResponse.json<ApiError>(
            {
                error: 'Failed to generate prompt',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
