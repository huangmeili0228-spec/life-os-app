import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Plus,
  Activity,
  Trash2,
  Dumbbell,
  Moon,
  ChevronDown,
  ChevronUp,
  HeartPulse,
} from 'lucide-react'
import { Page, PageHeader } from '../../components/layout/Page'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { Input, Textarea } from '../../components/ui/Input'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/Confirm'
import { db, type BodyRecord } from '../../db/database'
import { uid, nowISO, toDateStr, dayLabel, formatDate } from '../../utils/date'

const workoutTypes = ['力量', '有氧', 'HIIT', '拉伸', '瑜伽', '球类', '游泳', '骑行', '跑步', '其他']

export function BodyPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<BodyRecord | null>(null)

  const records = useLiveQuery(
    () => db.body.orderBy('date').reverse().toArray(),
    [],
    [],
  )

  const todayStr = toDateStr()
  const todayRecord = useMemo(
    () => records?.find((r) => r.date === todayStr),
    [records, todayStr],
  )

  // 有体重的记录（正序，用于折线图）
  const weightRecords = useMemo(
    () =>
      (records ?? [])
        .filter((r) => r.weight != null)
        .slice()
        .reverse(),
    [records],
  )

  const latestWeight = weightRecords.length > 0 ? weightRecords[weightRecords.length - 1].weight : undefined
  const prevWeight = weightRecords.length > 1 ? weightRecords[weightRecords.length - 2].weight : undefined
  const weightTrend = latestWeight != null && prevWeight != null ? latestWeight - prevWeight : 0

  return (
    <Page>
      <PageHeader
        title="Body"
        subtitle="身体是不是越来越健康"
        right={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={18} /> 记录
          </Button>
        }
      />

      <div className="px-4 space-y-4">
        {/* 体重趋势 */}
        {weightRecords.length > 0 && (
          <Card>
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-xs text-[var(--color-text-tertiary)]">最新体重</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-bold text-[var(--color-text)]">
                    {latestWeight}
                  </span>
                  <span className="text-sm text-[var(--color-text-tertiary)]">kg</span>
                  {prevWeight != null && weightTrend !== 0 && (
                    <span
                      className={
                        'text-xs font-medium ml-1 ' +
                        (weightTrend < 0
                          ? 'text-[var(--color-success)]'
                          : 'text-[var(--color-danger)]')
                      }
                    >
                      {weightTrend < 0 ? '▼' : '▲'} {Math.abs(weightTrend).toFixed(1)}kg
                    </span>
                  )}
                </div>
              </div>
              {weightRecords.length > 1 && (
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  {weightRecords.length} 条记录
                </span>
              )}
            </div>
            <WeightChart records={weightRecords} />
          </Card>
        )}

        {/* 今日记录 */}
        {todayRecord && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/15 flex items-center justify-center">
                <HeartPulse size={16} className="text-[var(--color-accent)]" />
              </div>
              <h3 className="text-[15px] font-semibold text-[var(--color-text)]">
                今日记录
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {todayRecord.weight != null && (
                <StatBox label="体重" value={`${todayRecord.weight} kg`} />
              )}
              {todayRecord.bodyFat != null && (
                <StatBox label="体脂" value={`${todayRecord.bodyFat}%`} />
              )}
              {todayRecord.sleep && (
                <StatBox
                  label="睡眠"
                  value={`${todayRecord.sleep.hours}h`}
                  sub={'★'.repeat(todayRecord.sleep.quality)}
                />
              )}
              {todayRecord.workout && (
                <StatBox
                  label="训练"
                  value={todayRecord.workout.type}
                  sub={`${todayRecord.workout.duration}min`}
                />
              )}
            </div>
          </Card>
        )}

        {/* 历史记录列表 */}
        {records && records.length > 0 ? (
          <div className="space-y-2.5">
            {records.map((r) => (
              <HistoryCard key={r.id} record={r} onClick={() => setEditing(r)} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Activity size={26} />}
            title="还没有身体记录"
            description="记录体重、训练、睡眠，见证身体的变化"
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={16} /> 开始记录
              </Button>
            }
          />
        )}
      </div>

      {(createOpen || editing) && (
        <BodyEditor
          open={createOpen || !!editing}
          item={editing ?? undefined}
          onClose={() => {
            setCreateOpen(false)
            setEditing(null)
          }}
          onSave={async (data) => {
            if (editing) {
              await db.body.update(editing.id, { ...data, updatedAt: nowISO() })
            } else {
              const now = nowISO()
              await db.body.add({ ...data, id: uid(), createdAt: now, updatedAt: now })
            }
            setCreateOpen(false)
            setEditing(null)
          }}
          onDelete={editing ? async () => {
            await db.body.delete(editing.id)
            setEditing(null)
          } : undefined}
        />
      )}
    </Page>
  )
}

