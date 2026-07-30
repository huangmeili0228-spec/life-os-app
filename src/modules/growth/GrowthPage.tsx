import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, HeartPulse, Trash2 } from 'lucide-react'
import { Page, PageHeader } from '../../components/layout/Page'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { Input, Textarea } from '../../components/ui/Input'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/Confirm'
import { db, type GrowthRecord } from '../../db/database'
import { uid, nowISO, toDateStr, dayLabel } from '../../utils/date'

const defaultTopics = ['果敢', '独立', '边界感', '控制欲', '机会成本', '表达需求', '决策能力', '情绪稳定', '依赖', '自我接纳']

export function GrowthPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<GrowthRecord | null>(null)

  const records = useLiveQuery(() => db.growth.orderBy('date').reverse().toArray(), [], [])

  // 按主题统计
  const topicStats = useMemo(() => {
    const map: Record<string, number> = {}
    for (const r of records ?? []) {
      map[r.topic] = (map[r.topic] ?? 0) + 1
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [records])

  return (
    <Page>
      <PageHeader
        title="Growth"
        subtitle="今天我哪里成长了"
        right={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={18} /> 记录
          </Button>
        }
      />

      <div className="px-4 space-y-4">
        {/* 主题统计 */}
        {topicStats.length > 0 && (
          <Card>
            <h3 className="text-[15px] font-semibold text-[var(--color-text)] mb-3">成长主题</h3>
            <div className="flex flex-wrap gap-2">
              {topicStats.map(([topic, count]) => (
                <span key={topic} className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]">
                  {topic} · {count}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* 记录列表 */}
        {records && records.length > 0 ? (
          <div className="space-y-2.5">
            {records.map((r) => (
              <Card key={r.id} className="tap cursor-pointer" onClick={() => setEditing(r)}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-medium">
                      {r.topic}
                    </span>
                    <span className="text-xs text-[var(--color-text-tertiary)]">{dayLabel(r.date)}</span>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className={'w-1.5 h-1.5 rounded-full ' + (n <= r.rating ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]')} />
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  {r.before && (
                    <p className="text-[var(--color-text-secondary)]">
                      <span className="text-[var(--color-text-tertiary)]">以前：</span>{r.before}
                    </p>
                  )}
                  {r.after && (
                    <p className="text-[var(--color-text-secondary)]">
                      <span className="text-[var(--color-accent)]">现在：</span>{r.after}
                    </p>
                  )}
                </div>
                {r.reflection && (
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-2 pt-2 border-t border-[var(--color-border-subtle)]">
                    {r.reflection}
                  </p>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<HeartPulse size={26} />}
            title="还没有成长记录"
            description="记录今天哪里比过去做得更好，哪怕一小步"
          />
        )}
      </div>

      {(createOpen || editing) && (
        <GrowthEditor
          open={createOpen || !!editing}
          item={editing ?? undefined}
          onClose={() => { setCreateOpen(false); setEditing(null) }}
          onSave={async (data) => {
            if (editing) {
              await db.growth.update(editing.id, { ...data, updatedAt: nowISO() })
            } else {
              const now = nowISO()
              await db.growth.add({ ...data, id: uid(), createdAt: now, updatedAt: now })
            }
            setCreateOpen(false)
            setEditing(null)
          }}
          onDelete={editing ? async () => {
            await db.growth.delete(editing.id)
            setEditing(null)
          } : undefined}
        />
      )}
    </Page>
  )
}

function GrowthEditor({
  open,
  item,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  item?: GrowthRecord
  onClose: () => void
  onSave: (data: Omit<GrowthRecord, 'id' | 'createdAt' | 'updatedAt'>) => void
  onDelete?: () => void
}) {
  const [date, setDate] = useState(item?.date ?? toDateStr())
  const [topic, setTopic] = useState(item?.topic ?? '')
  const [customTopic, setCustomTopic] = useState('')
  const [before, setBefore] = useState(item?.before ?? '')
  const [after, setAfter] = useState(item?.after ?? '')
  const [reflection, setReflection] = useState(item?.reflection ?? '')
  const [rating, setRating] = useState(item?.rating ?? 3)
  const confirm = useConfirm()
  const toast = useToast()

  const finalTopic = topic === '__custom' ? customTopic : topic

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={item ? '编辑成长记录' : '记录成长'}
      footer={
        <div className="flex gap-2">
          {onDelete && (
            <Button variant="danger" onClick={async () => {
              if (await confirm({ title: '删除？', danger: true, confirmText: '删除' })) {
                onDelete()
                toast('已删除')
              }
            }}>
              <Trash2 size={18} />
            </Button>
          )}
          <Button block onClick={() => onSave({ date, topic: finalTopic || '其他', before, after, reflection, rating })} disabled={!finalTopic.trim() && !before.trim() && !after.trim()}>
            保存
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pt-2">
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">日期</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">成长主题</label>
          <div className="flex flex-wrap gap-2">
            {defaultTopics.map((t) => (
              <button
                key={t}
                onClick={() => setTopic(t === topic ? '' : t)}
                className={
                  'tap h-8 px-3 rounded-full text-xs border transition-colors ' +
                  (topic === t
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                    : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]')
                }
              >
                {t}
              </button>
            ))}
          </div>
          {topic === '__custom' || (topic && !defaultTopics.includes(topic)) ? (
            <Input value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} placeholder="自定义主题" className="mt-2" />
          ) : (
            <button
              onClick={() => setTopic('__custom')}
              className="tap text-xs text-[var(--color-accent)] mt-2"
            >
              + 自定义主题
            </button>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">以前会怎样</label>
          <Textarea value={before} onChange={(e) => setBefore(e.target.value)} placeholder="以前面对这种情况的反应" rows={2} />
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">现在怎样</label>
          <Textarea value={after} onChange={(e) => setAfter(e.target.value)} placeholder="这次我怎么做" rows={2} />
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">反思</label>
          <Textarea value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="为什么这次不同了" rows={2} />
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">自我评价</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className={
                  'tap flex-1 h-10 rounded-xl border text-sm transition-colors ' +
                  (rating === n ? 'border-[var(--color-accent)] bg-[var(--color-bg-hover)] text-[var(--color-text)]' : 'border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)]')
                }
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  )
}
