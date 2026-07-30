import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Search,
  Star,
  Trash2,
  Plus,
  Lightbulb,
  Brain,
  BookOpen,
  Video,
  GraduationCap,
  FileText,
  Tag,
} from 'lucide-react'
import { Page, PageHeader } from '../../components/layout/Page'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { Input, Textarea } from '../../components/ui/Input'
import { Segmented, EmptyState } from '../../components/ui/EmptyState'
import { useConfirm } from '../../components/ui/Confirm'
import { db, type InsightRecord } from '../../db/database'
import { uid, nowISO, timeAgo } from '../../utils/date'

const typeConfig: Record<
  InsightRecord['type'],
  { label: string; icon: typeof Lightbulb; color: string }
> = {
  reflection: { label: '反思', icon: Lightbulb, color: '#fbbf24' },
  idea: { label: '想法', icon: Brain, color: '#6366f1' },
  chatgpt: { label: 'AI所学', icon: BookOpen, color: '#34d399' },
  book: { label: '书籍', icon: BookOpen, color: '#f97316' },
  article: { label: '文章', icon: FileText, color: '#06b6d4' },
  video: { label: '视频', icon: Video, color: '#ec4899' },
  course: { label: '课程', icon: GraduationCap, color: '#8b5cf6' },
}

const domainLabels: Record<NonNullable<InsightRecord['domain']>, string> = {
  study: '学业',
  ai: 'AI学习',
  body: '身体',
  finance: '财务',
  growth: '人格',
  thought: '思想',
}

type FilterType = 'all' | InsightRecord['type']
type SortMode = 'recent' | 'starred'

export function InsightPage() {
  const [filter, setFilter] = useState<FilterType>('all')
  const [sortMode, setSortMode] = useState<SortMode>('recent')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<InsightRecord | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<InsightRecord | null>(null)

  const allInsights = useLiveQuery(() => db.insights.toArray(), [], [])

  const insights = useMemo(() => {
    let list = allInsights ?? []
    if (filter !== 'all') list = list.filter((i) => i.type === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.content.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }
    if (sortMode === 'starred') {
      list = [...list].sort((a, b) => Number(b.starred) - Number(a.starred) || b.createdAt.localeCompare(a.createdAt))
    } else {
      list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }
    return list
  }, [allInsights, filter, search, sortMode])

  return (
    <Page>
      <PageHeader
        title="Insight"
        subtitle="今天我真正学到了什么"
        right={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={18} /> 新建
          </Button>
        }
      />

      {/* 搜索 */}
      <div className="px-4 mb-3">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <Input
            placeholder="搜索想法、标签…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* 筛选 */}
      <div className="px-4 mb-3 flex gap-2 overflow-x-auto no-scrollbar">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          全部
        </FilterChip>
        {(Object.keys(typeConfig) as InsightRecord['type'][]).map((t) => {
          const cfg = typeConfig[t]
          const Icon = cfg.icon
          return (
            <FilterChip key={t} active={filter === t} onClick={() => setFilter(t)}>
              <Icon size={13} style={{ color: cfg.color }} /> {cfg.label}
            </FilterChip>
          )
        })}
      </div>

      {/* 排序切换 */}
      <div className="px-4 mb-2">
        <Segmented
          options={[
            { value: 'recent', label: '最近' },
            { value: 'starred', label: '星标优先' },
          ]}
          value={sortMode}
          onChange={(v) => setSortMode(v as SortMode)}
        />
      </div>

      {/* 列表 */}
      <div className="px-4 space-y-2.5">
        {insights.length === 0 ? (
          <EmptyState
            icon={<Lightbulb size={26} />}
            title={search || filter !== 'all' ? '没有匹配的记录' : '还没有记录'}
            description={
              search || filter !== 'all'
                ? '换个关键词或筛选条件试试'
                : '点击右上角新建，或用底部 + 快速记录'
            }
          />
        ) : (
          insights.map((item) => (
            <InsightCard
              key={item.id}
              item={item}
              onClick={() => setDetailItem(item)}
              onStar={async () => {
                await db.insights.update(item.id, { starred: !item.starred, updatedAt: nowISO() })
              }}
            />
          ))
        )}
      </div>

      {/* 新建 */}
      {createOpen && (
        <InsightEditor
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSave={async (data) => {
            const now = nowISO()
            await db.insights.add({ ...data, id: uid(), createdAt: now, updatedAt: now })
            setCreateOpen(false)
          }}
        />
      )}

      {/* 编辑 */}
      {editing && (
        <InsightEditor
          open={!!editing}
          item={editing}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            await db.insights.update(editing.id, { ...data, updatedAt: nowISO() })
            setEditing(null)
          }}
        />
      )}

      {/* 详情 */}
      {detailItem && (
        <InsightDetail
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onEdit={() => {
            setEditing(detailItem)
            setDetailItem(null)
          }}
        />
      )}
    </Page>
  )
}

