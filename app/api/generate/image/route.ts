import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/lib/gemini';
import { GenerateImageResponse, ApiError } from '@/types';
import { GenerateImageRequestSchema } from '@/lib/schemas';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { segmentId, prompt } = GenerateImageRequestSchema.parse(body);

        const imageUrl = await generateImage(prompt);

        return NextResponse.json<GenerateImageResponse>({
            segmentId,
            imageUrl,
        });
    } catch (error) {
        console.error('Generate image API error:', error);
        if (error && typeof error === 'object' && 'issues' in error) {
            return NextResponse.json<ApiError>(
                { error: 'Validation error', details: JSON.stringify(error) },
                { status: 400 }
            );
        }
        return NextResponse.json<ApiError>(
            {
                error: 'Failed to generate image',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
