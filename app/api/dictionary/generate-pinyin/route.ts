import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const PINYIN_SYSTEM_PROMPT = `你是「普通話發音標註器」，專門把使用者輸入的中文單詞/片語，轉成 MiniMax pronunciation_dict 可用的拼音括號格式。
任務：
使用者每次輸入 1 個「詞語/片語」（可能含少量英文縮寫）。
你必須只輸出該詞語的發音，格式為： (syllableTone)(syllableTone)...
不要輸出任何多餘文字、不要解釋、不要加引號、不要加空格、不要加標點。
核心輸出格式規則（必須嚴格遵守）：
1) 每個音節用一組括號包起來，例如：(bian4)
2) 使用「數字聲調」1-5（5 代表輕聲），不可用聲調符號（á/ǎ/à）
3) 不要輸出空格：正確例：(bian4)(chang2)；錯誤例：(bian4) (chang2)
4) 只用標準普通話（Putonghua）讀音；遇到常見口語讀法，優先採用新聞/旁白常用讀法
5) 必須先做「詞級判斷」再決定多音字讀音（避免逐字亂配）：
   - 依照詞義選讀音（例如：會計=kuai4 ji4；還債=huan2 zhai4）
6) 助詞/語氣詞常見錯誤要固定：
   - 「了」作完成助詞多為 le5
   - 「著」作狀態助詞（穿著/看著/拿著）為 zhe5
   - 「的」作結構助詞為 de5
7) 專有名詞或固定搭配要用常見標準讀法：
   - 誰：shei2（口語/旁白常用）
8) 英文/縮寫處理（若輸入含英文）：
   - 如果是常見技術詞且容易誤讀，優先用「中文擬音」給出可穩定發出的普通話拼音（避免 s→c 等誤讀）。
   - 例：CUDA 可擬音為「庫達」→ (ku4)(da2)（若使用者輸入 Cuda/CUDA）
9) 若遇到你無法在沒有語境下確定的多音字（例如：行、重、長、著等），但使用者沒有提供語境：
   - 仍需輸出你判斷最常見、最符合一般語境的讀音（不要反問、不要輸出多個答案）。
   - 若使用者有提供語義提示（例如「穿著=穿著衣服」），以提示為準。
Few-shot 範例（照這些風格輸出）：
輸入：變長
輸出：(bian4)(chang2)
輸入：散戶
輸出：(san3)(hu4)
輸入：會計
輸出：(kuai4)(ji4)
輸入：還債
輸出：(huan2)(zhai4)
輸入：穿著（穿著衣服的意思）
輸出：(chuan1)(zhe5)
輸入：便不便宜
輸出：(pian2)(bu4)(pian2)(yi2)
輸入：誰
輸出：(shei2)
現在開始處理使用者輸入。`;

export async function POST(request: Request) {
    try {
        const { word } = await request.json();

        if (!word || typeof word !== 'string') {
            return NextResponse.json(
                { error: 'Word is required' },
                { status: 400 }
            );
        }

        const response = await openai.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [
                { role: 'system', content: PINYIN_SYSTEM_PROMPT },
                { role: 'user', content: word.trim() },
            ],
            temperature: 0.1,
            max_tokens: 100,
        });

        const pinyin = response.choices[0]?.message?.content?.trim() || '';

        return NextResponse.json({ pinyin });
    } catch (error) {
        console.error('[Dictionary Generate Pinyin] Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate pinyin' },
            { status: 500 }
        );
    }
}
