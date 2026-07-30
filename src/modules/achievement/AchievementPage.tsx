import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Trophy, Trash2 } from 'lucide-react'
import { Page, PageHeader } from '../../components/layout/Page'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { Input, Textarea } from '../../components/ui/Input'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/Confirm'
import { db, type Achievement } from '../../db/database'
import { uid, nowISO, toDateStr, dayLabel } from '../../utils/date'

const domains = ['学业', 'AI学习', '身体', '财务', '人格', '思想', '其他'] as const

export function AchievementPage() {
  const [filter, setFilter] = useState('全部')
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Achievement | null>(null)

  const achievements = useLiveQuery(() => db.achievements.orderBy('date').reverse().toArray(), [], [])

  const filtered = useMemo(() => {
    if (filter === '全部') return achievements ?? []
    return (achievements ?? []).filter((a) => a.domain === filter)
  }, [achievements, filter])

  return (
    <Page>
      <PageHeader
        title="Achievement"
        subtitle="里程碑归档"
        right={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus size={18} /> 记录</Button>}
      />

      <div className="px-4 mb-3 flex gap-2 overflow-x-auto no-scrollbar">
        {['全部', ...domains].map((d) => (
          <button key={d} onClick={() => setFilter(d)}
            className={'tap shrink-0 h-8 px-3 rounded-full text-xs font-medium border transition-colors ' + (filter === d ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white' : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]')}>
            {d}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-2.5">
        {filtered.length === 0 ? (
          <EmptyState icon={<Trophy size={26} />} title="还没有成就记录" description="把每个里程碑记录下来，给自己信心" />
        ) : filtered.map((a) => (
          <Card key={a.id} className="tap cursor-pointer" onClick={() => setEditing(a)}>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h3 className="text-[15px] font-medium text-[var(--color-text)]">{a.title}</h3>
              <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg-hover)] text-[var(--color-text-tertiary)]">{a.domain}</span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">{a.description}</p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1.5">{dayLabel(a.date)}</p>
          </Card>
        ))}
      </div>

      {(createOpen || editing) && (
        <AchievementEditor
          open={createOpen || !!editing}
          item={editing ?? undefined}
          onClose={() => { setCreateOpen(false); setEditing(null) }}
          onSave={async (data) => {
            if (editing) { await db.achievements.update(editing.id, { ...data, updatedAt: nowISO() }) }
            else { const now = nowISO(); await db.achievements.add({ ...data, id: uid(), createdAt: now, updatedAt: now }) }
            setCreateOpen(false); setEditing(null)
          }}
          onDelete={editing ? async () => { await db.achievements.delete(editing.id); setEditing(null) } : undefined}
        />
      )}
    </Page>
  )
}

function AchievementEditor({ open, item, onClose, onSave, onDelete }: { open: boolean; item?: Achievement; onClose: () => void; onSave: (data: Omit<Achievement, 'id'|'createdAt'|'updatedAt'>) => void; onDelete?: () => void }) {
  const [date, setDate] = useState(item?.date ?? toDateStr())
  const [title, setTitle] = useState(item?.title ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [domain, setDomain] = useState(item?.domain ?? '学业')
  const [significance, setSignificance] = useState(item?.significance ?? '')
  const confirm = useConfirm()
  const toast = useToast()

  return (
    <Sheet open={open} onClose={onClose} title={item ? '编辑成就' : '记录成就'} footer={
      <div className="flex gap-2">
        {onDelete && <Button variant="danger" onClick={async () => { if (await confirm({ title: '删除？', danger: true, confirmText: '删除' })) { onDelete(); toast('已删除') } }}><Trash2 size={18} /></Button>}
        <Button block onClick={() => onSave({ date, title: title.trim(), description: description.trim(), domain, significance: significance.trim() })} disabled={!title.trim()}>保存</Button>
      </div>
    }>
      <div className="space-y-4 pt-2">
        <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">日期</label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">标题</label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="成就名称" autoFocus /></div>
        <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">描述</label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="做了什么，达成了什么" rows={3} /></div>
        <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">领域</label>
          <div className="flex flex-wrap gap-2">
            {domains.map((d) => <button key={d} onClick={() => setDomain(d)} className={'tap h-8 px-3 rounded-full text-xs border transition-colors ' + (domain === d ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white' : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]')}>{d}</button>)}
          </div>
        </div>
        <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">为什么重要</label><Textarea value={significance} onChange={(e) => setSignificance(e.target.value)} placeholder="这个成就对长期目标意味着什么" rows={2} /></div>
      </div>
    </Sheet>
  )
}
