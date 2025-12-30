import { NextResponse } from 'next/server';
import { checkWord } from '@/lib/google-sheets';

export async function POST(request: Request) {
    try {
        const { word } = await request.json();

        if (!word || typeof word !== 'string') {
            return NextResponse.json(
                { error: 'Word is required' },
                { status: 400 }
            );
        }

        const existing = await checkWord(word.trim());

        return NextResponse.json({
            exists: !!existing,
            entry: existing,
        });
    } catch (error) {
        console.error('[Dictionary Check] Error:', error);
        return NextResponse.json(
            { error: 'Failed to check dictionary' },
            { status: 500 }
        );
    }
}
