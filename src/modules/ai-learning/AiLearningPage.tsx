import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Bot, Trash2 } from 'lucide-react'
import { Page, PageHeader } from '../../components/layout/Page'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { Input, Textarea } from '../../components/ui/Input'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/Confirm'
import { db, type AiLearningRecord } from '../../db/database'
import { uid, nowISO, toDateStr, dayLabel } from '../../utils/date'

const topics = ['Prompt', 'API', 'Python', 'Agent', 'Codex', '自动化', 'AI项目', '其他']

export function AiLearningPage() {
  const [filter, setFilter] = useState('全部')
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<AiLearningRecord | null>(null)

  const records = useLiveQuery(() => db.aiLearning.orderBy('date').reverse().toArray(), [], [])

  const filtered = useMemo(() => {
    if (filter === '全部') return records ?? []
    return (records ?? []).filter((r) => r.topic === filter)
  }, [records, filter])

  return (
    <Page>
      <PageHeader title="AI Learning" subtitle="AI 学习记录" right={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus size={18} /> 记录</Button>} />

      <div className="px-4 mb-3 flex gap-2 overflow-x-auto no-scrollbar">
        {['全部', ...topics].map((t) => (
          <button key={t} onClick={() => setFilter(t)} className={'tap shrink-0 h-8 px-3 rounded-full text-xs font-medium border transition-colors ' + (filter === t ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white' : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]')}>{t}</button>
        ))}
      </div>

      <div className="px-4 space-y-2.5">
        {filtered.length === 0 ? (
          <EmptyState icon={<Bot size={26} />} title="还没有 AI 学习记录" description="记录你在 AI 领域的每一步成长" />
        ) : filtered.map((r) => (
          <Card key={r.id} className="tap cursor-pointer" onClick={() => setEditing(r)}>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)]">{r.topic}</span>
                <span className="text-xs text-[var(--color-text-tertiary)]">{dayLabel(r.date)}</span>
              </div>
              <div className="flex gap-0.5">{[1,2,3,4,5].map(n => <span key={n} className={'w-1.5 h-1.5 rounded-full ' + (n <= r.level ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]')} />)}</div>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">{r.content}</p>
            {r.practice && <p className="text-xs text-[var(--color-text-tertiary)] mt-1.5">实践：{r.practice}</p>}
          </Card>
        ))}
      </div>

      {(createOpen || editing) && <AIEditor open={createOpen || !!editing} item={editing ?? undefined} onClose={() => { setCreateOpen(false); setEditing(null) }}
        onSave={async (data) => {
          if (editing) { await db.aiLearning.update(editing.id, { ...data, updatedAt: nowISO() }) }
          else { const now = nowISO(); await db.aiLearning.add({ ...data, id: uid(), createdAt: now, updatedAt: now }) }
          setCreateOpen(false); setEditing(null)
        }}
        onDelete={editing ? async () => { await db.aiLearning.delete(editing.id); setEditing(null) } : undefined}
      />}
    </Page>
  )
}

function AIEditor({ open, item, onClose, onSave, onDelete }: { open: boolean; item?: AiLearningRecord; onClose: () => void; onSave: (data: Omit<AiLearningRecord, 'id'|'createdAt'|'updatedAt'>) => void; onDelete?: () => void }) {
  const [date, setDate] = useState(item?.date ?? toDateStr())
  const [topic, setTopic] = useState(item?.topic ?? 'Prompt')
  const [content, setContent] = useState(item?.content ?? '')
  const [practice, setPractice] = useState(item?.practice ?? '')
  const [resources, setResources] = useState(item?.resources ?? '')
  const [level, setLevel] = useState(item?.level ?? 3)
  const confirm = useConfirm()
  const toast = useToast()

  return (
    <Sheet open={open} onClose={onClose} title={item ? '编辑' : '记录'} footer={
      <div className="flex gap-2">
        {onDelete && <Button variant="danger" onClick={async () => { if (await confirm({ title: '删除？', danger: true, confirmText: '删除' })) { onDelete(); toast('已删除') } }}><Trash2 size={18} /></Button>}
        <Button block onClick={() => onSave({ date, topic, content: content.trim(), practice: practice.trim() || undefined, resources: resources.trim() || undefined, level })} disabled={!content.trim()}>保存</Button>
      </div>
    }>
      <div className="space-y-4 pt-2">
        <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">日期</label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">主题</label>
          <div className="flex flex-wrap gap-2">{topics.map((t) => <button key={t} onClick={() => setTopic(t)} className={'tap h-8 px-3 rounded-full text-xs border transition-colors ' + (topic === t ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white' : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]')}>{t}</button>)}</div>
        </div>
        <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">学习内容</label><Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="今天学了什么" rows={4} autoFocus /></div>
        <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">实践项目</label><Input value={practice} onChange={(e) => setPractice(e.target.value)} placeholder="做了什么练习" /></div>
        <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">资源链接</label><Input value={resources} onChange={(e) => setResources(e.target.value)} placeholder="相关链接（可选）" /></div>
        <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">掌握程度</label>
          <div className="flex gap-2">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setLevel(n)} className={'tap flex-1 h-10 rounded-xl border text-sm transition-colors ' + (level === n ? 'border-[var(--color-accent)] bg-[var(--color-bg-hover)] text-[var(--color-text)]' : 'border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)]')}>{n}</button>)}</div>
        </div>
      </div>
    </Sheet>
  )
}
