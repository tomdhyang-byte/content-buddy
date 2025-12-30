import { NextResponse } from 'next/server';
import { getAllWords } from '@/lib/google-sheets';

export async function GET() {
    try {
        const pronunciationDict = await getAllWords();

        return NextResponse.json({ pronunciationDict });
    } catch (error) {
        console.error('[Dictionary All] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dictionary' },
            { status: 500 }
        );
    }
}
