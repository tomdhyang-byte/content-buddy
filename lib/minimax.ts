import * as fs from 'fs';
import * as path from 'path';
import { PROMPT_CONFIG } from '@/config/prompts';

// Minimax TTS API client
const MINIMAX_API_URL = 'https://api.minimax.io/v1/t2a_v2';

interface MinimaxResponse {
    // api.minimax.chat format
    audio_file?: string; // base64 encoded audio
    // api.minimax.io format  
    data?: {
        audio?: string; // hex encoded audio
        status?: number;
    };
    extra_info?: {
        audio_length?: number;
        audio_sample_rate?: number;
        audio_size?: number;
    };
    base_resp?: {
        status_code?: number;
        status_msg?: string;
    };
}

export interface PronunciationDictItem {
    text: string;
    pronunciation: string;
}

export async function generateAudio(
    text: string,
    voiceId: string,
    pronunciationDict?: PronunciationDictItem[],
    speed: number = 1.2,
    emotion: string = 'neutral'
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
            model: PROMPT_CONFIG.models.audioGeneration,
            text: text,
            stream: false,
            voice_setting: {
                voice_id: voiceId,
                speed: speed,
                vol: 1.0,
                pitch: 0,
                emotion: emotion,
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

    // Debug logging
    console.log('[Minimax] Response status:', data.base_resp?.status_code, data.base_resp?.status_msg);

    // Check for API error
    if (data.base_resp?.status_code !== 0 && data.base_resp?.status_code !== undefined) {
        throw new Error(`Minimax API error: ${data.base_resp.status_code} - ${data.base_resp.status_msg}`);
    }

    // Extract audio data - support both formats
    let audioBase64: string | null = null;

    if (data.audio_file) {
        // api.minimax.chat format: already base64
        audioBase64 = data.audio_file;
    } else if (data.data?.audio) {
        // api.minimax.io format: hex encoded, need to convert to base64
        const hexString = data.data.audio;
        const bytes = new Uint8Array(hexString.length / 2);
        for (let i = 0; i < hexString.length; i += 2) {
            bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
        }
        audioBase64 = Buffer.from(bytes).toString('base64');
    }

    if (!audioBase64) {
        throw new Error(`No audio file in Minimax response. Raw response: ${JSON.stringify(data)}`);
    }

    // Get duration from extra_info (in milliseconds for api.minimax.io)
    const durationMs = data.extra_info?.audio_length || 0;
    const duration = durationMs > 100 ? durationMs / 1000 : (durationMs || text.length / 5);

    // Return Base64 Data URI
    return {
        audioUrl: `data:audio/mp3;base64,${audioBase64}`,
        duration,
    };
}
