# AI 錯誤記錄與教訓

> **每次改動前必讀！** 這份文件記錄了過去犯過的錯誤。

---

## 🔴 錯誤記錄

### 2026-01-02: 一鍵生成語音失敗 (TypeError: forEach is not a function)

**情境**：
- 使用者點擊「一鍵生成全部素材」時，圖片會生成但語音沒有動靜
- Console 報錯 `TypeError: globalDict.forEach is not a function`

**根因**：
- 前端 `handleBatchGenerate` 預期 `/api/dictionary/all` 返回的是陣列 `PronunciationDictItem[]`
- 後端 `getAllWords` 實際上是設計給 Minimax SDK 用的，返回 `{ tone: [...] }` 物件
- 前端直接拿物件去 call `.forEach` 導致崩潰

**教訓**：
1. **API 契約檢查**：修改或使用既有 API 前，務必確認其返回的真實資料結構（不要只看函數名稱猜測）
2. **前後端型別共享**：最好能共享 TypeScript Interface，或者在 API 層做明確的轉型 (Adapter Pattern)

**相關檔案**：
- `app/api/dictionary/all/route.ts`
- `review/page.tsx`

---

### 2026-01-02: 淺色模式導致背景全白

**情境**：
- 用戶在淺色模式系統下打開網站，背景變成白色，文字看不清楚
- 預期應該永遠是深色模式

**根因**：
- `app/globals.css` 中保留了 `prefers-color-scheme: dark` 的 CSS 變數切換
- 且定義了 `body { background: var(--background) }`
- 這條 CSS 規則優先級覆蓋了 `layout.tsx` 中 Tailwind 的 `bg-gradient-to-br ...` class

**教訓**：
1. **CSS 優先級 (Specificity)**：原生 CSS 的 ID/Class 規則很容易意外覆蓋 Utility Classes
2. **單一真值來源**：如果決定全站深色，應徹底移除所有淺色模式的 CSS 變數定義，避免殘留

**相關檔案**：
- `app/globals.css`
- `app/layout.tsx`

---

## 🟡 一般教訓

### Minimax TTS
- 發音字典格式特別：`word/pinyin`，例如 `變長/(bian4)(chang2)`
- 語速預設值為 `1.2`

### Google Sheets Integration
- 字典 Sheet 名稱固定為：`Minimax 易念錯字`
- 第一行為標題列，資料從第二行索引開始

### 狀態管理
- `generatedAssets` 是一個 Map，key 為 `segmentId`
- 修改狀態盡量使用 `updateAssetStatus` 統一入口

### API 設計
- **批次操作優先**：像 `save-batch` 這種功能，擴充既有 endpoint (`/save`) 支援陣列通常比開新 endpoint 好維護

---

## ✅ 每次改動前的檢查清單

- [ ] API 修改後，是否檢查了前端對該 API 回傳值的預期？
- [ ] CSS 修改是否在深色/淺色模式下都驗證過？
- [ ] 修改共用 lib (如 `google-sheets.ts`) 時，是否影響了其他引用處？
