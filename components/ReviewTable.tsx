'use client'

import { useState, useMemo, Fragment } from 'react'
import { EstimateItem, RoundingMode, ProfitBase, MarkupSettings } from '@/lib/types'
import { useReviewItems } from '@/hooks/useReviewItems'
import { formatNum } from '@/components/ExpandableBadge'
import ReviewTableRow from '@/components/ReviewTableRow'
import TextModal from '@/components/TextModal'
import { downloadCSV } from '@/lib/csv'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'

interface ReviewTableProps {
  items: EstimateItem[]
  onUpdate: (items: EstimateItem[]) => void
  roundingMode: RoundingMode
  profitBase: ProfitBase
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

export default function ReviewTable({ items, onUpdate, roundingMode, profitBase, markupSettings }: ReviewTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkCategory, setBulkCategory] = useState('')
  const [showBulkInput, setShowBulkInput] = useState(false)
  const [expandedCell, setExpandedCell] = useState<{ id: string; field: 'specification' | 'remarks' } | null>(null)

  const { update, updateAmount, toggleExclude, applyBulkCategory: applyBulkCategoryAction, mergeCategory, unmergeItem } = useReviewItems(
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

  function handleCategoryDownload(category: string, categoryItems: EstimateItem[]) {
    const active = categoryItems.filter((i) => !i.excluded)
    if (active.length === 0) return
    const today = new Date()
    const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
    const filename = `${category}_${datePart}.csv`
    downloadCSV(active, profitBase, filename)
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
      {allClear && (
        <div className="flex items-center gap-2 mb-3 px-4 py-2.5 bg-green-50 border border-green-300 rounded-lg">
          <span className="text-green-600 text-base">✓</span>
          <span className="text-sm font-semibold text-green-700">All Clear — 全{activeCount}件の確認が完了しました</span>
        </div>
      )}

      {showBulkInput ? (
        <div className="flex items-center gap-3 mb-3 p-2 bg-teal-50 border border-teal-200 rounded-lg">
          <span className="text-sm text-teal-700 font-medium">{selected.size}件選択中</span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              placeholder="カテゴリ名を入力"
              className="text-sm border border-slate-200 rounded px-2 py-1 w-40"
              onKeyDown={(e) => e.key === 'Enter' && applyBulkCategory()}
              autoFocus
            />
            <button onClick={applyBulkCategory} className="text-sm bg-teal-600 text-white px-3 py-1 rounded hover:bg-teal-700">
              適用
            </button>
            <button onClick={() => { setShowBulkInput(false); setSelected(new Set()) }} className="text-sm text-slate-500 hover:text-slate-700">
              キャンセル
            </button>
          </div>
        </div>
      ) : selected.size > 0 ? (
        <div className="flex items-center gap-3 mb-3 p-2 bg-teal-50 border border-teal-200 rounded-lg">
          <span className="text-sm text-teal-700 font-medium">{selected.size}件選択中</span>
          <button
            onClick={() => setShowBulkInput(true)}
            className="text-sm bg-teal-600 text-white px-3 py-1 rounded hover:bg-teal-700"
          >
            一括設定
          </button>
        </div>
      ) : null}

      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-500">
          {activeCount}件（除外除く） / 全{items.length}件
        </span>
        {!showBulkInput && selected.size === 0 && (
          <button
            onClick={() => {
              setSelected(new Set(items.map((i) => i.id)))
              setShowBulkInput(true)
            }}
            className="text-xs text-slate-500 hover:text-teal-600 border border-slate-200 hover:border-teal-400 px-2.5 py-1 rounded transition-colors"
          >
            一括設定
          </button>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-teal-700 sticky top-0 z-10">
              <tr>
                <th className="w-7 px-1.5 py-3" />
                <th className="w-8 px-2 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selected.size === items.length && items.length > 0}
                    onChange={toggleSelectAll}
                    className="accent-white"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white whitespace-nowrap">No</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white whitespace-nowrap min-w-[90px]">カテゴリ</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white whitespace-nowrap min-w-[120px]">名称</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white whitespace-nowrap min-w-[110px]">内容・仕様</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-white whitespace-nowrap">数量</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white whitespace-nowrap">単位</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-white whitespace-nowrap">原価単価</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-white whitespace-nowrap">原価合計</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-teal-200 whitespace-nowrap">売値単価</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-teal-200 whitespace-nowrap">売値金額</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white whitespace-nowrap min-w-[100px]">備考</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-white whitespace-nowrap">除外</th>
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
                    <tr className="border-t-2 border-slate-600 bg-slate-700">
                      <td colSpan={14} className="px-3 py-2">
                        <div className="flex items-center gap-3">
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
                            className="text-sm font-bold text-white bg-transparent border-b border-transparent hover:border-slate-400 focus:border-teal-400 focus:outline-none tracking-wide min-w-[120px] max-w-[300px]"
                          />

                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            {groupActive.length}件
                          </span>

                          <span className="text-slate-600">|</span>

                          <div className="flex items-center gap-1.5">
                            {(() => {
                              const mergedItem = groupItems.find((i) => i.mergedFrom)
                              if (mergedItem) {
                                return (
                                  <button
                                    onClick={() => unmergeItem(mergedItem.id)}
                                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-orange-400 bg-orange-900/20 text-orange-300 hover:bg-orange-900/40 transition-colors whitespace-nowrap"
                                    title={`統合を解除して${mergedItem.mergedFrom!.length}件の明細に戻す`}
                                  >
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 5h7M5.5 2L8.5 5L5.5 8" /></svg>
                                    統合を解除
                                  </button>
                                )
                              }
                              if (groupActive.length > 1) {
                                return (
                                  <button
                                    onClick={() => mergeCategory(category)}
                                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-slate-500 bg-slate-600 text-slate-300 hover:border-teal-400 hover:text-teal-300 transition-colors whitespace-nowrap"
                                    title="このカテゴリの項目を1行に統合"
                                  >
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 3h7M1.5 5h7M1.5 7h7" /></svg>
                                    統合
                                  </button>
                                )
                              }
                              return null
                            })()}
                          </div>
                        </div>
                      </td>
                    </tr>

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

                    {(groupSellingTotal > 0 || groupCostTotal > 0) && (
                      <tr className="bg-teal-50 border-t border-teal-100">
                        <td colSpan={9} className="px-3 py-1.5 text-right text-xs font-semibold text-teal-700">
                          小計
                        </td>
                        <td className="px-3 py-1.5 text-right text-xs font-semibold text-slate-500 whitespace-nowrap">
                          {groupCostTotal > 0 ? `¥${formatNum(Math.round(groupCostTotal))}` : ''}
                        </td>
                        <td />
                        <td className="px-3 py-1.5 text-right text-xs font-semibold text-teal-700 whitespace-nowrap">
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
              <tr className="bg-slate-800 text-white">
                <td colSpan={9} className="px-3 py-2.5 text-right text-xs font-bold tracking-wide">
                  合計（除外除く）
                </td>
                <td className="px-3 py-2.5 text-right text-xs font-bold whitespace-nowrap">
                  {totalCost > 0 ? `¥${formatNum(Math.round(totalCost))}` : '—'}
                </td>
                <td />
                <td className="px-3 py-2.5 text-right text-sm font-bold text-teal-300 whitespace-nowrap">
                  {totalSelling > 0 ? `¥${formatNum(totalSelling)}` : '—'}
                </td>
                <td colSpan={2} className="px-3 py-2.5 text-xs text-slate-400 whitespace-nowrap">
                  {totalCost > 0 && totalSelling > 0 && (() => {
                    const sellingForProfit = profitBase === 'tax_included'
                      ? Math.round(totalSelling * 1.1)
                      : totalSelling
                    const profit = sellingForProfit - totalCost
                    const profitRate = (profit / sellingForProfit * 100).toFixed(1)
                    return (
                      <>
                        粗利率{' '}
                        <span className="text-white font-semibold">{profitRate}%</span>
                        {profitBase === 'tax_included' && (
                          <span className="text-slate-500 ml-1">(税込)</span>
                        )}
                      </>
                    )
                  })()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </DndContext>

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
