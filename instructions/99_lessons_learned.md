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

### 2026-01-02: React 18 Automatic Batching 導致高頻率狀態更新不渲染

**情境**：
- 播放音訊時，紅色播放頭（進度條）完全不動
- 但按暫停後，播放頭會「跳」到正確的播放位置
- Console 沒有錯誤，debug log 顯示 `onTimeUpdate` 確實有被呼叫且數值正確

**根因**：
- `PreviewPlayer` 使用 `requestAnimationFrame` 每秒約 60 次呼叫 `onTimeUpdate(time)`
- React 18 的「Automatic Batching」會自動合併這些高頻率的狀態更新
- 結果是狀態有更新，但 React 只在某些「閒置時機」（如暫停）才真正觸發重繪

**解決方案**：
```tsx
import { flushSync } from 'react-dom';

// 在高頻率更新處使用 flushSync 強制同步渲染
flushSync(() => {
    onTimeUpdate(globalTime);
});
```

**教訓**：
1. **React 18 Batching**：所有非同步上下文（setTimeout, Promise, requestAnimationFrame）的狀態更新都會被自動批次合併
2. **高頻率動畫**：如果需要即時視覺回饋（如播放頭、進度條），必須使用 `flushSync` 強制同步渲染
3. **症狀辨識**：「暫停後才更新」是 Batching 問題的典型症狀

**相關檔案**：
- `components/timeline/PreviewPlayer.tsx`

---

### 2026-01-02: flushSync + requestAnimationFrame 競態條件導致播放器跳回上一段

**情境**：
- 區塊一、區塊二都已生成完成
- 播放區塊一，結束後應該自動播放區塊二
- 實際上：會短暫跳到區塊二，然後馬上跳回區塊一（起始位置），播放停止

**根因**：
- `PreviewPlayer` 使用 `requestAnimationFrame` (rAF) 配合 `flushSync` 來即時更新播放時間
- 當 `flushSync` 執行時，React 同步觸發重新渲染，導致 `useEffect` 的清理函數 (cleanup) 被執行
- 清理函數雖然呼叫了 `cancelAnimationFrame`，但此時**程式控制權還在舊的 rAF callback 裡面**
- `flushSync` 返回後，舊的 callback 繼續執行剩餘的程式碼，這一行：
  ```tsx
  animationFrameRef.current = requestAnimationFrame(updateTime);
  ```
- 這會用**舊的閉包變數**（Segment 0 的 `segmentStartTime`）預約一個新的 rAF
- 新 rAF 執行時，計算出 `globalTime = 0 + 0 = 0`，把播放時間設回開頭

**解決方案**：
```tsx
useEffect(() => {
    let isCancelled = false;

    const updateTime = () => {
        if (isCancelled) return; // 防止幽靈幀 (Ghost Frame)

        // ... time calculation ...
        flushSync(() => {
            onTimeUpdate(globalTime);
        });

        if (!isCancelled) { // 再次檢查，確保 flushSync 觸發 cleanup 後不再預約
            animationFrameRef.current = requestAnimationFrame(updateTime);
        }
    };

    animationFrameRef.current = requestAnimationFrame(updateTime);

    return () => {
        isCancelled = true;
        cancelAnimationFrame(animationFrameRef.current);
    };
}, [/* deps */]);
```

**教訓**：
1. **flushSync 會同步觸發 React 生命週期**：在 rAF callback 裡使用 flushSync，cleanup 會在 flushSync 內部執行，而非 callback 結束後
2. **cancelAnimationFrame 只能取消「尚未執行」的幀**：如果當前幀已經在執行，取消是無效的
3. **isCancelled 旗標模式**：任何可能在異步環境下被 cleanup 中斷的邏輯，都應該用旗標來防止後續動作

**相關檔案**：
- `components/timeline/PreviewPlayer.tsx`

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
