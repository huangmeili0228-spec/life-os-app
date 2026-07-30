import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Plus,
  FolderKanban,
  ChevronRight,
  Check,
  Trash2,
  Circle,
  Calendar,
} from 'lucide-react'
import { Page, PageHeader } from '../../components/layout/Page'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { Input, Textarea } from '../../components/ui/Input'
import { Segmented, EmptyState } from '../../components/ui/EmptyState'
import { useConfirm } from '../../components/ui/Confirm'
import { db, type Project } from '../../db/database'
import { uid, nowISO, formatDate } from '../../utils/date'

const domainLabels: Record<Project['domain'], string> = {
  study: '学业',
  ai: 'AI学习',
  body: '身体',
  finance: '财务',
  growth: '人格',
  thought: '思想',
  other: '其他',
}

const statusConfig: Record<Project['status'], { label: string; color: string }> = {
  active: { label: '进行中', color: 'var(--color-accent)' },
  paused: { label: '暂停', color: 'var(--color-warning)' },
  done: { label: '已完成', color: 'var(--color-success)' },
  archived: { label: '已归档', color: 'var(--color-text-tertiary)' },
}

const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4']

type FilterStatus = 'all' | Project['status']

export function ProjectPage() {
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [detail, setDetail] = useState<Project | null>(null)

  const projects = useLiveQuery(() => db.projects.toArray(), [], [])

  const filtered = useMemo(() => {
    let list = projects ?? []
    if (filter !== 'all') list = list.filter((p) => p.status === filter)
    return list.sort((a, b) => {
      // active 优先
      const order = { active: 0, paused: 1, done: 2, archived: 3 }
      return order[a.status] - order[b.status] || b.createdAt.localeCompare(a.createdAt)
    })
  }, [projects, filter])

  return (
    <Page>
      <PageHeader
        title="Project"
        subtitle="离长期目标还有多远"
        right={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={18} /> 新建
          </Button>
        }
      />

      <div className="px-4 mb-3 flex gap-2 overflow-x-auto no-scrollbar">
        {(['all', 'active', 'paused', 'done'] as FilterStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={
              'tap shrink-0 h-8 px-3 rounded-full text-xs font-medium border transition-colors ' +
              (filter === s
                ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
                : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]')
            }
          >
            {s === 'all' ? '全部' : statusConfig[s as Project['status']].label}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-2.5">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<FolderKanban size={26} />}
            title="还没有项目"
            description="把长期目标拆解成项目，跟踪每一个里程碑"
          />
        ) : (
          filtered.map((p) => {
            const doneM = p.milestones.filter((m) => m.done).length
            const pct = p.milestones.length ? (doneM / p.milestones.length) * 100 : 0
            return (
              <Card
                key={p.id}
                className="tap cursor-pointer active:bg-[var(--color-bg-hover)]"
                onClick={() => setDetail(p)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-1 self-stretch rounded-full shrink-0"
                    style={{ background: p.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[15px] font-medium text-[var(--color-text)]">{p.name}</h3>
                      <span
                        className="text-[11px] px-1.5 py-0.5 rounded shrink-0"
                        style={{ background: statusConfig[p.status].color + '22', color: statusConfig[p.status].color }}
                      >
                        {statusConfig[p.status].label}
                      </span>
                    </div>
                    {p.description && (
                      <p className="text-sm text-[var(--color-text-tertiary)] mt-0.5 line-clamp-1">
                        {p.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[11px] text-[var(--color-text-tertiary)]">
                        {domainLabels[p.domain]}
                      </span>
                      {p.milestones.length > 0 && (
                        <>
                          <span className="text-[11px] text-[var(--color-text-tertiary)]">
                            {doneM}/{p.milestones.length} 里程碑
                          </span>
                          <div className="flex-1 h-1 rounded-full bg-[var(--color-bg-hover)] overflow-hidden">
                            <div
                              className="h-full transition-all"
                              style={{ width: `${pct}%`, background: p.color }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[var(--color-text-tertiary)] shrink-0 mt-1" />
                </div>
              </Card>
            )
          })
        )}
      </div>

      {createOpen && (
        <ProjectEditor
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSave={async (data) => {
            const now = nowISO()
            await db.projects.add({ ...data, id: uid(), createdAt: now, updatedAt: now })
            setCreateOpen(false)
          }}
        />
      )}

      {editing && (
        <ProjectEditor
          open
          item={editing}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            await db.projects.update(editing.id, { ...data, updatedAt: nowISO() })
            setEditing(null)
          }}
        />
      )}

      {detail && (
        <ProjectDetail
          project={detail}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setEditing(detail)
            setDetail(null)
          }}
        />
      )}
    </Page>
  )
}

// ============================================================
function ProjectEditor({
  open,
  item,
  onClose,
  onSave,
}: {
  open: boolean
  item?: Project
  onClose: () => void
  onSave: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void
}) {
  const [name, setName] = useState(item?.name ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [domain, setDomain] = useState<Project['domain']>(item?.domain ?? 'study')
  const [status, setStatus] = useState<Project['status']>(item?.status ?? 'active')
  const [color, setColor] = useState(item?.color ?? colors[0])
  const [longTermGoal, setLongTermGoal] = useState(item?.longTermGoal ?? '')
  const [milestones, setMilestones] = useState(item?.milestones ?? [])

  const addMilestone = () => {
    setMilestones([...milestones, { id: uid(), title: '', done: false }])
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={item ? '编辑项目' : '新建项目'}
      footer={
        <Button block onClick={() => onSave({ name: name.trim(), description: description.trim(), domain, status, color, longTermGoal: longTermGoal.trim() || undefined, milestones: milestones.filter((m) => m.title.trim()) })} disabled={!name.trim()}>
          保存
        </Button>
      }
    >
      <div className="space-y-4 pt-2">
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">项目名称</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：保研准备" autoFocus />
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">描述</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="这个项目要达成什么？" rows={2} />
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">长期目标</label>
          <Input value={longTermGoal} onChange={(e) => setLongTermGoal(e.target.value)} placeholder="这个项目服务的长期目标" />
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">方向</label>
          <Segmented
            options={[
              { value: 'study', label: '学业' },
              { value: 'ai', label: 'AI' },
              { value: 'growth', label: '人格' },
              { value: 'body', label: '身体' },
              { value: 'finance', label: '财务' },
              { value: 'other', label: '其他' },
            ]}
            value={domain}
            onChange={(v) => setDomain(v as Project['domain'])}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">状态</label>
          <Segmented
            options={[
              { value: 'active', label: '进行中' },
              { value: 'paused', label: '暂停' },
              { value: 'done', label: '完成' },
              { value: 'archived', label: '归档' },
            ]}
            value={status}
            onChange={(v) => setStatus(v as Project['status'])}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">颜色</label>
          <div className="flex gap-2">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={'w-8 h-8 rounded-full transition-transform ' + (color === c ? 'ring-2 ring-offset-2 ring-offset-[var(--color-bg-elevated)] scale-110' : '')}
                style={{ background: c, '--tw-ring-color': c } as React.CSSProperties}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">里程碑</label>
            <button onClick={addMilestone} className="tap text-xs text-[var(--color-accent)] flex items-center gap-1">
              <Plus size={14} /> 添加
            </button>
          </div>
          <div className="space-y-2">
            {milestones.map((m, idx) => (
              <div key={m.id} className="flex items-center gap-2">
                <button
                  onClick={() => setMilestones(milestones.map((x, i) => i === idx ? { ...x, done: !x.done } : x))}
                  className={'tap w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ' + (m.done ? 'bg-[var(--color-accent)] border-[var(--color-accent)]' : 'border-[var(--color-border)]')}
                >
                  {m.done && <Check size={12} className="text-white" strokeWidth={3} />}
                </button>
                <Input
                  value={m.title}
                  onChange={(e) => setMilestones(milestones.map((x, i) => i === idx ? { ...x, title: e.target.value } : x))}
                  placeholder={`里程碑 ${idx + 1}`}
                  className="h-9 text-sm"
                />
                <button
                  onClick={() => setMilestones(milestones.filter((_, i) => i !== idx))}
                  className="tap text-[var(--color-text-tertiary)]"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  )
}

// ============================================================
function ProjectDetail({
  project,
  onClose,
  onEdit,
}: {
  project: Project
  onClose: () => void
  onEdit: () => void
}) {
  const confirm = useConfirm()
  const [local, setLocal] = useState(project)

  const toggleMilestone = async (id: string) => {
    const milestones = local.milestones.map((m) => (m.id === id ? { ...m, done: !m.done } : m))
    setLocal({ ...local, milestones })
    await db.projects.update(project.id, { milestones, updatedAt: nowISO() })
  }

  const handleDelete = async () => {
    if (await confirm({ title: '删除项目？', message: '里程碑会一起删除', danger: true, confirmText: '删除' })) {
      await db.projects.delete(project.id)
      onClose()
    }
  }

  return (
    <Sheet open onClose={onClose} title={project.name}>
      <div className="pt-2 pb-4 space-y-4">
        {project.description && (
          <p className="text-[15px] text-[var(--color-text-secondary)] leading-relaxed">{project.description}</p>
        )}

        {project.longTermGoal && (
          <div>
            <p className="text-xs text-[var(--color-text-tertiary)] mb-1">长期目标</p>
            <p className="text-sm text-[var(--color-text)]">{project.longTermGoal}</p>
          </div>
        )}

        <div className="flex gap-2">
          <span className="text-xs px-2 py-1 rounded-lg bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]">
            {domainLabels[project.domain]}
          </span>
          <span className="text-xs px-2 py-1 rounded-lg" style={{ background: statusConfig[project.status].color + '22', color: statusConfig[project.status].color }}>
            {statusConfig[project.status].label}
          </span>
        </div>

        {project.milestones.length > 0 && (
          <div>
            <p className="text-xs text-[var(--color-text-tertiary)] mb-2">里程碑</p>
            <div className="space-y-1.5">
              {project.milestones.map((m) => (
                <button
                  key={m.id}
                  onClick={() => toggleMilestone(m.id)}
                  className="tap w-full flex items-center gap-2.5 py-1.5 text-left"
                >
                  {m.done ? (
                    <Check size={18} className="text-[var(--color-success)] shrink-0" />
                  ) : (
                    <Circle size={18} className="text-[var(--color-text-tertiary)] shrink-0" />
                  )}
                  <span className={'text-sm ' + (m.done ? 'line-through text-[var(--color-text-tertiary)]' : 'text-[var(--color-text)]')}>
                    {m.title}
                  </span>
                  {m.dueDate && (
                    <span className="text-xs text-[var(--color-text-tertiary)] ml-auto flex items-center gap-1">
                      <Calendar size={12} /> {formatDate(m.dueDate)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" block onClick={onEdit}>编辑</Button>
          <Button variant="danger" onClick={handleDelete}><Trash2 size={18} /></Button>
        </div>
      </div>
    </Sheet>
  )
}
