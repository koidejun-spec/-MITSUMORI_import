import Anthropic from '@anthropic-ai/sdk'
import { ClaudeExtractedItem, ExtractionResponse } from '../types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const SYSTEM_PROMPT = `あなたは建設業の見積書を読み取る専門家です。
以下のルールで情報を抽出してください。

【ステップ1：構造の把握】
抽出を始める前に、必ずデータ全体を俯瞰して以下を特定してください。
- どの列が「項目名」「数量」「単位」「単価」「金額」に対応するか
- カテゴリ（大項目・工種）はどの列・行に記載されているか
- ヘッダー行はどこか（データ行はその下から始まる）

【ステップ2：カテゴリの継承】
カテゴリは以下のパターンで記載されることが多い。必ず引き継いで各行に設定すること。
- パターンA：カテゴリ行が単独の行として存在し、直後の明細行にはカテゴリが空欄
  → 空欄の明細行には直前の非空欄カテゴリを引き継ぐ
- パターンB：結合セルや字下げでカテゴリが示されている
  → その配下の全明細行に同じカテゴリを設定する
- カテゴリが明示的に変わるまで、前のカテゴリを維持し続ける

【抽出する項目】
- カテゴリ（大項目・工種名。上記の継承ルールで補完する。本当に不明な場合のみnull）
- 項目名（品名・作業名）
- 仕様（規格・型番・仕様の内容）
- 数量
- 単位（記載がない場合は「式」）
- 単価
- 金額

【除外する行】
- 小計・合計・計・subtotal・total の行
- カテゴリ名だけが書かれた見出し行（数量・金額がすべて空欄）
- 金額が空欄かつ「別工事」「別途」と記載された行
- 「消費税」「税」単体の行（税込フラグで別途処理）

【数値の読み取りルール】
- カンマ区切り（1,234,567）はそのまま数値として読む
- 「¥」「円」が付いていても数値として読む
- 「△」「▲」「▵」はマイナスを意味する（例：△1,000 → -1000）
- 「-」もマイナスとして読む
- 数値が「－」（全角ハイフン）の場合は0またはnullとして扱う

【特殊ルール】
- 値引き・割引行：amountをマイナス値で抽出する
- %表記で金額もある行：%は仕様欄に入れ金額をそのまま使う
- %表記で金額がない行：小計から計算を試みる。できない場合はamountをnullにしてwarningsに「%表記・金額要確認」を追加
- 掛率表記（〇掛・×0.X）で定価がある行：自動計算してunitPriceに入れる。warningsに「AI計算値・要確認」を追加
- 掛率表記で定価がない行：amountをnullにしてwarningsに「掛率・金額要確認」を追加
- 階層構造がある場合：最下層の明細行を優先して抽出する（中間集計行は除外）
- 不明・曖昧な値：推測せず空欄にしてconfidenceをlowに設定

【単位の正規化】
以下の表記を統一する：
- ヶ所・ヵ所・か所・箇所 → ヶ所
- m2・m² → ㎡
- 個・ケ・ヶ → 個
- set・SET → 式

【PDFの処理ルール】
PDFファイルを処理する場合は以下のルールを追加で適用すること。
- ページヘッダー・フッター（ページ番号、日付、会社名・ロゴが各ページに繰り返されるテキスト）はデータとして扱わない
- 表の列ヘッダー行（「項目」「数量」「単位」「単価」「金額」等）が各ページ先頭に繰り返される場合、最初の1回のみ参照し、繰り返しはデータ行として扱わない
- 複数ページにわたる表は全ページを連続した一つの表として読み込む（ページ境界で分割しない）
- 「前ページより繰越」「次ページへ繰越」「繰越計」の行は除外する
- PDFに概要ページ（合計のみ記載）と明細ページが両方ある場合：明細ページの行データを優先して抽出し、合計はtotalAmountに使用する
- スキャンPDFや画質が低い箇所で文字が不鮮明な場合：読み取れない部分は空欄にしてconfidenceをlowに設定し、warningsに「読み取り不明瞭」を追加する

【税込検出】
「税込」「内税」「消費税込」「税込価格」の記載を検出した場合はhasTaxIncludedをtrueにする。

【業者名の抽出】
見積書の発行者・会社名・業者名を抽出してvendorNameに入れる。

【出力フォーマット】
必ず以下のJSON形式のみを出力してください。JSONのみを出力し、説明文・コードブロックは含めないでください。

