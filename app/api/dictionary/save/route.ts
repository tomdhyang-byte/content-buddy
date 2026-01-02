import { NextResponse } from 'next/server';
import { saveWord, saveWords } from '@/lib/google-sheets';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Handle batch save
        if (body.entries && Array.isArray(body.entries)) {
            await saveWords(body.entries);
            return NextResponse.json({ success: true, savedCount: body.entries.length });
        }

        // Handle single save (backward compatibility)
        const { word, pinyin, rowIndex } = body;

        if (!word || typeof word !== 'string') {
            return NextResponse.json(
                { error: 'Word is required' },
                { status: 400 }
            );
        }

        if (!pinyin || typeof pinyin !== 'string') {
            return NextResponse.json(
                { error: 'Pinyin is required' },
                { status: 400 }
            );
        }

        await saveWord(word.trim(), pinyin.trim(), rowIndex);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Dictionary Save] Error:', error);
        return NextResponse.json(
            { error: 'Failed to save to dictionary' },
            { status: 500 }
        );
    }
}
