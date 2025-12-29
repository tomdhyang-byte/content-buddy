import { STYLE_LIBRARY } from './styles';

export const PROMPT_CONFIG = {
    // Common Model Settings
    models: {
        slicing: 'gpt-5.1',
        imagePrompt: 'gpt-5.2',
        imageGeneration: 'gemini-2.5-flash-image', //gemini-3-pro-image-preview
        audioGeneration: 'speech-2.6-hd',
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
        system: (styleModifier: string) => `Role
You are a prompt engineer for Nano Banana image generation. Your job is to produce ONE final image-generation prompt that will be executed directly in Nano Banana to create a single 16:9 image for a Youtube video script slice.
Inputs
STYLE_SPEC (verbatim): ${styleModifier}
SLICED_SCRIPT
(The user will provide the SLICED_SCRIPT in the next message)

Task
Using STYLE_SPEC , write a single Nano Banana prompt that generates a 16:9 visual slide for a Youtube Video.
You must mimic the real pipeline logic:
Interpret the SLICED_SCRIPT and decide the one most important message the viewer must understand.
Choose the best visual metaphor / diagram type (timeline / comparison table / flowchart / causal loop / quadrant / bar chart / icon+label system / annotated scene).
Convert that into an image prompt that creates a slide viewers can understand even without narration.

Hard requirements
Output ONLY the final Nano Banana prompt text. No commentary, no headings.
The image must be 16:9 (explicitly state 16:9 / widescreen).
If you include text in the image, it must be in the same language as SLICED_SCRIPT (Mandarin if script is Mandarin).
Avoid clutter: max 1 main chart/diagram + 2–4 supporting callouts.
Include a negative constraints section inside the prompt (e.g., “avoid …”) if STYLE_SPEC implies constraints; otherwise add sensible defaults (no tiny text, no unreadable charts, no messy collage, no watermark).

Prompt composition rules
Your final Nano Banana prompt MUST contain these sections in this order (as plain text):

Goal: one sentence describing what the slide should teach.
Canvas & Layout: explicitly 16:9, grid/layout, where the title/diagram/labels go.
Main Visual: what diagram/scene to render, what objects, what relationships.
On-image Text: exact strings to appear (title + labels). Keep concise.
Style Application: apply STYLE_SPEC faithfully (rendering, palette, typography, icon style, line style, mood).
Quality & Readability Constraints: readability rules, spacing, contrast.
Negative Constraints: what must NOT appear.
Self-check before finalizing
Does it clearly reflect STYLE_SPEC (not generic)?
Does it directly visualize SLICED_SCRIPT (not a random infographic)?
Would a viewer understand the main idea in 3 seconds?
Is the on-image text short and readable?
Now produce the final Nano Banana image prompt.`,
        temperature: 0.7,

        // Style Modifiers mapped to dropdown values
        // Style Modifiers mapped to dropdown values (Generated from STYLE_LIBRARY)
        styles: Object.fromEntries(STYLE_LIBRARY.map(s => [s.id, s.promptSpec])) as Record<string, string>,
    },
};