{
  "vendorName": "業者名（見積書から抽出）または空文字",
  "totalAmount": 見積書記載の合計金額（数値）またはnull,
  "hasTaxIncluded": true/false,
  "items": [
    {
      "category": "カテゴリ名またはnull",
      "itemName": "項目名",
      "specification": "仕様",
      "quantity": 数量またはnull,
      "unit": "単位",
      "unitPrice": 単価またはnull,
      "amount": 金額またはnull,
      "confidence": "high"または"medium"または"low",
      "warnings": ["警告メッセージ"]
    }
  ]
}`

function parseClaudeResponse(text: string): ExtractionResponse {
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')

  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) {
    throw new Error('JSONが見つかりませんでした')
  }
  const jsonStr = cleaned.slice(start, end + 1)
  const parsed = JSON.parse(jsonStr)

  return {
    vendorName: parsed.vendorName || '',
    totalAmount: typeof parsed.totalAmount === 'number' ? parsed.totalAmount : null,
    hasTaxIncluded: !!parsed.hasTaxIncluded,
    items: (parsed.items || []).map((item: Record<string, unknown>) => ({
      category: item.category && item.category !== 'null' ? String(item.category) : null,
      itemName: String(item.itemName || ''),
      specification: String(item.specification || ''),
      quantity: typeof item.quantity === 'number' ? item.quantity : null,
      unit: String(item.unit || '式'),
      unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : null,
      amount: typeof item.amount === 'number' ? item.amount : null,
      confidence: (item.confidence as 'high' | 'medium' | 'low') || 'medium',
      warnings: Array.isArray(item.warnings) ? item.warnings.map(String) : [],
    })) as ClaudeExtractedItem[],
  }
}

function translateAPIError(err: unknown): Error {
  if (!(err instanceof Error)) return new Error('サーバーエラーが発生しました')
  const msg = err.message
  if (msg.includes('rate_limit') || msg.includes('429'))
    return new Error('APIの利用制限に達しました。しばらく待ってから再度お試しください。')
  if (msg.includes('overloaded') || msg.includes('529'))
    return new Error('AIサーバーが混雑しています。しばらく待ってから再度お試しください。')
  if (msg.includes('invalid_api_key') || msg.includes('authentication_error'))
    return new Error('APIキーが無効です。環境変数 ANTHROPIC_API_KEY を確認してください。')
  if (msg.includes('context_length_exceeded') || msg.includes('too long'))
    return new Error('ファイルの内容が多すぎてAIが処理できませんでした。ファイルを分割してください。')
  if (msg.includes('timeout') || msg.includes('ETIMEDOUT'))
    return new Error('処理がタイムアウトしました。ファイルが大きい場合は分割してください。')
  return err
}

export async function callClaudeWithRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const isRetryable =
        err instanceof Error &&
        (err.message.includes('rate_limit') ||
          err.message.includes('overloaded') ||
          err.message.includes('529') ||
          err.message.includes('500'))
      if (!isRetryable || attempt === maxRetries) throw translateAPIError(err)
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)))
    }
  }
  throw new Error('リトライ上限に達しました')
}

export async function callClaudeWithMultipleImages(
  images: { buffer: Buffer; mediaType: 'image/jpeg' }[],
  fileName: string,
): Promise<ExtractionResponse> {
  const imageBlocks: Anthropic.ImageBlockParam[] = images.map((img) => ({
    type: 'image',
    source: {
      type: 'base64',
      media_type: img.mediaType,
      data: img.buffer.toString('base64'),
    },
  }))

  const message = await callClaudeWithRetry(() =>
    anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16384,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            ...imageBlocks,
            {
              type: 'text',
              text: [
                `上記の見積書（${fileName}、全${images.length}ページ）から情報を抽出してください。`,
                '全ページを通して明細行を漏れなく抽出してください。',
                'ページをまたぐ表がある場合も、全ページを連続した一つの表として扱ってください。',
                '各ページに繰り返されるヘッダー・フッター・列タイトル行はデータとして扱わないでください。',
              ].join('\n'),
            },
          ],
        },
      ],
    }),
  )

  const textBlock = message.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') throw new Error('Claude からのレスポンスが空です')
  return parseClaudeResponse(textBlock.text)
}

export async function callClaudeWithText(userMessage: string, _fileName: string): Promise<ExtractionResponse> {
  const message = await callClaudeWithRetry(() =>
    anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16384,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  )

  const textBlock = message.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') throw new Error('Claude からのレスポンスが空です')
  return parseClaudeResponse(textBlock.text)
}

export async function callClaudeWithDocument(
  base64: string,
  mediaType: 'application/pdf',
  fileName: string,
): Promise<ExtractionResponse> {
  const message = await callClaudeWithRetry(() =>
    anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16384,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            } as Anthropic.DocumentBlockParam,
            {
              type: 'text',
              text: [
                `上記のPDF見積書（${fileName}）から情報を抽出してください。`,
                '全ページを通して明細行を漏れなく抽出してください。',
                'ページをまたぐ表がある場合も、全ページを連続した一つの表として扱ってください。',
                '各ページに繰り返されるヘッダー・フッター・列タイトル行はデータとして扱わないでください。',
              ].join('\n'),
            },
          ],
        },
      ],
    }),
  )

  const textBlock = message.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') throw new Error('Claude からのレスポンスが空です')
  return parseClaudeResponse(textBlock.text)
}

export async function callClaudeWithImage(
  base64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  fileName: string,
): Promise<ExtractionResponse> {
  const message = await callClaudeWithRetry(() =>
    anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16384,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: `上記の見積書画像（${fileName}）から情報を抽出してください。` },
          ],
        },
      ],
    }),
  )

  const textBlock = message.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') throw new Error('Claude からのレスポンスが空です')
  return parseClaudeResponse(textBlock.text)
}