// ============================================================
// 体重折线图（SVG 手绘）
// ============================================================
function WeightChart({ records }: { records: BodyRecord[] }) {
  const width = 300
  const height = 80
  const padding = 8

  const weights = records.map((r) => r.weight!)
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)
  const range = maxW - minW || 1

  const points = records.map((r, i) => {
    const x = padding + (i / Math.max(records.length - 1, 1)) * (width - padding * 2)
    const y = padding + (1 - (r.weight! - minW) / range) * (height - padding * 2)
    return { x, y, weight: r.weight!, date: r.date }
  })

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <path
        d={pathD}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === points.length - 1 ? 4 : 2.5}
          fill="var(--color-accent)"
        />
      ))}
    </svg>
  )
}

// ============================================================
// 统计小方块
// ============================================================
function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-bg-hover)] px-3 py-2.5">
      <p className="text-xs text-[var(--color-text-tertiary)]">{label}</p>
      <p className="text-[15px] font-semibold text-[var(--color-text)] mt-0.5">{value}</p>
      {sub && <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{sub}</p>}
    </div>
  )
}

// ============================================================
// 历史记录卡片
// ============================================================
function HistoryCard({ record, onClick }: { record: BodyRecord; onClick: () => void }) {
  return (
    <Card className="tap cursor-pointer" onClick={onClick}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-sm font-medium text-[var(--color-text)]">
          {dayLabel(record.date)}
        </span>
        <span className="text-xs text-[var(--color-text-tertiary)]">
          {formatDate(record.date)}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {record.weight != null && (
          <Tag text={`${record.weight}kg`} />
        )}
        {record.bodyFat != null && (
          <Tag text={`体脂 ${record.bodyFat}%`} />
        )}
        {record.workout && (
          <Tag text={record.workout.type} icon={<Dumbbell size={11} />} />
        )}
        {record.sleep && (
          <Tag text={`睡眠 ${record.sleep.hours}h`} icon={<Moon size={11} />} />
        )}
        {record.diet && (
          <Tag text={`蛋白质 ${record.diet.protein}g`} />
        )}
        {record.note && (
          <Tag text="备注" />
        )}
      </div>
    </Card>
  )
}

function Tag({ text, icon }: { text: string; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]">
      {icon}
      {text}
    </span>
  )
}

// ============================================================
// 新建/编辑 Sheet
// ============================================================
interface WorkoutItem {
  name: string
  sets: number
  reps: number
  weight?: number
}

