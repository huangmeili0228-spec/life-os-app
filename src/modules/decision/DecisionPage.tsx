import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Scale, Trash2, Star, RotateCcw, Check, ChevronRight } from 'lucide-react'
import { Page, PageHeader } from '../../components/layout/Page'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { Input, Textarea } from '../../components/ui/Input'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/Confirm'
import { db, type DecisionRecord } from '../../db/database'
import { uid, nowISO, toDateStr, dayLabel, formatDate } from '../../utils/date'

// ============================================================
// 主页面
// ============================================================
export function DecisionPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<DecisionRecord | null>(null)
  const [reviewing, setReviewing] = useState<DecisionRecord | null>(null)

  const records = useLiveQuery(
    () => db.decisions.orderBy('date').reverse().toArray(),
    [],
    [],
  )

  return (
    <Page>
      <PageHeader
        title="Decision Log"
        subtitle="今天我做了什么重要决定"
        right={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={18} /> 记录
          </Button>
        }
      />

      <div className="px-4 space-y-4">
        {records && records.length > 0 ? (
          <div className="space-y-2.5">
            {records.map((r) => (
              <DecisionCard
                key={r.id}
                record={r}
                onClick={() => setEditing(r)}
                onReview={() => setReviewing(r)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Scale size={26} />}
            title="还没有决策记录"
            description="记录每一个重要决定，追踪结果，从经验中学习"
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={16} /> 开始记录
              </Button>
            }
          />
        )}
      </div>

      {/* 新建/编辑 */}
      {(createOpen || editing) && (
        <DecisionEditor
          open={createOpen || !!editing}
          item={editing ?? undefined}
          onClose={() => {
            setCreateOpen(false)
            setEditing(null)
          }}
          onSave={async (data) => {
            if (editing) {
              await db.decisions.update(editing.id, { ...data, updatedAt: nowISO() })
            } else {
              const now = nowISO()
              await db.decisions.add({ ...data, id: uid(), createdAt: now, updatedAt: now })
            }
            setCreateOpen(false)
            setEditing(null)
          }}
          onDelete={
            editing
              ? async () => {
                  await db.decisions.delete(editing.id)
                  setEditing(null)
                }
              : undefined
          }
        />
      )}

      {/* 回溯 */}
      {reviewing && (
        <ReviewEditor
          open={!!reviewing}
          item={reviewing}
          onClose={() => setReviewing(null)}
          onSave={async (data) => {
            await db.decisions.update(reviewing.id, { ...data, updatedAt: nowISO() })
            setReviewing(null)
          }}
        />
      )}
    </Page>
  )
}

// ============================================================
// 决策卡片
// ============================================================
function DecisionCard({
  record,
  onClick,
  onReview,
}: {
  record: DecisionRecord
  onClick: () => void
  onReview: () => void
}) {
  const chosenOption = record.options.find((o) => o.chosen)
  const hasReview = !!(record.actualOutcome || record.lesson)

  return (
    <Card className="tap cursor-pointer" onClick={onClick}>
      {/* 头部：日期 + 重要性 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-tertiary)]">
            {dayLabel(record.date)}
          </span>
          {hasReview && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)] font-medium flex items-center gap-0.5">
              <RotateCcw size={9} /> 已回溯
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={11}
              className={
                n <= record.importance
                  ? 'text-[var(--color-warning)] fill-[var(--color-warning)]'
                  : 'text-[var(--color-text-tertiary)]'
              }
            />
          ))}
        </div>
      </div>

      {/* 标题 */}
      <h3 className="text-[15px] font-semibold text-[var(--color-text)] mb-1.5 leading-snug">
        {record.title}
      </h3>

      {/* 选择的选项 */}
      {chosenOption && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-4 h-4 rounded-full bg-[var(--color-accent)]/15 flex items-center justify-center shrink-0">
            <Check size={10} className="text-[var(--color-accent)]" />
          </div>
          <span className="text-sm text-[var(--color-accent)] font-medium">
            {chosenOption.text}
          </span>
        </div>
      )}

      {/* 理由 */}
      {record.reasoning && (
        <p className="text-xs text-[var(--color-text-tertiary)] line-clamp-2 leading-relaxed">
          {record.reasoning}
        </p>
      )}

      {/* 回溯摘要 */}
      {hasReview && (
        <div className="mt-2 pt-2 border-t border-[var(--color-border-subtle)] space-y-1">
          {record.actualOutcome && (
            <p className="text-xs text-[var(--color-text-secondary)]">
              <span className="text-[var(--color-text-tertiary)]">实际：</span>
              {record.actualOutcome}
            </p>
          )}
          {record.lesson && (
            <p className="text-xs text-[var(--color-text-secondary)]">
              <span className="text-[var(--color-text-tertiary)]">教训：</span>
              {record.lesson}
            </p>
          )}
        </div>
      )}

      {/* 回溯按钮 */}
      {!hasReview && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onReview()
          }}
          className="tap mt-2.5 w-full h-8 rounded-lg bg-[var(--color-bg-hover)] text-xs font-medium text-[var(--color-text-secondary)] flex items-center justify-center gap-1.5"
        >
          <RotateCcw size={13} /> 回溯结果
        </button>
      )}

      {/* 已回溯的也允许更新 */}
      {hasReview && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onReview()
          }}
          className="tap mt-2 w-full h-7 text-xs text-[var(--color-text-tertiary)] flex items-center justify-center gap-1"
        >
          更新回溯 <ChevronRight size={12} />
        </button>
      )}
    </Card>
  )
}

