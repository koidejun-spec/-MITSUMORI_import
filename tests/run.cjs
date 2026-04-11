/**
 * 見積取込ツール パイプラインテスト
 *
 * 使い方: node tests/run.cjs
 *
 * APIを叩かずにパイプライン（parse→原価計算→警告生成）を検証する。
 * プロンプトや計算ロジックを変更した後に必ず実行すること。
 */

const fs = require('fs')
const path = require('path')

// ── パイプライン関数（app/page.tsx・route.tsと同じロジック） ─────────────────

function parseClaudeResponse(input) {
  return {
    vendorName: input.vendorName || '',
    totalAmount: typeof input.totalAmount === 'number' ? input.totalAmount : null,
    hasTaxIncluded: !!input.hasTaxIncluded,
    items: (input.items || []).map(item => ({
      category: item.category && item.category !== 'null' ? String(item.category) : null,
      itemName: String(item.itemName || ''),
      specification: String(item.specification || ''),
      quantity: typeof item.quantity === 'number' ? item.quantity : null,
      unit: String(item.unit || '式'),
      unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : null,
      amount: typeof item.amount === 'number' ? item.amount : null,
      confidence: item.confidence || 'medium',
      warnings: Array.isArray(item.warnings) ? item.warnings.map(String) : [],
    })),
  }
}

function applyRounding(value, mode) {
  switch (mode) {
    case 'floor': return Math.floor(value)
    case 'ceil':  return Math.ceil(value)
    case 'trunc': return Math.trunc(value)
    case 'round':
    default:      return Math.round(value)
  }
}

function buildCostPriceInfo(item, mode) {
  const fmt = n => n.toLocaleString('ja-JP')
  const extraWarnings = []

  if (item.unitPrice !== null) {
    return { costPrice: item.unitPrice, extraWarnings }
  }
  if (item.quantity !== null && item.unit !== '式' && item.amount !== null) {
    const costPrice = applyRounding(item.amount / item.quantity, mode)
    extraWarnings.push('逆算: ¥' + fmt(item.amount) + ' ÷ ' + item.quantity + ' = ¥' + fmt(costPrice))
    return { costPrice, extraWarnings }
  }
  if (item.amount !== null) {
    extraWarnings.push('単価の記載がないため金額をそのまま入れています')
    return { costPrice: item.amount, extraWarnings }
  }
  return { costPrice: null, extraWarnings }
}

function buildItems(extraction, fileName, mode) {
  if (!extraction.items) return []
  const vendorName = extraction.vendorName || ''
  return extraction.items.map((item, i) => {
    const { costPrice, extraWarnings } = buildCostPriceInfo(item, mode || 'round')
    const allWarnings = [...(item.warnings || []), ...extraWarnings]
    return {
      id: 'item-' + (i + 1),
      vendorName,
      category: item.category,
      itemName: item.itemName,
      specification: item.specification,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      amount: item.amount,
      costPrice,
      remarks: vendorName ? '業者：' + vendorName : '',
      confidence: item.confidence,
      reviewStatus: allWarnings.length > 0 || item.confidence === 'low' ? 'warning' : 'ok',
      warnings: allWarnings,
      excluded: false,
    }
  })
}

function buildWarnings(extraction, fileName) {
  const warnings = []
  if (extraction.hasTaxIncluded) {
    warnings.push({ type: 'tax', sourceFileName: fileName, data: {}, acknowledged: false })
  }
  if (extraction.totalAmount != null && extraction.items.length > 0) {
    const extractedTotal = extraction.items.reduce((s, i) => s + (i.amount || 0), 0)
    const diff = Math.abs(extraction.totalAmount - extractedTotal)
    if (diff > 100) {
      warnings.push({
        type: 'total_mismatch',
        sourceFileName: fileName,
        data: { vendorTotal: extraction.totalAmount, extractedTotal, difference: extraction.totalAmount - extractedTotal },
        acknowledged: false,
      })
    }
  }
  return warnings
}

// ── アサーション評価 ─────────────────────────────────────────────────────────

function getPath(obj, pathStr) {
  return pathStr.split('.').reduce((cur, key) => {
    if (cur == null) return undefined
    const arrMatch = key.match(/^(\w+)\[(\d+)\]$/)
    if (arrMatch) {
      const arr = cur[arrMatch[1]]
      return Array.isArray(arr) ? arr[parseInt(arrMatch[2])] : undefined
    }
    return cur[key]
  }, obj)
}

function checkAssertion(result, assertion) {
  const actual = getPath(result, assertion.path)

  if ('eq' in assertion) {
    const pass = actual === assertion.eq
    return { pass, actual, expected: assertion.eq }
  }
  if ('includes' in assertion) {
    const pass = Array.isArray(actual)
      ? actual.some(v => String(v).includes(assertion.includes))
      : false
    return { pass, actual, expected: '含む: ' + assertion.includes }
  }
  return { pass: false, actual, expected: '不明なアサーション' }
}

// ── テスト実行 ───────────────────────────────────────────────────────────────

const GREEN = '\x1b[32m'
const RED   = '\x1b[31m'
const GRAY  = '\x1b[90m'
const BOLD  = '\x1b[1m'
const RESET = '\x1b[0m'

const fixturesDir = path.join(__dirname, 'fixtures')
const files = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.json')).sort()

let totalPass = 0
let totalFail = 0

for (const file of files) {
  const fixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, file), 'utf8'))
  const { description, input, assertions, roundingMode } = fixture

  // パイプライン実行
  const extraction = parseClaudeResponse(input)
  const items = buildItems(extraction, file, roundingMode || 'round')
  const globalWarnings = buildWarnings(extraction, file)
  const result = { items, globalWarnings }

  let filePassed = 0
  let fileFailed = 0
  const failDetails = []

  for (const assertion of assertions) {
    const { pass, actual, expected } = checkAssertion(result, assertion)
    if (pass) {
      filePassed++
      totalPass++
    } else {
      fileFailed++
      totalFail++
      failDetails.push({ path: assertion.path, note: assertion.note || '', actual, expected })
    }
  }

  const icon = fileFailed === 0 ? GREEN + '✓' + RESET : RED + '✗' + RESET
  const status = fileFailed === 0
    ? GREEN + 'PASS' + RESET
    : RED + 'FAIL' + RESET + ' (' + fileFailed + '件失敗)'

  console.log(icon + ' ' + BOLD + file + RESET + ' ' + GRAY + description + RESET)
  console.log('  ' + status + '  ' + GRAY + filePassed + '/' + assertions.length + ' passed' + RESET)

  for (const d of failDetails) {
    console.log(RED + '  ✗ ' + d.path + RESET + (d.note ? ' (' + d.note + ')' : ''))
    console.log('    期待: ' + JSON.stringify(d.expected))
    console.log('    実際: ' + JSON.stringify(d.actual))
  }
  console.log()
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
const allPass = totalFail === 0
console.log(
  (allPass ? GREEN + BOLD + '全テスト通過' : RED + BOLD + 'テスト失敗あり') + RESET +
  '  ' + GREEN + totalPass + ' passed' + RESET +
  (totalFail > 0 ? '  ' + RED + totalFail + ' failed' + RESET : '')
)
if (!allPass) process.exit(1)
