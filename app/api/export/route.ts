import { NextRequest, NextResponse } from 'next/server';
import { ExportResponse, ApiError } from '@/types';
import { ExportRequestSchema } from '@/lib/schemas';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { segments, avatarUrl } = ExportRequestSchema.parse(body);

        // Validate all segments have required data (already done by Zod schema but double checking logic if needed)
        // Zod manages structure, logic check for valid URL strings is implied

        // Placeholder: In production, this would call the external video assembly API
        console.log('Export request received:', {
            avatarUrl,
            segmentCount: segments.length,
        });

        // Simulate processing delay
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Return placeholder response
        return NextResponse.json<ExportResponse>({
            videoUrl: '/placeholder-video.mp4',
        });
    } catch (error) {
        console.error('Export API error:', error);
        if (error && typeof error === 'object' && 'issues' in error) {
            return NextResponse.json<ApiError>(
                { error: 'Validation error', details: JSON.stringify(error) },
                { status: 400 }
            );
        }
        return NextResponse.json<ApiError>(
            {
                error: 'Failed to export video',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
