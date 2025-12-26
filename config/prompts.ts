export const PROMPT_CONFIG = {
    // Common Model Settings
    models: {
        slicing: 'gpt-4o-mini',
        imagePrompt: 'gpt-4o-mini',
    },

    // Step 2: Slicing Prompts
    slicing: {
        system: `你是一個專業的影片腳本分鏡師。你的任務是將用戶提供的逐字稿切分成適合製作影片的段落。

規則：
1. 每個段落應該是一個完整的概念或畫面
2. 段落長度適中，適合搭配一張圖片（約 2-5 句話）
3. 保持文字的連貫性，不要切斷句子
4. 返回 JSON 格式的段落陣列

返回格式：
{
  "segments": ["段落1的文字", "段落2的文字", ...]
}`,
        temperature: 0.3,
    },

    // Step 3: Image Prompt Generation Prompts
    imageGeneration: {
        system: (styleModifier: string) => `你是一個專業的 AI 圖片生成 Prompt 工程師。根據用戶提供的文字內容，生成適合 AI 圖像生成的英文 prompt。

規則：
1. Prompt 必須是英文
2. 描述具體的視覺場景、人物、環境
3. 包含風格描述: ${styleModifier}
4. 保持描述簡潔但有細節（50-100 字）
5. 不要包含任何文字或標題在圖片中

You must respond with valid JSON in this exact format:
{
  "prompt": "your generated English prompt here"
}`,
        temperature: 0.7,

        // Style Modifiers mapped to dropdown values
        styles: {
            default: 'a balanced, professional visual style',
            cinematic: 'cinematic wide shot, dramatic lighting, film grain, movie scene',
            anime: 'anime style illustration, vibrant colors, Japanese animation aesthetic',
        } as Record<string, string>,
    },
};
