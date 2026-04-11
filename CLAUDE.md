# estimate-tool

日本語でお願い！

## プロジェクト概要
PDF・Excel・画像の見積書をAIで自動抽出し、CSV出力する社内ツール。
Next.js 14 + TypeScript + Tailwind CSS + Claude Sonnet 4.6 API。

## 技術スタック
- フレームワーク：Next.js 14（App Router）
- 言語：TypeScript（strict）
- スタイル：Tailwind CSS
- AI：@anthropic-ai/sdk（claude-sonnet-4-6）
- Excel処理：xlsx ライブラリ
- テスト：node tests/run.cjs（フィクスチャベース、API不要）

## ディレクトリ構造
```
app/
  page.tsx                # UIの組み立て（useEstimateFlowで状態管理を分離）
  api/extract/
    route.ts              # Claude API呼び出し・ファイル処理の中心
components/
  ReviewTable.tsx         # テーブル構造・ヘッダー・フッター・D&D・カテゴリ統合
  ReviewTableRow.tsx      # 1行の描画・ドラッグハンドル（@dnd-kit/sortable）
  ExpandableBadge.tsx     # バッジ表示 + formatNum・getRowClass等ユーティリティ
  FileUpload.tsx          # ファイル選択・D&D
  SettingsModal.tsx       # 掛率・端数処理設定
  WarningBanner.tsx       # 税込・合計不一致警告
  StepIndicator.tsx       # 3ステップ進捗表示
  TextModal.tsx           # テキスト全文表示モーダル
  ResumeDialog.tsx        # 前回作業の再開ダイアログ
hooks/
  useEstimateFlow.ts      # メインの状態管理・全callback（page.tsxから分離）
  useReviewItems.ts       # 項目操作（編集・除外・カテゴリ統合）
lib/
  types.ts                # 型定義（EstimateItem, ExtractionResponse等）
  builder.ts              # AIレスポンス→EstimateItem変換・警告生成
  csv.ts                  # CSV出力ロジック
  markup.ts               # 掛率計算・端数処理・逆算
  storage.ts              # ローカルストレージ保存
  api.ts                  # extractFromFiles（クライアント→APIルート呼び出し）
  preprocess.ts           # 入力前処理
  extractors/
    claude.ts             # Claude API呼び出し・SYSTEM_PROMPT・リトライ
    excel.ts              # Excel→TSV変換（セル結合展開）
    pdf.ts                # PDF base64エンコード
    image.ts              # 画像 base64エンコード
tests/
  run.cjs                 # テストランナー（APIキー不要）
  fixtures/               # 01〜12.json（各シナリオのテストデータ）
```

## コアロジック（route.ts）
- `processExcel()` — セル結合展開+行番号付きTSVに変換してClaudeに渡す
- `processPDF()` — base64エンコードしてDocument Blockで送信（最大20MB）
- `processImage()` — base64エンコードしてImage Blockで送信
- `callClaudeWithRetry()` — 最大2回リトライ（指数バックオフ）
- max_tokens: 16384

## 重要な型定義
- `EstimateItem`：UI表示・CSV出力用（costPrice含む）
- `ClaudeExtractedItem`：AIからの生の出力
- `ExtractionResponse`：vendorName / totalAmount / hasTaxIncluded / items
- confidence: 'high' | 'medium' | 'low'
- reviewStatus: 'ok' | 'warning' | 'error'

## 原価計算ロジック
costPrice = 業者の単価（unitPrice）をそのまま使う。

優先順位：
1. unitPriceあり → costPrice = unitPrice
2. unitPriceなし・単位が「式」以外・数量あり → amount ÷ quantity で逆算
3. unitPriceなし・それ以外 → amount をそのまま costPrice に
4. amount も unitPrice もなし → costPrice = null

## コードルール
- ファイルが300行を超えたら分割を検討する
- API呼び出しは `route.ts` に集約し、コンポーネントに直書きしない
- コンポーネントは表示に専念。ロジックは `lib/` に切り出す
- 同じ処理を2箇所以上に書かない

## 禁止事項
- `route.ts`のSYSTEM_PROMPTを無断で変更しない
- max_tokensを16384未満に下げない
- テストfixtures/*.jsonのtotalAmountと抽出合計を不一致にしない
- `npm run build` でエラーが出る変更は入れない

## テスト実行
```bash
npm test   # tests/run.cjs を実行（APIキー不要）
```

## 作業ログのルール
ユーザーが「作業終わり」「終わり」「今日はここまで」のいずれかを言ったら、必ず以下を実行すること：
1. この会話で行った作業を箇条書きでまとめる
2. `progress.md` に以下の形式で追記する

```
## YYYY-MM-DD セッションタイトル（作業内容を一言で）

### やったこと
- 内容

### 残タスク・気になった点（あれば）
- 内容

---
```
