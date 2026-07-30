import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Check, ChevronLeft, ChevronRight, Moon, Trash2 } from 'lucide-react'
import { Page, PageHeader } from '../../components/layout/Page'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { Input, Textarea } from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'
import { db, type DailyRecord } from '../../db/database'
import { uid, nowISO, toDateStr, addDays, dayLabel, formatDate } from '../../utils/date'

export function DailyPage() {
  const [currentDate, setCurrentDate] = useState(toDateStr())
  const [taskInput, setTaskInput] = useState('')
  const [reviewOpen, setReviewOpen] = useState(false)
  const toast = useToast()

  const todayRecord = useLiveQuery(
    () => db.daily.where('date').equals(currentDate).first(),
    [currentDate],
  )

  // 确保当天记录存在
  const ensureRecord = async (): Promise<DailyRecord> => {
    const existing = await db.daily.where('date').equals(currentDate).first()
    if (existing) return existing
    const now = nowISO()
    const record: DailyRecord = {
      id: uid(),
      date: currentDate,
      topTasks: [],
      timeBlocks: [],
      createdAt: now,
      updatedAt: now,
    }
    await db.daily.add(record)
    return record
  }

  const addTask = async () => {
    const text = taskInput.trim()
    if (!text) return
    const record = await ensureRecord()
    await db.daily.update(record.id, {
      topTasks: [
        ...record.topTasks,
        { id: uid(), text, done: false },
      ],
      updatedAt: nowISO(),
    })
    setTaskInput('')
  }

  const toggleTask = async (taskId: string) => {
    if (!todayRecord) return
    await db.daily.update(todayRecord.id, {
      topTasks: todayRecord.topTasks.map((t) =>
        t.id === taskId ? { ...t, done: !t.done } : t,
      ),
      updatedAt: nowISO(),
    })
  }

  const deleteTask = async (taskId: string) => {
    if (!todayRecord) return
    await db.daily.update(todayRecord.id, {
      topTasks: todayRecord.topTasks.filter((t) => t.id !== taskId),
      updatedAt: nowISO(),
    })
  }

  const isToday = currentDate === toDateStr()
  const doneCount = todayRecord?.topTasks.filter((t) => t.done).length ?? 0
  const totalCount = todayRecord?.topTasks.length ?? 0
  const hasReview = !!todayRecord?.review

  return (
    <Page>
      <PageHeader
        title={isToday ? '今天' : dayLabel(currentDate)}
        subtitle={formatDate(currentDate, true)}
        right={
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentDate(addDays(currentDate, -1))}
              className="tap w-9 h-9 flex items-center justify-center rounded-full text-[var(--color-text-tertiary)] active:bg-[var(--color-bg-hover)]"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setCurrentDate(addDays(currentDate, 1))}
              className="tap w-9 h-9 flex items-center justify-center rounded-full text-[var(--color-text-tertiary)] active:bg-[var(--color-bg-hover)]"
              disabled={isToday}
            >
              <ChevronRight size={20} className={isToday ? 'opacity-30' : ''} />
            </button>
          </div>
        }
      />

      <div className="px-4 space-y-4">
        {/* 今日最重要的事 */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-[var(--color-text)]">
              今天最重要的事
            </h2>
            {totalCount > 0 && (
              <span className="text-xs text-[var(--color-text-tertiary)]">
                {doneCount}/{totalCount}
              </span>
            )}
          </div>

          {/* 任务列表 */}
          <div className="space-y-1.5">
            {todayRecord?.topTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={() => toggleTask(task.id)}
                onDelete={() => deleteTask(task.id)}
              />
            ))}
          </div>

          {/* 添加任务 */}
          <div className="flex gap-2 mt-3">
            <Input
              placeholder="今天最重要的一件事…"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addTask()
              }}
            />
            <Button onClick={addTask} disabled={!taskInput.trim()} size="md">
              <Plus size={18} />
            </Button>
          </div>
        </Card>

        {/* 进度环 */}
        {totalCount > 0 && (
          <div className="flex items-center justify-center py-2">
            <ProgressRing progress={totalCount ? doneCount / totalCount : 0} />
          </div>
        )}

        {/* 晚间复盘 */}
        <Card
          className="tap cursor-pointer"
          onClick={() => setReviewOpen(true)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/15 flex items-center justify-center">
              <Moon size={20} className="text-[var(--color-accent)]" />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-medium text-[var(--color-text)]">
                {hasReview ? '查看今日复盘' : '晚间复盘'}
              </h3>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                {hasReview ? '今天已复盘，点击修改' : '今天做对了什么？哪里可以更好？'}
              </p>
            </div>
          </div>
        </Card>

        {/* 随手记 */}
        <NotesSection record={todayRecord} />
      </div>

      {/* 复盘弹窗 */}
      {todayRecord && (
        <ReviewSheet
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          record={todayRecord}
          onSave={async (review) => {
            await db.daily.update(todayRecord.id, { review, updatedAt: nowISO() })
            setReviewOpen(false)
            toast('复盘已保存')
          }}
        />
      )}
    </Page>
  )
}

