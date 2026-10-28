# ANGE_UNITE_deckeditor

アンジュ・ユナイト (Ange Unite) 的組牌器，以 WIXOSS_deckeditor 為基礎改寫。

## 使用方式
直接用瀏覽器開啟 `index.html`。

- 右側搜尋結果點一下 → 加入牌組；牌組中點一下 → 移除；牌組中右鍵 → 再加一張同卡
- 滑鼠移到卡片上顯示大圖與效果；按住 ALT 可鎖定預覽
- Deck Code：匯出／匯入牌組代碼、下載 CSV、存到 Deck List (localStorage)
- Deck View／Card List：檢視整副牌組
- Comment：每張卡可寫備註，可匯出／匯入 JSON

## 構築規則（加卡時擋下張數上限；畫面上不另外顯示檢查區）
- スタートカード 3 枚（同【名称】不可、アドバンススタートカード最多 1 枚＋其構築制限）
- フレームカード剛好 12 枚、プログレス／アクション剛好 28 枚（合計 40 枚）
- プログレス／アクション只能用スタートカード的顏色（無色可）
- 同名 3 枚、サポーター合計 3 枚、「天音への想い」1 枚
- 禁止・制限・コンビネーション制限（`js/card_info.js` 的 `BAN_LIST`／`LIMIT_LIST`／`COMBINATION_LIST`，2026/04/01 適用版）

## 資料
- 卡片資料：[アンジュ・ユナイト -Ange Unite- Wiki](https://w.atwiki.jp/angeunite/)（2026-10-28 取得，424 張）
  - 固定セット第 1～6 弾、ブリリアントパック Vol.1～6 的フレーム異圖 (xxx-066F/067F)、プロモ新規カード PR-029～PR-048
  - 未收錄：パラレル (P) 異圖、プロモ再録卡 (PR-001～PR-028，與原卡同效果)
- 卡圖：直接外連 [官網](https://ange-unite.com/) `/_assets_/hjangeunite/cardlistNN/large/` 的圖
  - プロモ新規カード官網沒有圖，以文字卡圖顯示；官網圖讀不到時也會自動改成文字卡圖
- 更新資料：`tools/scrape_atwiki_console.js`（在 atwiki 頁面的 Console 執行，產生 card_rows.txt）

## Release note
20261028 v1.00
1. First release.