// ============================================================
// 新建/编辑 Sheet
// ============================================================
function DecisionEditor({
  open,
  item,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  item?: DecisionRecord
  onClose: () => void
  onSave: (data: Omit<DecisionRecord, 'id' | 'createdAt' | 'updatedAt'>) => void
  onDelete?: () => void
}) {
  const [date, setDate] = useState(item?.date ?? toDateStr())
  const [title, setTitle] = useState(item?.title ?? '')
  const [context, setContext] = useState(item?.context ?? '')
  const [options, setOptions] = useState<{ id: string; text: string; chosen: boolean }[]>(
    item?.options ?? [
      { id: uid(), text: '', chosen: false },
      { id: uid(), text: '', chosen: false },
    ],
  )
  const [reasoning, setReasoning] = useState(item?.reasoning ?? '')
  const [expectedOutcome, setExpectedOutcome] = useState(item?.expectedOutcome ?? '')
  const [importance, setImportance] = useState(item?.importance ?? 3)
  const [reviewDate, setReviewDate] = useState(item?.reviewDate ?? '')

  const toast = useToast()
  const confirm = useConfirm()

  const addOption = () => {
    setOptions((prev) => [...prev, { id: uid(), text: '', chosen: false }])
  }

  const removeOption = (id: string) => {
    setOptions((prev) => prev.filter((o) => o.id !== id))
  }

  const updateOptionText = (id: string, text: string) => {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)))
  }

  const toggleChosen = (id: string) => {
    setOptions((prev) =>
      prev.map((o) => ({ ...o, chosen: o.id === id ? !o.chosen : false })),
    )
  }

  const handleSave = () => {
    const data: Omit<DecisionRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      date,
      title: title.trim(),
      context: context.trim(),
      options: options
        .filter((o) => o.text.trim())
        .map((o) => ({ ...o, text: o.text.trim() })),
      reasoning: reasoning.trim(),
      expectedOutcome: expectedOutcome.trim(),
      importance,
    }
    if (reviewDate) data.reviewDate = reviewDate
    // 保留已有回溯数据
    if (item?.actualOutcome) data.actualOutcome = item.actualOutcome
    if (item?.lesson) data.lesson = item.lesson
    onSave(data)
  }

  const canSave = title.trim().length > 0

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={item ? '编辑决策' : '记录决策'}
      footer={
        <div className="flex gap-2">
          {onDelete && (
            <Button
              variant="danger"
              onClick={async () => {
                if (
                  await confirm({
                    title: '删除这条决策？',
                    message: '删除后无法恢复',
                    danger: true,
                    confirmText: '删除',
                  })
                ) {
                  onDelete()
                  toast('已删除')
                }
              }}
            >
              <Trash2 size={18} />
            </Button>
          )}
          <Button block onClick={handleSave} disabled={!canSave}>
            保存
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pt-2">
        {/* 日期 */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            日期
          </label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {/* 标题 */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            决策标题
          </label>
          <Input
            placeholder="做了什么决定"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* 决策背景 */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            决策背景
          </label>
          <Textarea
            placeholder="为什么需要做这个决定？面临什么情况？"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={2}
          />
        </div>

        {/* 选项列表 */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">
            选项（勾选最终选择的）
          </label>
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div key={opt.id} className="flex items-center gap-2">
                <button
                  onClick={() => toggleChosen(opt.id)}
                  className={
                    'tap w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ' +
                    (opt.chosen
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
                      : 'border-[var(--color-border)]')
                  }
                >
                  {opt.chosen && <Check size={14} className="text-white" />}
                </button>
                <Input
                  placeholder={`选项 ${idx + 1}`}
                  value={opt.text}
                  onChange={(e) => updateOptionText(opt.id, e.target.value)}
                  className="flex-1"
                />
                {options.length > 2 && (
                  <button
                    onClick={() => removeOption(opt.id)}
                    className="tap w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-text-tertiary)] active:bg-[var(--color-bg-hover)] shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addOption}
            className="tap mt-2 text-xs text-[var(--color-accent)] flex items-center gap-1"
          >
            <Plus size={13} /> 添加选项
          </button>
        </div>

        {/* 决策理由 */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            决策理由
          </label>
          <Textarea
            placeholder="为什么选这个选项？"
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            rows={2}
          />
        </div>

        {/* 预期结果 */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            预期结果
          </label>
          <Textarea
            placeholder="你觉得会怎样？"
            value={expectedOutcome}
            onChange={(e) => setExpectedOutcome(e.target.value)}
            rows={2}
          />
        </div>

        {/* 重要性 */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">
            重要性 (1-5)
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setImportance(n)}
                className={
                  'tap flex-1 h-11 rounded-xl border flex items-center justify-center transition-colors ' +
                  (importance === n
                    ? 'border-[var(--color-accent)] bg-[var(--color-bg-hover)]'
                    : 'border-[var(--color-border-subtle)]')
                }
              >
                <Star
                  size={20}
                  className={
                    n <= importance
                      ? 'text-[var(--color-warning)] fill-[var(--color-warning)]'
                      : 'text-[var(--color-text-tertiary)]'
                  }
                />
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1.5 text-center">
            {['一般', '有些重要', '重要', '很重要', '关键决策'][importance - 1]}
          </p>
        </div>

        {/* 回溯日期 */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            回溯日期（可选）
          </label>
          <Input
            type="date"
            value={reviewDate}
            onChange={(e) => setReviewDate(e.target.value)}
          />
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
            设定一个日期回来检查决策结果
          </p>
        </div>
      </div>
    </Sheet>
  )
}

// ============================================================
// 回溯编辑 Sheet
// ============================================================
function ReviewEditor({
  open,
  item,
  onClose,
  onSave,
}: {
  open: boolean
  item: DecisionRecord
  onClose: () => void
  onSave: (data: { actualOutcome: string; lesson: string; reviewDate?: string }) => void
}) {
  const [actualOutcome, setActualOutcome] = useState(item.actualOutcome ?? '')
  const [lesson, setLesson] = useState(item.lesson ?? '')
  const [reviewDate, setReviewDate] = useState(item.reviewDate ?? toDateStr())
  const toast = useToast()

  const chosenOption = item.options.find((o) => o.chosen)

  const handleSave = () => {
    onSave({
      actualOutcome: actualOutcome.trim(),
      lesson: lesson.trim(),
      reviewDate: reviewDate || undefined,
    })
    toast('回溯已保存')
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="决策回溯"
      footer={
        <Button
          block
          onClick={handleSave}
          disabled={!actualOutcome.trim() && !lesson.trim()}
        >
          保存回溯
        </Button>
      }
    >
      <div className="space-y-4 pt-2">
        {/* 决策回顾 */}
        <Card className="bg-[var(--color-bg-hover)] border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs text-[var(--color-text-tertiary)]">
              {formatDate(item.date, true)}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">
            {item.title}
          </h3>
          {chosenOption && (
            <div className="flex items-center gap-1.5">
              <Check size={12} className="text-[var(--color-accent)]" />
              <span className="text-xs text-[var(--color-accent)]">
                {chosenOption.text}
              </span>
            </div>
          )}
          {item.expectedOutcome && (
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1.5">
              当初预期：{item.expectedOutcome}
            </p>
          )}
        </Card>

        {/* 实际结果 */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            实际结果
          </label>
          <Textarea
            placeholder="后来实际发生了什么？"
            value={actualOutcome}
            onChange={(e) => setActualOutcome(e.target.value)}
            rows={3}
          />
        </div>

        {/* 教训 */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            学到了什么
          </label>
          <Textarea
            placeholder="从这个决定中学到什么？如果重来会怎样？"
            value={lesson}
            onChange={(e) => setLesson(e.target.value)}
            rows={3}
          />
        </div>

        {/* 回溯日期 */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            回溯日期
          </label>
          <Input
            type="date"
            value={reviewDate}
            onChange={(e) => setReviewDate(e.target.value)}
          />
        </div>
      </div>
    </Sheet>
  )
}
