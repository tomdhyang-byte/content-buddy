import { NextRequest, NextResponse } from 'next/server';
import { sliceScript } from '@/lib/openai';
import { SliceResponse, ApiError, Segment } from '@/types';
import { SliceRequestSchema } from '@/lib/schemas';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate with Zod
        const { script } = SliceRequestSchema.parse(body);

        const segmentTexts = await sliceScript(script);

        const segments: Segment[] = segmentTexts.map((text, index) => ({
            id: `seg_${uuidv4().slice(0, 8)}`,
            text: text.trim(),
        }));

        return NextResponse.json<SliceResponse>({ segments });
    } catch (error) {
        console.error('Slice API error:', error);

        // Handle Zod errors
        if (error && typeof error === 'object' && 'issues' in error) {
            return NextResponse.json<ApiError>(
                { error: 'Validation error', details: JSON.stringify(error) },
                { status: 400 }
            );
        }

        return NextResponse.json<ApiError>(
            {
                error: 'Failed to slice script',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
