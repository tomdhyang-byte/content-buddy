import { NextResponse } from 'next/server';
import { getAllWords } from '@/lib/google-sheets';

export async function GET() {
    try {
        const result = await getAllWords();

        // Convert tone format ("word/pinyin") to PronunciationDictItem format
        const pronunciationDict = result.tone.map((item: string) => {
            const [text, pronunciation] = item.split('/');
            return { text, pronunciation };
        });

        return NextResponse.json({ pronunciationDict });
    } catch (error) {
        console.error('[Dictionary All] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dictionary' },
            { status: 500 }
        );
    }
}