function BodyEditor({
  open,
  item,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  item?: BodyRecord
  onClose: () => void
  onSave: (data: Omit<BodyRecord, 'id' | 'createdAt' | 'updatedAt'>) => void
  onDelete?: () => void
}) {
  const [date, setDate] = useState(item?.date ?? toDateStr())
  const [weight, setWeight] = useState(item?.weight?.toString() ?? '')
  const [bodyFat, setBodyFat] = useState(item?.bodyFat?.toString() ?? '')
  const [sleepHours, setSleepHours] = useState(item?.sleep?.hours?.toString() ?? '')
  const [sleepQuality, setSleepQuality] = useState(item?.sleep?.quality ?? 3)
  const [hasWorkout, setHasWorkout] = useState(!!item?.workout)
  const [workoutType, setWorkoutType] = useState(item?.workout?.type ?? '力量')
  const [workoutDuration, setWorkoutDuration] = useState(item?.workout?.duration?.toString() ?? '')
  const [workoutItems, setWorkoutItems] = useState<WorkoutItem[]>(item?.workout?.items ?? [])
  const [hasDiet, setHasDiet] = useState(!!item?.diet)
  const [dietMeals, setDietMeals] = useState(item?.diet?.meals ?? '')
  const [dietProtein, setDietProtein] = useState(item?.diet?.protein?.toString() ?? '')
  const [note, setNote] = useState(item?.note ?? '')
  const toast = useToast()
  const confirm = useConfirm()

  const handleSave = () => {
    const data: Omit<BodyRecord, 'id' | 'createdAt' | 'updatedAt'> = { date }

    if (weight.trim()) data.weight = parseFloat(weight)
    if (bodyFat.trim()) data.bodyFat = parseFloat(bodyFat)
    if (sleepHours.trim()) {
      data.sleep = { hours: parseFloat(sleepHours), quality: sleepQuality }
    }
    if (hasWorkout && workoutDuration.trim()) {
      data.workout = {
        type: workoutType,
        duration: parseInt(workoutDuration),
        items: workoutItems.filter((i) => i.name.trim()),
      }
    }
    if (hasDiet && dietMeals.trim()) {
      data.diet = {
        meals: dietMeals,
        protein: parseFloat(dietProtein) || 0,
      }
    }
    if (note.trim()) data.note = note

    onSave(data)
  }

  const canSave = date && (weight.trim() || bodyFat.trim() || sleepHours.trim() || hasWorkout || hasDiet || note.trim())

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={item ? '编辑记录' : '记录身体'}
      footer={
        <div className="flex gap-2">
          {onDelete && (
            <Button
              variant="danger"
              onClick={async () => {
                if (await confirm({ title: '删除这条记录？', danger: true, confirmText: '删除' })) {
                  onDelete()
                  toast('已删除')
                }
              }}
            >
              <Trash2 size={18} />
            </Button>
          )}
          <Button block onClick={handleSave} disabled={!canSave}>
            保存
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pt-2">
        {/* 日期 */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            日期
          </label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {/* 体重 & 体脂 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">
              体重 (kg)
            </label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="70.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">
              体脂 (%)
            </label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="18"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
            />
          </div>
        </div>

        {/* 睡眠 */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            睡眠时长 (h)
          </label>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="7.5"
            value={sleepHours}
            onChange={(e) => setSleepHours(e.target.value)}
          />
        </div>
        {sleepHours.trim() && (
          <div>
            <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">
              睡眠质量
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setSleepQuality(n)}
                  className={
                    'tap flex-1 h-10 rounded-xl border text-sm transition-colors ' +
                    (sleepQuality === n
                      ? 'border-[var(--color-accent)] bg-[var(--color-bg-hover)] text-[var(--color-text)]'
                      : 'border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)]')
                  }
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 训练 */}
        <div>
          <button
            onClick={() => setHasWorkout(!hasWorkout)}
            className="tap flex items-center justify-between w-full"
          >
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">
              训练
            </label>
            {hasWorkout ? (
              <ChevronUp size={18} className="text-[var(--color-text-tertiary)]" />
            ) : (
              <ChevronDown size={18} className="text-[var(--color-text-tertiary)]" />
            )}
          </button>
          {hasWorkout && (
            <div className="space-y-3 mt-2">
              <div className="flex flex-wrap gap-2">
                {workoutTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setWorkoutType(t)}
                    className={
                      'tap h-8 px-3 rounded-full text-xs border transition-colors ' +
                      (workoutType === t
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                        : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]')
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-tertiary)] mb-1 block">
                  时长 (分钟)
                </label>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="45"
                  value={workoutDuration}
                  onChange={(e) => setWorkoutDuration(e.target.value)}
                />
              </div>
              {/* 动作项 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-[var(--color-text-tertiary)]">动作</label>
                  <button
                    onClick={() =>
                      setWorkoutItems([...workoutItems, { name: '', sets: 3, reps: 10 }])
                    }
                    className="tap text-xs text-[var(--color-accent)]"
                  >
                    + 添加
                  </button>
                </div>
                {workoutItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <Input
                      placeholder="动作名"
                      value={item.name}
                      onChange={(e) => {
                        const next = [...workoutItems]
                        next[idx] = { ...next[idx], name: e.target.value }
                        setWorkoutItems(next)
                      }}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="组"
                      value={item.sets}
                      onChange={(e) => {
                        const next = [...workoutItems]
                        next[idx] = { ...next[idx], sets: parseInt(e.target.value) || 0 }
                        setWorkoutItems(next)
                      }}
                      className="w-16 text-center"
                    />
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="次"
                      value={item.reps}
                      onChange={(e) => {
                        const next = [...workoutItems]
                        next[idx] = { ...next[idx], reps: parseInt(e.target.value) || 0 }
                        setWorkoutItems(next)
                      }}
                      className="w-16 text-center"
                    />
                    <button
                      onClick={() => setWorkoutItems(workoutItems.filter((_, i) => i !== idx))}
                      className="tap w-9 h-11 flex items-center justify-center text-[var(--color-text-tertiary)] shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 饮食 */}
        <div>
          <button
            onClick={() => setHasDiet(!hasDiet)}
            className="tap flex items-center justify-between w-full"
          >
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">
              饮食
            </label>
            {hasDiet ? (
              <ChevronUp size={18} className="text-[var(--color-text-tertiary)]" />
            ) : (
              <ChevronDown size={18} className="text-[var(--color-text-tertiary)]" />
            )}
          </button>
          {hasDiet && (
            <div className="space-y-3 mt-2">
              <div>
                <label className="text-xs text-[var(--color-text-tertiary)] mb-1 block">
                  吃了什么
                </label>
                <Textarea
                  placeholder="早餐、午餐、晚餐…"
                  value={dietMeals}
                  onChange={(e) => setDietMeals(e.target.value)}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-tertiary)] mb-1 block">
                  蛋白质 (g)
                </label>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="120"
                  value={dietProtein}
                  onChange={(e) => setDietProtein(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* 备注 */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            备注
          </label>
          <Textarea
            placeholder="身体感受、状态…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
        </div>
      </div>
    </Sheet>
  )
}

export default BodyPage
