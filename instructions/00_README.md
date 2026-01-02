# 📖 Instructions for AI Agents

這個資料夾包含給 AI Agent 的專案說明文件。當你開始協助這個專案時，請依序閱讀以下文件。

## 🗂️ 文件清單

| 檔案 | 用途 | 優先順序 |
|------|------|---------|
| `01_project_architecture.md` | 專案架構、技術棧、資料流 | 必讀 |
| `99_lessons_learned.md` | 踩過的坑、設計決策、注意事項 | 強烈建議 |

## ⚡ 快速上手

1. 本專案是一個 **Next.js 14 App Router** 應用
2. 主要功能：將文字腳本自動轉換為影片（AI 圖片 + AI 語音）
3. 核心路徑：`/` → `/slice` → `/review` → `/heygen` → `/export`

## 🛠️ 常用指令

- `npm run dev` — 啟動開發伺服器
- `npm run test` — 執行測試
- `npm run build` — 建置生產版本

## 📌 重要提醒

- 修改前請先閱讀 `99_lessons_learned.md`，避免重複踩坑
- API Keys 存放於 `.env.local`，請勿提交至版本控制
