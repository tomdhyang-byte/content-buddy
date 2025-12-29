export interface VisualStyleDefinition {
    id: string;
    label: string;
    description: string;
    promptSpec: string;
}

export const STYLE_LIBRARY: VisualStyleDefinition[] = [
    {
        id: 'default',
        label: '預設風格',
        description: '平衡的視覺風格',
        promptSpec: 'a balanced, professional visual style',
    },
    {
        id: 'cinematic',
        label: '電影風格',
        description: '戲劇性的電影感畫面',
        promptSpec: 'cinematic wide shot, dramatic lighting, film grain, movie scene',
    },
    {
        id: 'anime',
        label: '動漫風格',
        description: '日系動漫插畫風格',
        promptSpec: 'anime style illustration, vibrant colors, Japanese animation aesthetic',
    },
    {
        id: 'DaVinci',
        label: '達文西風格',
        description: '達文西風格（Jay的護城河影片）',
        promptSpec: 'Hand-drawn sketch, ballpoint pen or ink, on textured beige paper; Da Vinci notebook vibe.',
    },
    {
        id: 'The Intellectual Collage',
        label: '藝術拼貼風格',
        description: '藝術拼貼風格（Jay的說書影片）',
        promptSpec: 'in the style of mixed media collage art, vintage swiss design, cutout aesthetics, textured paper background, grain, muted bauhaus color palette, minimalist composition, conceptual abstraction, high quality editorial illustration',
    },
];
