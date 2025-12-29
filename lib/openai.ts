import OpenAI from 'openai';
import { PROMPT_CONFIG } from '@/config/prompts';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function sliceScript(script: string): Promise<string[]> {
    const response = await openai.chat.completions.create({
        model: PROMPT_CONFIG.models.slicing,
        messages: [
            {
                role: 'system',
                content: PROMPT_CONFIG.slicing.system,
            },
            {
                role: 'user',
                content: script,
            },
        ],
        response_format: { type: 'json_object' },
        temperature: PROMPT_CONFIG.slicing.temperature,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
        throw new Error('OpenAI returned empty response');
    }

    const parsed = JSON.parse(content);
    return parsed.segments as string[];
}

export async function generateImagePrompt(
    text: string,
    style: string
): Promise<string> {
    const styleModifier = PROMPT_CONFIG.imageGeneration.styles[style] ||
        PROMPT_CONFIG.imageGeneration.styles.default;

    console.log('[generateImagePrompt] Input text:', text.slice(0, 50) + '...');
    console.log('[generateImagePrompt] Style:', style, '->', styleModifier);

    const response = await openai.chat.completions.create({
        model: PROMPT_CONFIG.models.imagePrompt,
        messages: [
            {
                role: 'system',
                content: PROMPT_CONFIG.imageGeneration.system(styleModifier),
            },
            {
                role: 'user',
                content: text,
            },
        ],
        temperature: PROMPT_CONFIG.imageGeneration.temperature,
    });

    const content = response.choices[0]?.message?.content;
    console.log('[generateImagePrompt] Raw response:', content);

    if (!content) {
        throw new Error('OpenAI returned empty response');
    }

    return content;
}

