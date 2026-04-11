'use client'

import { useState } from 'react'
import { EstimateItem } from '@/lib/types'

export function formatNum(n: number | null | undefined): string {
  if (n == null) return ''
  return n.toLocaleString('ja-JP')
}

export function getRowClass(item: EstimateItem): string {
  if (item.excluded) return 'bg-gray-100 opacity-50'
  if (item.reviewStatus === 'ok') return 'bg-white'
  if (item.confidence === 'low') return 'bg-red-50'
  if (item.warnings.length > 0 || item.confidence === 'medium') return 'bg-amber-50'
  return 'bg-white'
}

export function itemHasBadges(item: EstimateItem): boolean {
  return (
    item.confidence === 'low' ||
    item.amount === null ||
    item.confidence === 'medium' ||
    item.warnings.length > 0
  )
}

export default function ExpandableBadge({ message, isError, badgeKey }: { message: string; isError?: boolean; badgeKey: string }) {
  const [expanded, setExpanded] = useState(false)
  const needsTruncate = message.length > 35
  const preview = needsTruncate ? message.slice(0, 35) + '…' : message
  const colorClass = isError
    ? 'text-red-700 bg-red-100 border border-red-200 hover:bg-red-200'
    : 'text-amber-700 bg-amber-100 border border-amber-200 hover:bg-amber-200'
  return (
    <span
      key={badgeKey}
      className={`text-xs px-1.5 py-0.5 rounded cursor-pointer inline-block ${colorClass}`}
      onClick={() => setExpanded((v) => !v)}
      title={expanded ? 'クリックで閉じる' : (needsTruncate ? message : undefined)}
    >
      {isError ? '🔴 要確認：' : '🟡 注意：'}{expanded ? message : preview}
    </span>
  )
}
