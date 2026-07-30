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
import { db, type QuarterlyKpi } from '../../db/database'
import { uid, nowISO } from '../../utils/date'

export function QuarterlyPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [quarter, setQuarter] = useState(Math.ceil((today.getMonth() + 1) / 3))
  const [goalSheet, setGoalSheet] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  const quarterly = useLiveQuery(() => db.quarterlyKpis.where({ year, quarter }).first(), [year, quarter])

  const ensureRecord = async (): Promise<QuarterlyKpi> => {
    const existing = await db.quarterlyKpis.where({ year, quarter }).first()
    if (existing) return existing
    const now = nowISO()
    const record: QuarterlyKpi = { id: uid(), year, quarter, goals: [], createdAt: now, updatedAt: now }
    await db.quarterlyKpis.add(record)
    return record
  }

  const goPrev = () => { if (quarter === 1) { setYear(y => y - 1); setQuarter(4) } else setQuarter(q => q - 1) }
  const goNext = () => { if (quarter === 4) { setYear(y => y + 1); setQuarter(1) } else setQuarter(q => q + 1) }

  return (
    <Page>
      <PageHeader title="Quarterly KPI" subtitle={`${year}年 Q${quarter}`} right={
        <div className="flex items-center gap-1">
          <button onClick={goPrev} className="tap w-9 h-9 flex items-center justify-center rounded-full text-[var(--color-text-tertiary)] active:bg-[var(--color-bg-hover)]"><ChevronLeft size={20} /></button>
          <button onClick={goNext} className="tap w-9 h-9 flex items-center justify-center rounded-full text-[var(--color-text-tertiary)] active:bg-[var(--color-bg-hover)]"><ChevronRight size={20} /></button>
        </div>
      } />

      <div className="px-4 space-y-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-[var(--color-text)]">季度目标</h2>
            <Button size="sm" variant="secondary" onClick={() => setGoalSheet(true)}><Plus size={16} /> 添加</Button>
          </div>
          {quarterly && quarterly.goals.length > 0 ? (
            <div className="space-y-3">
              {quarterly.goals.map((g) => (
                <GoalRow key={g.id} goal={g}
                  onStatusChange={async (status) => { if (!quarterly) return; await db.quarterlyKpis.update(quarterly.id, { goals: quarterly.goals.map(x => x.id === g.id ? { ...x, status } : x), updatedAt: nowISO() }) }}
                  onProgress={async (progress) => { if (!quarterly) return; await db.quarterlyKpis.update(quarterly.id, { goals: quarterly.goals.map(x => x.id === g.id ? { ...x, progress } : x), updatedAt: nowISO() }) }}
                  onDelete={async () => { if (!quarterly) return; await db.quarterlyKpis.update(quarterly.id, { goals: quarterly.goals.filter(x => x.id !== g.id), updatedAt: nowISO() }) }}
                />
              ))}
            </div>
          ) : <EmptyState icon={<Target size={24} />} title="还没有季度目标" />}
        </Card>

        <Card className="tap cursor-pointer" onClick={() => setReviewOpen(true)}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/15 flex items-center justify-center"><Target size={20} className="text-[var(--color-accent)]" /></div>
            <div className="flex-1"><h3 className="text-[15px] font-medium text-[var(--color-text)]">{quarterly?.review ? '查看季度复盘' : '季度复盘'}</h3>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{quarterly?.review ? '已完成，点击修改' : '这个季度走到哪里了'}</p></div>
          </div>
        </Card>
      </div>

      {goalSheet && <GoalSheet open={goalSheet} onClose={() => setGoalSheet(false)} onSave={async (name, note) => {
        const record = await ensureRecord()
        await db.quarterlyKpis.update(record.id, { goals: [...record.goals, { id: uid(), name, status: 'on-track', progress: 0, note }], updatedAt: nowISO() })
        setGoalSheet(false)
      }} />}

      {quarterly && <ReviewSheet open={reviewOpen} onClose={() => setReviewOpen(false)} review={quarterly.review} onSave={async (review) => { await db.quarterlyKpis.update(quarterly.id, { review, updatedAt: nowISO() }); setReviewOpen(false) }} />}
    </Page>
  )
}

function GoalRow({ goal, onStatusChange, onProgress, onDelete }: { goal: { id: string; name: string; status: string; progress: number; note: string }; onStatusChange: (s: any) => void; onProgress: (p: number) => void; onDelete: () => void }) {
  const confirm = useConfirm()
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm text-[var(--color-text)] truncate">{goal.name}</span>
          <select value={goal.status} onChange={(e) => onStatusChange(e.target.value)} className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] border-none cursor-pointer">
            <option value="on-track">顺利</option><option value="at-risk">风险</option><option value="behind">落后</option><option value="done">完成</option>
          </select>
          <button onClick={async () => { if (await confirm({ title: '删除？', danger: true, confirmText: '删除' })) onDelete() }} className="tap text-[var(--color-text-tertiary)]"><Trash2 size={13} /></button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onProgress(Math.max(0, goal.progress - 5))} className="tap w-5 h-5 rounded-full bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] text-xs">−</button>
          <span className="text-xs font-medium tabular-nums min-w-[32px] text-center">{goal.progress}%</span>
          <button onClick={() => onProgress(Math.min(100, goal.progress + 5))} className="tap w-5 h-5 rounded-full bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] text-xs">+</button>
        </div>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-bg-hover)] overflow-hidden"><div className={'h-full transition-all duration-500 ' + (goal.progress >= 100 ? 'bg-[var(--color-success)]' : goal.progress >= 50 ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-warning)]')} style={{ width: `${goal.progress}%` }} /></div>
      {goal.note && <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">{goal.note}</p>}
    </div>
  )
}

function GoalSheet({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (name: string, note: string) => void }) {
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  return (
    <Sheet open={open} onClose={onClose} title="添加目标" footer={<Button block onClick={() => onSave(name.trim(), note.trim())} disabled={!name.trim()}>添加</Button>}>
      <div className="space-y-4 pt-2">
        <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">目标名称</label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：完成保研材料" autoFocus /></div>
        <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">备注</label><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="补充说明" rows={2} /></div>
      </div>
    </Sheet>
  )
}

function ReviewSheet({ open, onClose, review, onSave }: { open: boolean; onClose: () => void; review?: string; onSave: (review: string) => void }) {
  const [text, setText] = useState('')
  useEffect(() => { if (open) setText(review ?? '') }, [open, review])
  return (
    <Sheet open={open} onClose={onClose} title="季度复盘" footer={<Button block onClick={() => onSave(text.trim())}>保存</Button>}>
      <div className="pt-2"><Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="这个季度最大的收获和教训" rows={6} /></div>
    </Sheet>
  )
}
