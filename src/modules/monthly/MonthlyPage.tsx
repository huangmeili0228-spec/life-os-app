import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, ChevronLeft, ChevronRight, Trash2, Target } from 'lucide-react'
import { Page, PageHeader } from '../../components/layout/Page'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { Input, Textarea } from '../../components/ui/Input'
import { EmptyState } from '../../components/ui/EmptyState'
import { useConfirm } from '../../components/ui/Confirm'
import { db, type MonthlyKpi } from '../../db/database'
import { uid, nowISO } from '../../utils/date'

export function MonthlyPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [metricSheet, setMetricSheet] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  const monthly = useLiveQuery(
    () => db.monthlyKpis.where({ year, month }).first(),
    [year, month],
  )

  const ensureRecord = async (): Promise<MonthlyKpi> => {
    const existing = await db.monthlyKpis.where({ year, month }).first()
    if (existing) return existing
    const now = nowISO()
    const record: MonthlyKpi = { id: uid(), year, month, metrics: [], createdAt: now, updatedAt: now }
    await db.monthlyKpis.add(record)
    return record
  }

  const goPrev = () => { if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1) }
  const goNext = () => { if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1) }

  return (
    <Page>
      <PageHeader title="Monthly KPI" subtitle={`${year}年${month}月`} right={
        <div className="flex items-center gap-1">
          <button onClick={goPrev} className="tap w-9 h-9 flex items-center justify-center rounded-full text-[var(--color-text-tertiary)] active:bg-[var(--color-bg-hover)]"><ChevronLeft size={20} /></button>
          <button onClick={goNext} className="tap w-9 h-9 flex items-center justify-center rounded-full text-[var(--color-text-tertiary)] active:bg-[var(--color-bg-hover)]"><ChevronRight size={20} /></button>
        </div>
      } />

      <div className="px-4 space-y-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-[var(--color-text)]">本月指标</h2>
            <Button size="sm" variant="secondary" onClick={() => setMetricSheet(true)}><Plus size={16} /> 添加</Button>
          </div>
          {monthly && monthly.metrics.length > 0 ? (
            <div className="space-y-3">
              {monthly.metrics.map((m) => (
                <MetricRow key={m.id} metric={m}
                  onUpdate={async (actual) => {
                    if (!monthly) return
                    await db.monthlyKpis.update(monthly.id, { metrics: monthly.metrics.map(x => x.id === m.id ? { ...x, actual } : x), updatedAt: nowISO() })
                  }}
                  onDelete={async () => {
                    if (!monthly) return
                    await db.monthlyKpis.update(monthly.id, { metrics: monthly.metrics.filter(x => x.id !== m.id), updatedAt: nowISO() })
                  }}
                />
              ))}
            </div>
          ) : <EmptyState icon={<Target size={24} />} title="还没有本月指标" />}
        </Card>

        <Card className="tap cursor-pointer" onClick={() => setReviewOpen(true)}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/15 flex items-center justify-center"><Target size={20} className="text-[var(--color-accent)]" /></div>
            <div className="flex-1"><h3 className="text-[15px] font-medium text-[var(--color-text)]">{monthly?.review ? '查看月复盘' : '本月复盘'}</h3>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{monthly?.review ? '已完成，点击修改' : '这个月的高光与低谷'}</p></div>
          </div>
        </Card>
      </div>

      {metricSheet && <MetricSheet open={metricSheet} onClose={() => setMetricSheet(false)} onSave={async (name, target, unit) => {
        const record = await ensureRecord()
        await db.monthlyKpis.update(record.id, { metrics: [...record.metrics, { id: uid(), name, target, actual: 0, unit }], updatedAt: nowISO() })
        setMetricSheet(false)
      }} />}

      {monthly && <ReviewSheet open={reviewOpen} onClose={() => setReviewOpen(false)} review={monthly.review} onSave={async (review) => { await db.monthlyKpis.update(monthly.id, { review, updatedAt: nowISO() }); setReviewOpen(false) }} />}
    </Page>
  )
}

function MetricRow({ metric, onUpdate, onDelete }: { metric: { id: string; name: string; target: number; actual: number; unit: string }; onUpdate: (actual: number) => void; onDelete: () => void }) {
  const pct = metric.target ? Math.min(100, (metric.actual / metric.target) * 100) : 0
  const confirm = useConfirm()
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-text)]">{metric.name}</span>
          <button onClick={async () => { if (await confirm({ title: '删除？', danger: true, confirmText: '删除' })) onDelete() }} className="tap text-[var(--color-text-tertiary)]"><Trash2 size={13} /></button>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => onUpdate(Math.max(0, metric.actual - 1))} className="tap w-6 h-6 rounded-full bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] text-sm">−</button>
          <span className="text-sm font-medium text-[var(--color-text)] tabular-nums min-w-[60px] text-center">{metric.actual}/{metric.target} {metric.unit}</span>
          <button onClick={() => onUpdate(metric.actual + 1)} className="tap w-6 h-6 rounded-full bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] text-sm">+</button>
        </div>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-bg-hover)] overflow-hidden"><div className={'h-full transition-all duration-500 ' + (pct >= 100 ? 'bg-[var(--color-success)]' : 'bg-[var(--color-accent)]')} style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

function MetricSheet({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (name: string, target: number, unit: string) => void }) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('1')
  const [unit, setUnit] = useState('次')
  return (
    <Sheet open={open} onClose={onClose} title="添加指标" footer={<Button block onClick={() => onSave(name.trim(), Number(target) || 1, unit.trim())} disabled={!name.trim()}>添加</Button>}>
      <div className="space-y-4 pt-2">
        <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">指标名称</label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：阅读页数" autoFocus /></div>
        <div className="flex gap-3">
          <div className="flex-1"><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">目标值</label><Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} /></div>
          <div className="flex-1"><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">单位</label><Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="次/小时/页" /></div>
        </div>
      </div>
    </Sheet>
  )
}

function ReviewSheet({ open, onClose, review, onSave }: { open: boolean; onClose: () => void; review?: MonthlyKpi['review']; onSave: (review: NonNullable<MonthlyKpi['review']>) => void }) {
  const [highlights, setHighlights] = useState('')
  const [lowlights, setLowlights] = useState('')
  const [lesson, setLesson] = useState('')
  const [nextMonth, setNextMonth] = useState('')
  useEffect(() => { if (open) { setHighlights(review?.highlights ?? ''); setLowlights(review?.lowlights ?? ''); setLesson(review?.lesson ?? ''); setNextMonth(review?.nextMonth ?? '') } }, [open, review])
  return (
    <Sheet open={open} onClose={onClose} title="本月复盘" footer={<Button block onClick={() => onSave({ highlights, lowlights, lesson, nextMonth })}>保存</Button>}>
      <div className="space-y-4 pt-2">
        <F label="高光时刻" value={highlights} onChange={setHighlights} placeholder="这个月最骄傲的事" />
        <F label="不足之处" value={lowlights} onChange={setLowlights} placeholder="哪里做得不够" />
        <F label="学到了什么" value={lesson} onChange={setLesson} placeholder="一个关键教训" />
        <F label="下月重点" value={nextMonth} onChange={setNextMonth} placeholder="下个月最重要的事" />
      </div>
    </Sheet>
  )
}

function F({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">{label}</label><Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} /></div>
}
