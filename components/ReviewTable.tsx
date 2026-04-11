'use client'

import { useState, useMemo, Fragment } from 'react'
import { EstimateItem, RoundingMode, MarkupSettings } from '@/lib/types'
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
  markupSettings: MarkupSettings
  collapsedCategories: Set<string>
  onToggleCategoryCollapse: (category: string) => void
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

export default function ReviewTable({ items, onUpdate, roundingMode, markupSettings, collapsedCategories, onToggleCategoryCollapse }: ReviewTableProps) {
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
    downloadCSV(active, filename)
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
      {showBulkInput ? (
        <div className="flex items-center gap-3 mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm text-blue-700 font-medium">{selected.size}件選択中</span>
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
            <button onClick={() => { setShowBulkInput(false); setSelected(new Set()) }} className="text-sm text-gray-500 hover:text-gray-700">
              キャンセル
            </button>
          </div>
        </div>
      ) : selected.size > 0 ? (
        <div className="flex items-center gap-3 mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm text-blue-700 font-medium">{selected.size}件選択中</span>
          <button
            onClick={() => setShowBulkInput(true)}
            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            一括設定
          </button>
        </div>
      ) : null}

      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">
          {activeCount}件（除外除く） / 全{items.length}件
        </span>
        {!showBulkInput && selected.size === 0 && (
          <button
            onClick={() => {
              setSelected(new Set(items.map((i) => i.id)))
              setShowBulkInput(true)
            }}
            className="text-xs text-gray-500 hover:text-blue-600 border border-gray-300 hover:border-blue-400 px-2.5 py-1 rounded transition-colors"
          >
            一括設定
          </button>
        )}
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
                const isCollapsed = collapsedCategories.has(category)

                return (
                  <Fragment key={category}>
                    {/* カテゴリヘッダー行 */}
                    <tr className={`border-t-2 border-gray-300 ${isCollapsed ? 'bg-amber-50' : 'bg-gray-100'}`}>
                      <td colSpan={14} className="px-3 py-2">
                        <div className="flex items-center gap-3">
                          {/* カテゴリ名 */}
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
                            className="text-sm font-bold text-gray-700 bg-transparent border-b border-transparent hover:border-gray-400 focus:border-blue-400 focus:outline-none tracking-wide min-w-[120px] max-w-[300px]"
                          />

                          {/* 件数バッジ */}
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {groupActive.length}件
                          </span>

                          {/* 区切り */}
                          <span className="text-gray-300">|</span>

                          {/* 操作ボタン群 */}
                          <div className="flex items-center gap-1.5">
                            {/* まとめ／明細トグル */}
                            {groupActive.length > 1 && (
                              <button
                                onClick={() => onToggleCategoryCollapse(category)}
                                className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ${
                                  isCollapsed
                                    ? 'border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200 font-medium'
                                    : 'border-gray-300 bg-white text-gray-500 hover:border-amber-400 hover:text-amber-600'
                                }`}
                              >
                                {isCollapsed ? (
                                  <>
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2.5 4L5 6.5L7.5 4" /></svg>
                                    明細に戻す
                                  </>
                                ) : (
                                  <>
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2.5 6L5 3.5L7.5 6" /></svg>
                                    まとめ
                                  </>
                                )}
                              </button>
                            )}

                            {/* 統合（破壊的）／元に戻す */}
                            {(() => {
                              const mergedItem = groupItems.find((i) => i.mergedFrom)
                              if (mergedItem) {
                                return (
                                  <button
                                    onClick={() => unmergeItem(mergedItem.id)}
                                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-orange-300 bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors whitespace-nowrap"
                                    title={`統合を解除して${mergedItem.mergedFrom!.length}件の明細に戻す`}
                                  >
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 5h7M5.5 2L8.5 5L5.5 8" /></svg>
                                    統合を解除
                                  </button>
                                )
                              }
                              if (!isCollapsed && groupActive.length > 1) {
                                return (
                                  <button
                                    onClick={() => mergeCategory(category)}
                                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-gray-300 bg-white text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors whitespace-nowrap"
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

                          {/* まとめ時の金額サマリー（右寄せ） */}
                          {isCollapsed && (
                            <div className="ml-auto flex items-center gap-4">
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                原価 <span className="font-semibold">{groupCostTotal > 0 ? `¥${formatNum(Math.round(groupCostTotal))}` : '—'}</span>
                              </span>
                              <span className="text-xs text-blue-600 whitespace-nowrap">
                                売値 <span className="font-bold">{groupSellingTotal > 0 ? `¥${formatNum(groupSellingTotal)}` : '—'}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>

                    {isCollapsed ? (
                      /* まとめ表示時は明細行なし（ヘッダーにサマリーを表示済み） */
                      null
                    ) : (
                      /* 明細表示：個別行（ドラッグ&ドロップ対応） */
                      <>
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
                      </>
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
