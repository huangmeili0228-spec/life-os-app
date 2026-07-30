import { useState, useMemo, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, ChevronLeft, ChevronRight, Trash2, Target } from 'lucide-react'
import { Page, PageHeader } from '../../components/layout/Page'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { Input, Textarea } from '../../components/ui/Input'
import { EmptyState } from '../../components/ui/EmptyState'
import { useConfirm } from '../../components/ui/Confirm'
import { db, type WeeklyKpi } from '../../db/database'
import { uid, nowISO, startOfWeek, endOfWeek, addDays, parseDate, formatDate } from '../../utils/date'

export function WeeklyPage() {
  const [weekStart, setWeekStart] = useState(startOfWeek())
  const [metricSheet, setMetricSheet] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  const weekly = useLiveQuery(
    () => db.weeklyKpis.where('weekStart').equals(weekStart).first(),
    [weekStart],
  )

  const ensureRecord = async (): Promise<WeeklyKpi> => {
    const existing = await db.weeklyKpis.where('weekStart').equals(weekStart).first()
    if (existing) return existing
    const now = nowISO()
    const record: WeeklyKpi = {
      id: uid(),
      weekStart: weekStart,
      weekEnd: endOfWeek(parseDate(weekStart)),
      metrics: [],
      createdAt: now,
      updatedAt: now,
    }
    await db.weeklyKpis.add(record)
    return record
  }

  const weekLabel = useMemo(() => {
    const end = addDays(weekStart, 6)
    return `${formatDate(weekStart)} - ${formatDate(end)}`
  }, [weekStart])

  return (
    <Page>
      <PageHeader
        title="Weekly KPI"
        subtitle={weekLabel}
        right={
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              className="tap w-9 h-9 flex items-center justify-center rounded-full text-[var(--color-text-tertiary)] active:bg-[var(--color-bg-hover)]"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="tap w-9 h-9 flex items-center justify-center rounded-full text-[var(--color-text-tertiary)] active:bg-[var(--color-bg-hover)]"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        }
      />

      <div className="px-4 space-y-4">
        {/* 指标 */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-[var(--color-text)]">本周指标</h2>
            <Button size="sm" variant="secondary" onClick={() => setMetricSheet(true)}>
              <Plus size={16} /> 添加
            </Button>
          </div>

          {weekly && weekly.metrics.length > 0 ? (
            <div className="space-y-3">
              {weekly.metrics.map((m) => (
                <MetricRow
                  key={m.id}
                  metric={m}
                  onUpdate={async (actual) => {
                    if (!weekly) return
                    await db.weeklyKpis.update(weekly.id, {
                      metrics: weekly.metrics.map((x) =>
                        x.id === m.id ? { ...x, actual } : x,
                      ),
                      updatedAt: nowISO(),
                    })
                  }}
                  onDelete={async () => {
                    if (!weekly) return
                    await db.weeklyKpis.update(weekly.id, {
                      metrics: weekly.metrics.filter((x) => x.id !== m.id),
                      updatedAt: nowISO(),
                    })
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Target size={24} />}
              title="还没有本周指标"
              description="设定 3-5 个关键指标，量化这一周的前进"
            />
          )}
        </Card>

        {/* 周复盘 */}
        <Card className="tap cursor-pointer" onClick={() => setReviewOpen(true)}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/15 flex items-center justify-center">
              <Target size={20} className="text-[var(--color-accent)]" />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-medium text-[var(--color-text)]">
                {weekly?.review ? '查看周复盘' : '本周复盘'}
              </h3>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                {weekly?.review ? '已完成，点击修改' : '这周完成了什么？错过了什么？'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 指标编辑 */}
      {metricSheet && (
        <MetricSheet
          open={metricSheet}
          onClose={() => setMetricSheet(false)}
          onSave={async (name, target, unit) => {
            const record = await ensureRecord()
            await db.weeklyKpis.update(record.id, {
              metrics: [...record.metrics, { id: uid(), name, target, actual: 0, unit }],
              updatedAt: nowISO(),
            })
            setMetricSheet(false)
          }}
        />
      )}

      {/* 复盘 */}
      {weekly && (
        <ReviewSheet
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          review={weekly.review}
          onSave={async (review) => {
            await db.weeklyKpis.update(weekly.id, { review, updatedAt: nowISO() })
            setReviewOpen(false)
          }}
        />
      )}
    </Page>
  )
}

// ============================================================
function MetricRow({
  metric,
  onUpdate,
  onDelete,
}: {
  metric: { id: string; name: string; target: number; actual: number; unit: string }
  onUpdate: (actual: number) => void
  onDelete: () => void
}) {
  const pct = metric.target ? Math.min(100, (metric.actual / metric.target) * 100) : 0
  const confirm = useConfirm()
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-text)]">{metric.name}</span>
          <button
            onClick={async () => {
              if (await confirm({ title: '删除指标？', danger: true, confirmText: '删除' })) onDelete()
            }}
            className="tap text-[var(--color-text-tertiary)]"
          >
            <Trash2 size={13} />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onUpdate(Math.max(0, metric.actual - 1))}
            className="tap w-6 h-6 rounded-full bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] text-sm"
          >
            −
          </button>
          <span className="text-sm font-medium text-[var(--color-text)] tabular-nums min-w-[60px] text-center">
            {metric.actual}/{metric.target} {metric.unit}
          </span>
          <button
            onClick={() => onUpdate(metric.actual + 1)}
            className="tap w-6 h-6 rounded-full bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] text-sm"
          >
            +
          </button>
        </div>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-bg-hover)] overflow-hidden">
        <div
          className={
            'h-full transition-all duration-500 ' +
            (pct >= 100 ? 'bg-[var(--color-success)]' : 'bg-[var(--color-accent)]')
          }
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ============================================================
function MetricSheet({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (name: string, target: number, unit: string) => void
}) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('1')
  const [unit, setUnit] = useState('次')
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="添加指标"
      footer={
        <Button block onClick={() => onSave(name.trim(), Number(target) || 1, unit.trim())} disabled={!name.trim()}>
          添加
        </Button>
      }
    >
      <div className="space-y-4 pt-2">
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">指标名称</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：深度学习小时数" autoFocus />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">目标值</label>
            <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">单位</label>
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="次/小时/页" />
          </div>
        </div>
      </div>
    </Sheet>
  )
}

