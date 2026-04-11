'use client'

import { useState, useMemo, Fragment } from 'react'
import { EstimateItem, RoundingMode, MarkupSettings } from '@/lib/types'
import { useReviewItems } from '@/hooks/useReviewItems'
import { formatNum } from '@/components/ExpandableBadge'
import ReviewTableRow from '@/components/ReviewTableRow'
import TextModal from '@/components/TextModal'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'

interface ReviewTableProps {
  items: EstimateItem[]
  onUpdate: (items: EstimateItem[]) => void
  roundingMode: RoundingMode
  markupSettings: MarkupSettings
}

function groupByCategory(items: EstimateItem[]): { category: string; items: EstimateItem[]; startIndex: number }[] {
  const map = new Map<string, { items: EstimateItem[]; startIndex: number }>()
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const cat = item.category ?? '未分類'
    if (!map.has(cat)) map.set(cat, { items: [], startIndex: i })
    map.get(cat)!.items.push(item)
  }
  return Array.from(map.entries()).map(([category, { items, startIndex }]) => ({ category, items, startIndex }))
}

export default function ReviewTable({ items, onUpdate, roundingMode, markupSettings }: ReviewTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkCategory, setBulkCategory] = useState('')
  const [showBulkInput, setShowBulkInput] = useState(false)
  const [expandedCell, setExpandedCell] = useState<{ id: string; field: 'specification' | 'remarks' } | null>(null)

  const { update, updateAmount, toggleExclude, applyBulkCategory: applyBulkCategoryAction, mergeCategory } = useReviewItems(
    items,
    onUpdate,
    roundingMode,
    markupSettings,
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeItem = items.find((i) => i.id === active.id)
    const overItem = items.find((i) => i.id === over.id)
    if (!activeItem || !overItem) return

    if ((activeItem.category ?? '未分類') !== (overItem.category ?? '未分類')) return

    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    onUpdate(arrayMove(items, oldIndex, newIndex))
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === items.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(items.map((i) => i.id)))
    }
  }

  function applyBulkCategory() {
    if (!bulkCategory.trim()) return
    applyBulkCategoryAction(selected, bulkCategory.trim())
    setSelected(new Set())
    setBulkCategory('')
    setShowBulkInput(false)
  }

  function handleSellingPriceEdit(id: string, value: number | null) {
    onUpdate(items.map((i) => i.id === id
      ? { ...i, sellingUnitPrice: value, sellingUnitPriceEdited: true }
      : i
    ))
  }

  const { activeCount, allClear, totalCost, totalSelling } = useMemo(() => {
    const active = items.filter((i) => !i.excluded)
    const totalCost = active.reduce((sum, i) => sum + (i.amount ?? 0), 0)
    const totalSelling = active.reduce((sum, i) => {
      const raw = i.sellingUnitPrice != null && i.quantity != null
        ? i.sellingUnitPrice * i.quantity
        : (i.sellingUnitPrice ?? 0)
      return sum + Math.round(raw)
    }, 0)
    return {
      activeCount: active.length,
      allClear: active.length > 0 && active.every((i) => i.reviewStatus === 'ok'),
      totalCost,
      totalSelling,
    }
  }, [items])
  const groups = useMemo(() => groupByCategory(items), [items])

  return (
    <div>
      {/* All Clear バナー */}
      {allClear && (
        <div className="flex items-center gap-2 mb-3 px-4 py-2.5 bg-green-50 border border-green-300 rounded-lg">
          <span className="text-green-600 text-base">✓</span>
          <span className="text-sm font-semibold text-green-700">All Clear — 全{activeCount}件の確認が完了しました</span>
        </div>
      )}

      {/* 一括操作バー */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm text-blue-700 font-medium">{selected.size}件選択中</span>
          {showBulkInput ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                placeholder="カテゴリ名を入力"
                className="text-sm border border-gray-300 rounded px-2 py-1 w-40"
                onKeyDown={(e) => e.key === 'Enter' && applyBulkCategory()}
                autoFocus
              />
              <button onClick={applyBulkCategory} className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                適用
              </button>
              <button onClick={() => setShowBulkInput(false)} className="text-sm text-gray-500 hover:text-gray-700">
                キャンセル
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowBulkInput(true)}
              className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              カテゴリを一括設定
            </button>
          )}
        </div>
      )}

      <div className="text-sm text-gray-500 mb-2">
        {activeCount}件（除外除く） / 全{items.length}件
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="w-7 px-1.5 py-3" />
                <th className="w-8 px-2 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selected.size === items.length && items.length > 0}
                    onChange={toggleSelectAll}
                    className="accent-blue-600"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">No</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap min-w-[120px]">カテゴリ</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap min-w-[160px]">名称</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap min-w-[140px]">内容・仕様</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 whitespace-nowrap">数量</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">単位</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 whitespace-nowrap">原価単価</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 whitespace-nowrap">原価合計</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-blue-600 whitespace-nowrap">売値単価</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-blue-600 whitespace-nowrap">売値金額</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap min-w-[100px]">備考</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap">除外</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(({ category, items: groupItems, startIndex }) => {
                const groupActive = groupItems.filter((i) => !i.excluded)
                const groupSellingTotal = groupActive.reduce((sum, i) => {
                  const raw = i.sellingUnitPrice != null && i.quantity != null
                    ? i.sellingUnitPrice * i.quantity
                    : (i.sellingUnitPrice ?? 0)
                  return sum + Math.round(raw)
                }, 0)
                const groupCostTotal = groupActive.reduce((sum, i) => sum + (i.amount ?? 0), 0)

                return (
                  <Fragment key={category}>
                    {/* カテゴリヘッダー行 */}
                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                      <td colSpan={3} className="px-2 py-2" />
                      <td colSpan={9} className="px-3 py-2">
                        <input
                          type="text"
                          defaultValue={category}
                          onBlur={(e) => {
                            const newCat = e.target.value.trim() || null
                            if (newCat === category) return
                            onUpdate(items.map((i) =>
                              groupItems.includes(i) ? { ...i, category: newCat } : i
                            ))
                          }}
                          className="text-xs font-bold text-gray-700 bg-transparent border-b border-transparent hover:border-gray-400 focus:border-blue-400 focus:outline-none w-full tracking-wide"
                        />
                      </td>
                      <td colSpan={2} className="px-3 py-2 text-right">
                        {groupItems.filter((i) => !i.excluded).length > 1 && (
                          <button
                            onClick={() => mergeCategory(category)}
                            className="text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                            title="このカテゴリの項目を1行に統合"
                          >
                            統合
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* グループ内の行（ドラッグ&ドロップ対応） */}
                    <SortableContext items={groupItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                      {groupItems.map((item, groupItemIndex) => (
                        <ReviewTableRow
                          key={item.id}
                          item={item}
                          globalIndex={startIndex + groupItemIndex}
                          selected={selected.has(item.id)}
                          onToggleSelect={toggleSelect}
                          onUpdate={update}
                          onUpdateAmount={updateAmount}
                          onToggleExclude={toggleExclude}
                          onSellingPriceEdit={handleSellingPriceEdit}
                          onExpandCell={(id, field) => setExpandedCell({ id, field })}
                        />
                      ))}
                    </SortableContext>

                    {/* 小計行 */}
                    {(groupSellingTotal > 0 || groupCostTotal > 0) && (
                      <tr className="bg-blue-50 border-t border-blue-200">
                        <td colSpan={9} className="px-3 py-1.5 text-right text-xs font-semibold text-blue-600">
                          小計
                        </td>
                        <td className="px-3 py-1.5 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">
                          {groupCostTotal > 0 ? `¥${formatNum(Math.round(groupCostTotal))}` : ''}
                        </td>
                        <td />
                        <td className="px-3 py-1.5 text-right text-xs font-semibold text-blue-600 whitespace-nowrap">
                          {groupSellingTotal > 0 ? `¥${formatNum(Math.round(groupSellingTotal))}` : ''}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-800 text-white">
                <td colSpan={9} className="px-3 py-2.5 text-right text-xs font-bold tracking-wide">
                  合計（除外除く）
                </td>
                <td className="px-3 py-2.5 text-right text-xs font-bold whitespace-nowrap">
                  {totalCost > 0 ? `¥${formatNum(Math.round(totalCost))}` : '—'}
                </td>
                <td />
                <td className="px-3 py-2.5 text-right text-sm font-bold text-blue-300 whitespace-nowrap">
                  {totalSelling > 0 ? `¥${formatNum(totalSelling)}` : '—'}
                </td>
                <td colSpan={2} className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                  {totalCost > 0 && totalSelling > 0 && (
                    <>
                      粗利率{' '}
                      <span className="text-white font-semibold">
                        {(((totalSelling - totalCost) / totalSelling) * 100).toFixed(1)}%
                      </span>
                    </>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </DndContext>

      {/* テキスト展開モーダル */}
      {expandedCell && (() => {
        const target = items.find((i) => i.id === expandedCell.id)
        if (!target) return null
        const label = expandedCell.field === 'specification' ? '内容・仕様' : '備考'
        const value = target[expandedCell.field] as string
        return (
          <TextModal
            label={label}
            value={value}
            onChange={(v) => update(target.id, expandedCell.field, v)}
            onClose={() => setExpandedCell(null)}
          />
        )
      })()}
    </div>
  )
}