// ============================================================
// 任务行
// ============================================================
function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: { id: string; text: string; done: boolean }
  onToggle: () => void
  onDelete: () => void
}) {
  const [showDelete, setShowDelete] = useState(false)
  return (
    <div
      className="flex items-center gap-2.5 py-2 group"
      onTouchStart={() => setShowDelete(true)}
    >
      <button
        onClick={onToggle}
        className={
          'tap w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ' +
          (task.done
            ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
            : 'border-[var(--color-border)]')
        }
      >
        {task.done && <Check size={14} className="text-white" strokeWidth={3} />}
      </button>
      <span
        className={
          'flex-1 text-[15px] ' +
          (task.done
            ? 'line-through text-[var(--color-text-tertiary)]'
            : 'text-[var(--color-text)]')
        }
      >
        {task.text}
      </span>
      {showDelete && (
        <button
          onClick={onDelete}
          className="tap w-7 h-7 flex items-center justify-center text-[var(--color-text-tertiary)]"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  )
}

// ============================================================
// 进度环
// ============================================================
function ProgressRing({ progress }: { progress: number }) {
  const size = 80
  const stroke = 6
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress)
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-[var(--color-text)]">
          {Math.round(progress * 100)}%
        </span>
      </div>
    </div>
  )
}

// ============================================================
// 随手记
// ============================================================
function NotesSection({ record }: { record?: DailyRecord }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const toast = useToast()

  useEffect(() => {
    setText(record?.notes ?? '')
  }, [record?.id, record?.notes])

  const save = async () => {
    if (!record) return
    await db.daily.update(record.id, { notes: text, updatedAt: nowISO() })
    setEditing(false)
    toast('已保存')
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[15px] font-semibold text-[var(--color-text)]">随手记</h3>
        {record?.notes && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-[var(--color-accent)]"
          >
            编辑
          </button>
        )}
      </div>
      {editing || !record?.notes ? (
        <div>
          <Textarea
            placeholder="随便写点什么…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            autoFocus={!record?.notes}
          />
          {record?.notes !== undefined && (
            <div className="flex gap-2 mt-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setText(record.notes ?? '') }}>
                取消
              </Button>
              <Button size="sm" onClick={save}>保存</Button>
            </div>
          )}
          {record?.notes === undefined && text && (
            <Button size="sm" block onClick={save} className="mt-2">保存</Button>
          )}
        </div>
      ) : (
        <p
          className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed cursor-pointer"
          onClick={() => setEditing(true)}
        >
          {record.notes}
        </p>
      )}
    </Card>
  )
}

// ============================================================
// 复盘弹窗
// ============================================================
function ReviewSheet({
  open,
  onClose,
  record,
  onSave,
}: {
  open: boolean
  onClose: () => void
  record: DailyRecord
  onSave: (review: NonNullable<DailyRecord['review']>) => void
}) {
  const [wins, setWins] = useState('')
  const [improvements, setImprovements] = useState('')
  const [learned, setLearned] = useState('')
  const [tomorrow, setTomorrow] = useState('')
  const [mood, setMood] = useState(3)

  useEffect(() => {
    if (open) {
      setWins(record.review?.wins ?? '')
      setImprovements(record.review?.improvements ?? '')
      setLearned(record.review?.learned ?? '')
      setTomorrow(record.review?.tomorrow ?? '')
      setMood(record.review?.mood ?? 3)
    }
  }, [open, record.id])

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="晚间复盘"
      footer={
        <Button
          block
          onClick={() => onSave({ wins, improvements, learned, tomorrow, mood })}
        >
          保存复盘
        </Button>
      }
    >
      <div className="space-y-4 pt-2">
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">
            心情
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setMood(n)}
                className={
                  'tap flex-1 h-11 rounded-xl border text-lg transition-colors ' +
                  (mood === n
                    ? 'border-[var(--color-accent)] bg-[var(--color-bg-hover)]'
                    : 'border-[var(--color-border-subtle)]')
                }
              >
                {['😫', '😕', '😐', '🙂', '😄'][n - 1]}
              </button>
            ))}
          </div>
        </div>

        <ReviewField label="今天做对了什么" value={wins} onChange={setWins} placeholder="哪怕是小事也值得记录" />
        <ReviewField label="哪里可以更好" value={improvements} onChange={setImprovements} placeholder="诚实地看看自己" />
        <ReviewField label="今天学到了什么" value={learned} onChange={setLearned} placeholder="一个观点、一个方法、一个教训" />
        <ReviewField label="明天最重要的事" value={tomorrow} onChange={setTomorrow} placeholder="让明天有方向" />
      </div>
    </Sheet>
  )
}

function ReviewField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div>
      <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">
        {label}
      </label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} />
    </div>
  )
}