// ============================================================
function ReviewSheet({
  open,
  onClose,
  review,
  onSave,
}: {
  open: boolean
  onClose: () => void
  review?: WeeklyKpi['review']
  onSave: (review: NonNullable<WeeklyKpi['review']>) => void
}) {
  const [achieved, setAchieved] = useState('')
  const [missed, setMissed] = useState('')
  const [lesson, setLesson] = useState('')
  const [nextWeek, setNextWeek] = useState('')

  useEffect(() => {
    if (open) {
      setAchieved(review?.achieved ?? '')
      setMissed(review?.missed ?? '')
      setLesson(review?.lesson ?? '')
      setNextWeek(review?.nextWeek ?? '')
    }
  }, [open, review])

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="本周复盘"
      footer={<Button block onClick={() => onSave({ achieved, missed, lesson, nextWeek })}>保存</Button>}
    >
      <div className="space-y-4 pt-2">
        <Field label="完成了什么" value={achieved} onChange={setAchieved} placeholder="这一周的成果" />
        <Field label="没完成什么" value={missed} onChange={setMissed} placeholder="诚实地面对" />
        <Field label="学到了什么" value={lesson} onChange={setLesson} placeholder="一个教训或方法" />
        <Field label="下周重点" value={nextWeek} onChange={setNextWeek} placeholder="下周最重要的事" />
      </div>
    </Sheet>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">{label}</label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} />
    </div>
  )
}
