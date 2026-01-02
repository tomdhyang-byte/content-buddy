# 🗺️ 專案結構導覽 (Project Map)

ContentBuddy 的程式碼結構設計得很直觀。想知道某個檔案在幹嘛？看這裡就對了。

## 📂 快速導覽 (The Vibe Check)

```graphql
ContentBuddy/
├── app/                  # 🌐 網站的主要頁面 (App Router)
│   ├── page.tsx          # Step 1: 首頁 (輸入腳本、選風格)
│   ├── slice/            # Step 2: 切分頁 (AI 幫你把文章切成段落)
│   ├── review/           # Step 3: 編輯頁 (最重要的編輯器都在這！)
│   ├── heygen/           # Step 4: HeyGen 對嘴頁 (匯出音頻、上傳影片)
│   ├── export/           # Step 5: 匯出頁 (下載影片)
│   └── api/              # ⚡️ 後端 API (處理 AI 請求的地方)
│
├── components/           # 🧩積木元件 (UI Components)
│   ├── timeline/         # 🎬 編輯器專用元件 (時間軸、播放器、設定面板)
│   └── ui/               # 🎨 共用元件 (按鈕、視窗、Loading圈圈)
│
├── lib/                  # 🧠 大腦與工具 (Logic & Services)
│   ├── gemini.ts         # Google Gemini (負責畫圖)
│   ├── minimax.ts        # Minimax (負責講話)
│   └── openai.ts         # OpenAI (負責切分腳本、寫 Prompt)
│
├── config/               # ⚙️ 設定檔
│   ├── prompts.ts        # 🤖 AI 的咒語 (Prompts) 都在這裡管理
│   └── styles.ts         # 🎨 視覺風格的定義 (顏色、參數)
│
└── context/              # 📦 資料倉庫
    └── ProjectContext.tsx # 負責記住整個專案的狀態 (段落、圖片、設定)
```

---

## 🔍 詳細介紹

### 1. 核心頁面 (Pages)
這是一個 Next.js 專案，頁面都放在 `app/` 資料夾。

*   **`app/page.tsx`**: 專案的起點。負責收集使用者的逐字稿、Avatar 圖片和選擇影片風格。
*   **`app/slice/page.tsx`**: **「切分」** 階段。這裡會呼叫 AI 幫你把長文章切成好幾段，你可以手動調整切分結果。
*   **`app/review/page.tsx`**: **「核心編輯器」**。這是最複雜的一頁，包含了預覽播放器、設定面板和時間軸。
*   **`app/heygen/page.tsx`**: **「HeyGen 對嘴」** 階段。匯出合併音頻 (WAV) 或 ZIP，上傳 HeyGen 生成的對嘴影片。
*   **`app/export/page.tsx`**: 最後一步。展示最終成果並提供下載按鈕。

### 2. 編輯器元件 (The Editor)
編輯器 (`app/review/`) 是由這裡的三大金剛組成的 (`components/timeline/`)：

*   **`PreviewPlayer.tsx` (預覽播放器)**: 左上角的螢幕。負責把圖片和聲音串起來播給你看。**最近新增：** 串流預覽播放（邊生成邊觀看，自動等待/續播下一段）。
*   **`ConfigPanel.tsx` (設定面板)**: 右上角的控制台。想重畫圖片、重錄聲音、改 Prompt，都在這裡操作。**最近新增：** 支援即時跟隨播放進度 (Sync with Playback)。
*   **`TimelineContainer.tsx` (時間軸)**: 下方的軌道區。展示每一段的文字、圖片狀態和波形。**最近新增：** 智慧自動捲動 (Smart Autoscroll) 與同步 Header。

### 3. AI 大腦 (The Brains)
所有的 AI 邏輯都封裝在 `lib/`，不讓髒邏輯汙染頁面：

*   **`gemini.ts`**: 專門跟 Google 拿圖片。
*   **`minimax.ts`**: 專門跟 Minimax 拿語音檔 (MP3)。
*   **`openai.ts`**: 專門跟 ChatGPT 聊天 (切分腳本、想 Prompt)。

### 4. 設定中心 (Config)
想改 AI 的行為，不用去翻 code，改這裡就好：

*   **`config/prompts.ts`**: 所有的 System Prompt (系統提示詞) 都在這。如果覺得 AI 畫得不好、切分得太碎，來改這裡的咒語。
*   **`config/styles.ts`**: 定義了「日系動漫」、「美式電影」等風格具體對應到什麼 Prompt 關鍵字。

---

## 💡 開發小撇步 (Tips)

*   **想改 UI 顏色/樣式？** → 去 `components/` 找對應的檔案。
*   **想改 AI 畫出來的風格？** → 去 `config/prompts.ts` 改咒語。
*   **想加新的 AI 模型？** → 去 `lib/` 加新的 service file。
