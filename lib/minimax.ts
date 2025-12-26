import * as fs from 'fs';
import * as path from 'path';

// Minimax TTS API client
const MINIMAX_API_URL = 'https://api.minimax.chat/v1/t2a_v2';

interface MinimaxResponse {
    audio_file: string; // base64 encoded audio
    extra_info?: {
        audio_length?: number;
    };
}

export interface PronunciationDictItem {
    text: string;
    pronunciation: string;
}

export async function generateAudio(
    text: string,
    voiceId: string,
    pronunciationDict?: PronunciationDictItem[]
): Promise<{ audioUrl: string; duration: number }> {
    const apiKey = process.env.MINIMAX_API_KEY;
    const groupId = process.env.MINIMAX_GROUP_ID;

    if (!apiKey || !groupId) {
        throw new Error('Missing MINIMAX_API_KEY or MINIMAX_GROUP_ID environment variables');
    }

    // Format dictionary if provided
    let pronunciationDictSetting = undefined;
    if (pronunciationDict && pronunciationDict.length > 0) {
        const toneList = pronunciationDict.map(item => `${item.text}/${item.pronunciation}`);
        pronunciationDictSetting = {
            tone: toneList
        };
    }

    const response = await fetch(`${MINIMAX_API_URL}?GroupId=${groupId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'speech-01-turbo',
            text: text,
            stream: false,
            voice_setting: {
                voice_id: voiceId,
                speed: 1.0,
                vol: 1.0,
                pitch: 0,
            },
            ...(pronunciationDictSetting ? { pronunciation_dict: pronunciationDictSetting } : {}),
            audio_setting: {
                sample_rate: 32000,
                bitrate: 128000,
                format: 'mp3',
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Minimax API error: ${response.status} - ${errorText}`);
    }

    const data: MinimaxResponse = await response.json();

    if (!data.audio_file) {
        throw new Error('No audio file in Minimax response');
    }

    // Estimate duration from text length if not provided
    const duration = data.extra_info?.audio_length || text.length / 5;

    // Return Base64 Data URI
    // Minimax returns raw base64 audio content (mp3)
    return {
        audioUrl: `data:audio/mp3;base64,${data.audio_file}`,
        duration,
    };
}
