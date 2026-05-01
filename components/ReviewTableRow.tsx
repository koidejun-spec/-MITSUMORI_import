'use client'

import { EstimateItem } from '@/lib/types'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import ExpandableBadge, { formatNum, getRowClass, itemHasBadges } from '@/components/ExpandableBadge'

interface ReviewTableRowProps {
  item: EstimateItem
  globalIndex: number
  selected: boolean
  onToggleSelect: (id: string) => void
  onUpdate: (id: string, field: keyof EstimateItem, value: unknown) => void
  onUpdateAmount: (id: string, value: number | null) => void
  onToggleExclude: (id: string) => void
  onSellingPriceEdit: (id: string, value: number | null) => void
  onExpandCell: (id: string, field: 'specification' | 'remarks') => void
}

export default function ReviewTableRow({
  item,
  globalIndex,
  selected,
  onToggleSelect,
  onUpdate,
  onUpdateAmount,
  onToggleExclude,
  onSellingPriceEdit,
  onExpandCell,
}: ReviewTableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const rowClass = getRowClass(item)
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { opacity: 0.5, zIndex: 1, position: 'relative' as const } : {}),
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${rowClass} hover:bg-black/[0.02] transition-colors border-t border-slate-100`}
    >
      <td className="px-1.5 py-2 text-center">
        <button
          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 touch-none p-0.5"
          {...attributes}
          {...listeners}
        >
          <svg width="12" height="14" viewBox="0 0 12 16" fill="currentColor">
            <circle cx="3.5" cy="2.5" r="1.5" />
            <circle cx="8.5" cy="2.5" r="1.5" />
            <circle cx="3.5" cy="8" r="1.5" />
            <circle cx="8.5" cy="8" r="1.5" />
            <circle cx="3.5" cy="13.5" r="1.5" />
            <circle cx="8.5" cy="13.5" r="1.5" />
          </svg>
        </button>
      </td>

      <td className="px-2 py-2 text-center">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(item.id)}
          className="accent-teal-600"
        />
      </td>

      <td className="px-3 py-2 text-slate-400 text-xs whitespace-nowrap">
        {item.excluded ? <s>{globalIndex + 1}</s> : globalIndex + 1}
      </td>

      <td className="px-3 py-2">
        <input
          type="text"
          value={item.category ?? ''}
          onChange={(e) => onUpdate(item.id, 'category', e.target.value || null)}
          placeholder="未分類"
          className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-300"
        />
      </td>

      <td className="px-3 py-2">
        <div>
          <input
            type="text"
            value={item.itemName}
            onChange={(e) => onUpdate(item.id, 'itemName', e.target.value)}
            className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          {item.reviewStatus === 'ok' && itemHasBadges(item) ? (
            <span className="text-xs text-green-600 mt-0.5 block">✓ 確認済み</span>
          ) : item.reviewStatus !== 'ok' ? (
            <div className="flex flex-col gap-0.5 mt-0.5">
              {item.confidence === 'low' && (
                <ExpandableBadge badgeKey={`${item.id}-low`} message="AIの信頼度が低く数値を読み取れませんでした" isError />
              )}
              {!item.excluded && item.amount === null && (
                <ExpandableBadge badgeKey={`${item.id}-noamount`} message="金額を読み取れませんでした" isError />
              )}
              {item.confidence === 'medium' && item.warnings.length === 0 && (
                <ExpandableBadge badgeKey={`${item.id}-medium`} message="AIの信頼度が中程度です" />
              )}
              {item.warnings.map((w, wi) => (
                <ExpandableBadge key={wi} badgeKey={`${item.id}-w${wi}`} message={w} />
              ))}
              {itemHasBadges(item) && (
                <button
                  onClick={() => onUpdate(item.id, 'reviewStatus', 'ok')}
                  className="text-xs text-green-600 hover:text-green-700 text-left mt-0.5 w-fit"
                >
                  ✓ 確認済みにする
                </button>
              )}
            </div>
          ) : null}
        </div>
      </td>

      <td className="px-3 py-2 relative group/spec">
        <input
          type="text"
          value={item.specification}
          onChange={(e) => onUpdate(item.id, 'specification', e.target.value)}
          className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-teal-500 truncate"
        />
        {item.specification && (
          <div className="pointer-events-none absolute z-50 bottom-full left-0 mb-1 hidden group-hover/spec:block bg-slate-100 text-slate-600 border border-slate-200 text-xs rounded px-2.5 py-2 w-64 whitespace-pre-wrap shadow-md leading-relaxed">
            {item.specification}
          </div>
        )}
      </td>

      <td className="px-3 py-2">
        <input
          type="number"
          value={item.quantity ?? ''}
          onChange={(e) => onUpdate(item.id, 'quantity', e.target.value ? Number(e.target.value) : null)}
          className="w-16 text-xs text-right border border-slate-200 rounded px-1.5 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </td>

      <td className="px-3 py-2">
        <input
          type="text"
          value={item.unit}
          onChange={(e) => onUpdate(item.id, 'unit', e.target.value)}
          className="w-14 text-xs border border-slate-200 rounded px-1.5 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </td>

      <td className="px-3 py-2 text-right">
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {item.costPrice != null ? `¥${formatNum(item.costPrice)}` : ''}
        </span>
        {item.costPrice != null && item.quantity != null && item.unit !== '式' && (
          <p className="text-xs text-slate-400 whitespace-nowrap">逆算</p>
        )}
      </td>

      <td className="px-3 py-2">
        <input
          type="number"
          value={item.amount ?? ''}
          onChange={(e) => onUpdateAmount(item.id, e.target.value ? Number(e.target.value) : null)}
          className="w-24 text-xs text-right border border-slate-200 rounded px-1.5 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </td>

      <td className="px-3 py-2">
        <input
          type="number"
          value={item.sellingUnitPrice ?? ''}
          onChange={(e) => onSellingPriceEdit(item.id, e.target.value ? Number(e.target.value) : null)}
          className={`w-24 text-xs text-right border rounded px-1.5 py-1 focus:outline-none focus:ring-1
            ${item.sellingUnitPriceEdited
              ? 'border-orange-400 bg-orange-50 focus:ring-orange-400'
              : 'border-teal-200 bg-teal-50 focus:ring-teal-500'}`}
        />
        {item.sellingUnitPriceEdited && (
          <p className="text-xs text-orange-500 mt-0.5 whitespace-nowrap">✏ 編集済み</p>
        )}
      </td>

      <td className="px-3 py-2 text-right">
        <span className="text-xs font-semibold text-teal-700 whitespace-nowrap">
          {item.sellingUnitPrice != null && item.quantity != null
            ? `¥${formatNum(Math.round(item.sellingUnitPrice * item.quantity))}`
            : item.sellingUnitPrice != null
            ? `¥${formatNum(Math.round(item.sellingUnitPrice))}`
            : ''}
        </span>
      </td>

      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={item.remarks}
            onChange={(e) => onUpdate(item.id, 'remarks', e.target.value)}
            title={item.remarks}
            className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-teal-500 truncate"
          />
          {item.remarks && (
            <button
              onClick={() => onExpandCell(item.id, 'remarks')}
              className="flex-shrink-0 text-slate-300 hover:text-teal-500 transition-colors"
              title="全文表示"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
            </button>
          )}
        </div>
      </td>

      <td className="px-3 py-2 text-center">
        <button
          onClick={() => onToggleExclude(item.id)}
          className={`text-xs px-2 py-1 rounded transition-colors font-medium
            ${item.excluded ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
        >
          {item.excluded ? '戻す' : '除外'}
        </button>
      </td>
    </tr>
  )
}
