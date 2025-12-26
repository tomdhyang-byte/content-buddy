# ContentBuddy 🎬

ContentBuddy 是一個 AI 驅動的文字轉影片自動化工具，專為內容創作者設計。它能將純文字腳本自動轉化為包含分鏡、圖片與語音的完整影片專案。

![Timeline Editor Preview](public/generated/step1_optional_verification.webp)
*(註：此為 Step 1 示意圖，最新 Timeline Editor 請參考實際介面)*

## ✨ 核心功能

*   **智能切分 (Smart Slicing):** 使用 OpenAI GPT-4o 將長篇逐字稿自動切分為適合視覺化的短分鏡。
*   **AI 繪圖 (AI Visuals):** 整合 Google Gemini，根據分鏡內容自動生成高品質圖片。支援多種視覺風格（電影感、動漫風）。
*   **AI 語音 (AI Voiceover):** 整合 Minimax TTS，生成自然流暢的語音旁白。
*   **時間軸編輯器 (Timeline Editor):** 提供類似影片剪輯軟體的直觀介面，視覺化管理圖片、文字與語音軌道。
*   **安全架構:** 全面採用 Zod 驗證與 Base64 數據流，無伺服器狀態依賴，支援 Serverless 部署。

## 🛠️ 技術棧

*   **Framework:** Next.js 14 (App Router)
*   **Styling:** Tailwind CSS
*   **State Management:** React Context + useReducer
*   **Validation:** Zod
*   **AI Services:**
    *   OpenAI (Script Slicing, Prompt Engineering)
    *   Google Gemini (Image Generation)
    *   Minimax (Text-to-Speech)

## 🚀 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

複製 `.env.example` 為 `.env.local` 並填入您的 API Keys：

```bash
cp env.example .env.local
```

```env
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
MINIMAX_API_KEY=ey...
MINIMAX_GROUP_ID=123...
```

### 3. 啟動開發伺服器

```bash
npm run dev
```

瀏覽器打開 [http://localhost:3000](http://localhost:3000) 即可開始使用。

## 📂 專案結構

詳細代碼結構與模組關係請參考 [CODE_STRUCTURE.md](./CODE_STRUCTURE.md)。

## 📝 開發指南

*   **Step 1 (Setup):** `app/page.tsx`
*   **Step 2 (Slicing):** `app/slice/page.tsx`
*   **Step 3 (Timeline):** `app/review/page.tsx` & `components/timeline/*`
*   **Step 4 (Export):** `app/export/page.tsx`

---

Built with ❤️ by Antigravity Agent