// ============================================================
// 筛选 chip
// ============================================================
function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={
        'tap shrink-0 h-8 px-3 rounded-full text-xs font-medium flex items-center gap-1 border transition-colors ' +
        (active
          ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
          : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]')
      }
    >
      {children}
    </button>
  )
}

// ============================================================
// 卡片
// ============================================================
function InsightCard({
  item,
  onClick,
  onStar,
}: {
  item: InsightRecord
  onClick: () => void
  onStar: () => void
}) {
  const cfg = typeConfig[item.type]
  const Icon = cfg.icon
  return (
    <Card padded className="tap active:bg-[var(--color-bg-hover)]" onClick={onClick}>
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: cfg.color + '22' }}
        >
          <Icon size={17} style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-medium text-[var(--color-text)] line-clamp-2">
              {item.title}
            </h3>
            <button onClick={(e) => { e.stopPropagation(); onStar() }} className="tap shrink-0 -mt-0.5">
              <Star
                size={17}
                className={item.starred ? 'text-[var(--color-warning)] fill-[var(--color-warning)]' : 'text-[var(--color-text-tertiary)]'}
              />
            </button>
          </div>
          {item.content && (
            <p className="text-sm text-[var(--color-text-secondary)] mt-1 line-clamp-2 leading-relaxed">
              {item.content}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {item.domain && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--color-bg-hover)] text-[var(--color-text-tertiary)]">
                {domainLabels[item.domain]}
              </span>
            )}
            {item.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[11px] text-[var(--color-text-tertiary)]">
                #{tag}
              </span>
            ))}
            <span className="text-[11px] text-[var(--color-text-tertiary)] ml-auto">
              {timeAgo(item.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ============================================================
// 编辑器
// ============================================================
function InsightEditor({
  open,
  item,
  onClose,
  onSave,
}: {
  open: boolean
  item?: InsightRecord
  onClose: () => void
  onSave: (data: Omit<InsightRecord, 'id' | 'createdAt' | 'updatedAt'>) => void
}) {
  const [type, setType] = useState<InsightRecord['type']>(item?.type ?? 'reflection')
  const [title, setTitle] = useState(item?.title ?? '')
  const [content, setContent] = useState(item?.content ?? '')
  const [source, setSource] = useState(item?.source ?? '')
  const [tagsStr, setTagsStr] = useState(item?.tags.join(', ') ?? '')
  const [domain, setDomain] = useState<InsightRecord['domain']>(item?.domain ?? 'thought')
  const [starred, setStarred] = useState(item?.starred ?? false)

  const save = () => {
    if (!title.trim() && !content.trim()) return
    onSave({
      type,
      title: title.trim() || content.slice(0, 30),
      content: content.trim(),
      source: source.trim() || undefined,
      tags: tagsStr.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
      domain,
      starred,
    })
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={item ? '编辑' : '新建 Insight'}
      footer={
        <Button block onClick={save} disabled={!title.trim() && !content.trim()}>
          保存
        </Button>
      }
    >
      <div className="space-y-4 pt-2">
        {/* 类型 */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">类型</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(typeConfig) as InsightRecord['type'][]).map((t) => {
              const cfg = typeConfig[t]
              const Icon = cfg.icon
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={
                    'tap h-9 px-3 rounded-lg text-sm flex items-center gap-1.5 border transition-colors ' +
                    (type === t
                      ? 'border-[var(--color-accent)] bg-[var(--color-bg-hover)]'
                      : 'border-[var(--color-border-subtle)]')
                  }
                >
                  <Icon size={15} style={{ color: cfg.color }} />
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">标题</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="一句话概括" />
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">核心观点</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="你真正学到了什么？想到了什么？"
            rows={5}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">来源（可选）</label>
          <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="书名、链接、对话…" />
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">标签</label>
          <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="用逗号分隔" />
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">关联方向</label>
          <Segmented
            options={[
              { value: 'thought', label: '思想' },
              { value: 'study', label: '学业' },
              { value: 'ai', label: 'AI' },
              { value: 'growth', label: '人格' },
              { value: 'body', label: '身体' },
              { value: 'finance', label: '财务' },
            ]}
            value={domain as string}
            onChange={(v) => setDomain(v as InsightRecord['domain'])}
          />
        </div>

        <button
          onClick={() => setStarred(!starred)}
          className="tap flex items-center gap-2 text-sm text-[var(--color-text-secondary)]"
        >
          <Star size={18} className={starred ? 'text-[var(--color-warning)] fill-[var(--color-warning)]' : ''} />
          {starred ? '已标星' : '标星'}
        </button>
      </div>
    </Sheet>
  )
}

// ============================================================
// 详情
// ============================================================
function InsightDetail({
  item,
  onClose,
  onEdit,
}: {
  item: InsightRecord
  onClose: () => void
  onEdit: () => void
}) {
  const confirm = useConfirm()
  const cfg = typeConfig[item.type]
  const Icon = cfg.icon

  const handleDelete = async () => {
    const ok = await confirm({
      title: '删除这条记录？',
      message: '删除后无法恢复',
      danger: true,
      confirmText: '删除',
    })
    if (ok) {
      await db.insights.delete(item.id)
      onClose()
    }
  }

  return (
    <Sheet open onClose={onClose} title="详情">
      <div className="pt-2 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: cfg.color + '22' }}>
            <Icon size={16} style={{ color: cfg.color }} />
          </div>
          <span className="text-sm text-[var(--color-text-secondary)]">{cfg.label}</span>
          {item.domain && (
            <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-bg-hover)] text-[var(--color-text-tertiary)]">
              {domainLabels[item.domain]}
            </span>
          )}
          {item.starred && <Star size={16} className="text-[var(--color-warning)] fill-[var(--color-warning)]" />}
        </div>

        <h2 className="text-xl font-bold text-[var(--color-text)] mb-3">{item.title}</h2>

        {item.content && (
          <p className="text-[15px] text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed mb-4">
            {item.content}
          </p>
        )}

        {item.source && (
          <div className="mb-3">
            <p className="text-xs text-[var(--color-text-tertiary)] mb-1">来源</p>
            <p className="text-sm text-[var(--color-text-secondary)]">{item.source}</p>
          </div>
        )}

        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {item.tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-1 rounded-lg bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]">
                <Tag size={11} className="inline mr-1" />
                {tag}
              </span>
            ))}
          </div>
        )}

        <p className="text-xs text-[var(--color-text-tertiary)] mb-5">
          创建于 {timeAgo(item.createdAt)}
        </p>

        <div className="flex gap-2">
          <Button variant="secondary" block onClick={onEdit}>编辑</Button>
          <Button variant="danger" onClick={handleDelete}>
            <Trash2 size={18} />
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
