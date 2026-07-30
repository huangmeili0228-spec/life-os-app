import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Brain, Search, Trash2, BookOpen, Tag } from 'lucide-react'
import { Page, PageHeader } from '../../components/layout/Page'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { Input, Textarea } from '../../components/ui/Input'
import { Segmented, EmptyState } from '../../components/ui/EmptyState'
import { useConfirm } from '../../components/ui/Confirm'
import { db, type SecondBrainItem } from '../../db/database'
import { uid, nowISO, timeAgo } from '../../utils/date'

const typeConfig: Record<SecondBrainItem['type'], { label: string; icon: typeof BookOpen }> = {
  paper: { label: '论文', icon: BookOpen },
  course: { label: '课程', icon: BookOpen },
  article: { label: '文章', icon: BookOpen },
  'ai-resource': { label: 'AI资源', icon: Brain },
  tool: { label: '工具', icon: Brain },
  other: { label: '其他', icon: BookOpen },
}

const statusLabels: Record<SecondBrainItem['status'], string> = {
  'to-read': '待读',
  reading: '在读',
  done: '已读',
  archived: '归档',
}

export function SecondBrainPage() {
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<SecondBrainItem | null>(null)
  const [detail, setDetail] = useState<SecondBrainItem | null>(null)

  const items = useLiveQuery(() => db.secondBrain.toArray(), [], [])

  const filtered = useMemo(() => {
    let list = items ?? []
    if (filterType !== 'all') list = list.filter((i) => i.type === filterType)
    if (filterStatus !== 'all') list = list.filter((i) => i.status === filterStatus)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((i) => i.title.toLowerCase().includes(q) || i.tags.some((t) => t.toLowerCase().includes(q)))
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [items, filterType, filterStatus, search])

  return (
    <Page>
      <PageHeader title="Second Brain" subtitle="长期资料库" right={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus size={18} /> 添加</Button>} />

      <div className="px-4 mb-3"><div className="relative"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" /><Input placeholder="搜索标题、标签…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div></div>

      <div className="px-4 mb-3 flex gap-2 overflow-x-auto no-scrollbar">
        {['all', ...Object.keys(typeConfig)].map((t) => (
          <button key={t} onClick={() => setFilterType(t)}
            className={'tap shrink-0 h-8 px-3 rounded-full text-xs font-medium border transition-colors ' + (filterType === t ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white' : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]')}>
            {t === 'all' ? '全部' : typeConfig[t as SecondBrainItem['type']].label}
          </button>
        ))}
      </div>

      <div className="px-4 mb-3">
        <Segmented options={[
          { value: 'all', label: '全部' },
          { value: 'to-read', label: '待读' },
          { value: 'reading', label: '在读' },
          { value: 'done', label: '已读' },
        ]} value={filterStatus} onChange={(v) => setFilterStatus(v as string)} />
      </div>

      <div className="px-4 space-y-2.5">
        {filtered.length === 0 ? (
          <EmptyState icon={<Brain size={26} />} title={search || filterType !== 'all' ? '没有匹配的资料' : '还没有资料'} description="把值得长期保存的资料放在这里" />
        ) : filtered.map((item) => (
          <Card key={item.id} className="tap cursor-pointer" onClick={() => setDetail(item)}>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h3 className="text-[15px] font-medium text-[var(--color-text)] line-clamp-2">{item.title}</h3>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--color-bg-hover)] text-[var(--color-text-tertiary)] shrink-0">{statusLabels[item.status]}</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[11px] text-[var(--color-text-tertiary)]">{typeConfig[item.type].label}</span>
              {item.tags.slice(0, 3).map((t) => <span key={t} className="text-[11px] text-[var(--color-text-tertiary)]">#{t}</span>)}
              <span className="text-[11px] text-[var(--color-text-tertiary)] ml-auto">{timeAgo(item.createdAt)}</span>
            </div>
          </Card>
        ))}
      </div>

      {(createOpen || editing) && (
        <SBEditor open={createOpen || !!editing} item={editing ?? undefined} onClose={() => { setCreateOpen(false); setEditing(null) }}
          onSave={async (data) => {
            if (editing) { await db.secondBrain.update(editing.id, { ...data, updatedAt: nowISO() }) }
            else { const now = nowISO(); await db.secondBrain.add({ ...data, id: uid(), createdAt: now, updatedAt: now }) }
            setCreateOpen(false); setEditing(null)
          }}
        />
      )}

      {detail && <SBDetail item={detail} onClose={() => setDetail(null)} onEdit={() => { setEditing(detail); setDetail(null) }} />}
    </Page>
  )
}

function SBEditor({ open, item, onClose, onSave }: { open: boolean; item?: SecondBrainItem; onClose: () => void; onSave: (data: Omit<SecondBrainItem, 'id'|'createdAt'|'updatedAt'>) => void }) {
  const [type, setType] = useState<SecondBrainItem['type']>(item?.type ?? 'article')
  const [title, setTitle] = useState(item?.title ?? '')
  const [content, setContent] = useState(item?.content ?? '')
  const [link, setLink] = useState(item?.link ?? '')
  const [tagsStr, setTagsStr] = useState(item?.tags.join(', ') ?? '')
  const [plan, setPlan] = useState(item?.plan ?? '')
  const [status, setStatus] = useState<SecondBrainItem['status']>(item?.status ?? 'to-read')
  return (
    <Sheet open={open} onClose={onClose} title={item ? '编辑' : '添加资料'} footer={<Button block onClick={() => onSave({ type, title: title.trim(), content: content.trim(), link: link.trim() || undefined, tags: tagsStr.split(/[,，]/).map(t => t.trim()).filter(Boolean), plan: plan.trim() || undefined, status })} disabled={!title.trim()}>保存</Button>}>
      <div className="space-y-4 pt-2">
        <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">类型</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(typeConfig) as SecondBrainItem['type'][]).map((t) => <button key={t} onClick={() => setType(t)} className={'tap h-8 px-3 rounded-full text-xs border transition-colors ' + (type === t ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white' : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]')}>{typeConfig[t].label}</button>)}
          </div>
        </div>
        <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">标题</label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="资料名称" autoFocus /></div>
        <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">链接</label><Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="URL（可选）" /></div>
        <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">内容摘要</label><Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="简要描述" rows={3} /></div>
        <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">标签</label><Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="用逗号分隔" /></div>
        <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">我的使用计划</label><Textarea value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="打算怎么用这个资料" rows={2} /></div>
        <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">状态</label>
          <Segmented options={[{ value: 'to-read', label: '待读' }, { value: 'reading', label: '在读' }, { value: 'done', label: '已读' }, { value: 'archived', label: '归档' }]} value={status} onChange={(v) => setStatus(v as SecondBrainItem['status'])} />
        </div>
      </div>
    </Sheet>
  )
}

function SBDetail({ item, onClose, onEdit }: { item: SecondBrainItem; onClose: () => void; onEdit: () => void }) {
  const confirm = useConfirm()
  return (
    <Sheet open onClose={onClose} title={item.title}>
      <div className="pt-2 pb-4 space-y-4">
        <div className="flex gap-2">
          <span className="text-xs px-2 py-1 rounded-lg bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]">{typeConfig[item.type].label}</span>
          <span className="text-xs px-2 py-1 rounded-lg bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]">{statusLabels[item.status]}</span>
        </div>
        {item.content && <p className="text-[15px] text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">{item.content}</p>}
        {item.link && <div><p className="text-xs text-[var(--color-text-tertiary)] mb-1">链接</p><a href={item.link} target="_blank" rel="noreferrer" className="text-sm text-[var(--color-accent)] break-all">{item.link}</a></div>}
        {item.plan && <div><p className="text-xs text-[var(--color-text-tertiary)] mb-1">使用计划</p><p className="text-sm text-[var(--color-text-secondary)]">{item.plan}</p></div>}
        {item.tags.length > 0 && <div className="flex flex-wrap gap-1.5">{item.tags.map((t) => <span key={t} className="text-xs px-2 py-1 rounded-lg bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]"><Tag size={11} className="inline mr-1" />{t}</span>)}</div>}
        <p className="text-xs text-[var(--color-text-tertiary)]">添加于 {timeAgo(item.createdAt)}</p>
        <div className="flex gap-2"><Button variant="secondary" block onClick={onEdit}>编辑</Button><Button variant="danger" onClick={async () => { if (await confirm({ title: '删除？', danger: true, confirmText: '删除' })) { await db.secondBrain.delete(item.id); onClose() } }}><Trash2 size={18} /></Button></div>
      </div>
    </Sheet>
  )
}
