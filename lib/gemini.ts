import { GoogleGenAI, Modality } from '@google/genai';

import { PROMPT_CONFIG } from '@/config/prompts';

// Initialize Gemini client
const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
});

export async function generateImage(prompt: string): Promise<string> {
    const response = await genAI.models.generateContent({
        model: PROMPT_CONFIG.models.imageGeneration,
        contents: prompt,
        config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
    });

    // Extract image from response
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
        throw new Error('No response from Gemini');
    }

    for (const part of parts) {
        if (part.inlineData) {
            const imageData = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || 'image/png';

            // Return Base64 Data URI directly
            return `data:${mimeType};base64,${imageData}`;
        }
    }

    throw new Error('No image found in Gemini response');
}
