import { useMemo, useState, useCallback, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import {
  Check, ChevronRight, Lightbulb, Trophy, GitBranch,
  GraduationCap, Bot, Dumbbell, Sprout, Plus, Trash2,
  X, GripVertical,
} from 'lucide-react'
import { Page } from '../../components/layout/Page'
import { Sheet } from '../../components/ui/Sheet'
import { Input, Textarea } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/Confirm'
import { db, type DailyRecord, type HabitDef, type Countdown } from '../../db/database'
import {
  toDateStr, startOfWeek, dayLabel, formatDate, parseDate,
  uid, nowISO,
} from '../../utils/date'

/* ============================================================
   Life OS 首页 — 真正可操作的人生驾驶舱
   ============================================================ */

export function DashboardPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const today = toDateStr()

  const todayRecord = useLiveQuery(() => db.daily.where('date').equals(today).first(), [today])
  const recentInsights = useLiveQuery(() => db.insights.orderBy('createdAt').reverse().limit(5).toArray(), [])
  const weeklyKpi = useLiveQuery(() => db.weeklyKpis.where('weekStart').equals(startOfWeek()).first(), [])
  const recentGrowth = useLiveQuery(() => db.growth.orderBy('date').reverse().limit(1).toArray(), [])
  const recentAchievement = useLiveQuery(() => db.achievements.orderBy('date').reverse().limit(1).toArray(), [])
  const recentDecision = useLiveQuery(() => db.decisions.orderBy('date').reverse().limit(1).toArray(), [])
  const activeProjects = useLiveQuery(() => db.projects.filter(p => p.status === 'active').toArray(), [])
  const habitDefs = useLiveQuery(() => db.habits.filter(h => h.active).toArray(), [])
  const habitLogsToday = useLiveQuery(() => db.habitLogs.where('date').equals(today).toArray(), [today])
  const countdowns = useLiveQuery(() => db.countdowns.orderBy('date').toArray(), [])

  const tasks = todayRecord?.topTasks ?? []
  const doneCount = tasks.filter(t => t.done).length

  const dailyReminder = useMemo(() => {
    const reminders = [
      '今天比昨天更进一步。', '行动会带来答案。', '每天一点点，就是巨大的成长。',
      '不用追求完美，继续前进就很好。', '专注当下，放下焦虑。',
      '照顾好自己，才能走得更远。', '进步不在于快，而在于持续。',
      '你正在成为你想成为的人。',
    ]
    return reminders[new Date().getDate() % reminders.length]
  }, [])

  const { greeting, subGreeting, emoji } = useMemo(() => {
    const h = new Date().getHours()
    if (h < 6) return { greeting: '夜深了', subGreeting: '好好休息，明天继续。', emoji: '🌙' }
    if (h < 11) return { greeting: '早安', subGreeting: '今天也会是值得期待的一天。', emoji: '☀️' }
    if (h < 14) return { greeting: '你好', subGreeting: '已经完成一半啦，继续保持节奏。', emoji: '🌼' }
    if (h < 18) return { greeting: '你好', subGreeting: '下午的时光也很珍贵。', emoji: '🌿' }
    if (h < 22) return { greeting: '晚上好', subGreeting: '今天辛苦啦，一起回顾今天吧。', emoji: '🌙' }
    return { greeting: '夜深了', subGreeting: '好好休息，明天继续。', emoji: '🌙' }
  }, [])

  // 确保 Daily 记录存在
  const ensureDailyRecord = useCallback(async () => {
    const existing = await db.daily.where('date').equals(today).first()
    if (existing) return existing
    const now = nowISO()
    const record: DailyRecord = {
      id: uid(), date: today, topTasks: [], timeBlocks: [], createdAt: now, updatedAt: now,
    }
    await db.daily.add(record)
    return record
  }, [today])

  // 初始化默认习惯（首次使用）
  const ensureHabits = useCallback(async () => {
    const existing = await db.habits.count()
    if (existing > 0) return
    const now = nowISO()
    const defaults: Omit<HabitDef, 'id' | 'createdAt' | 'updatedAt'>[] = [
      { name: '学习', icon: '📚', color: 'var(--color-accent)', order: 0, active: true },
      { name: 'AI', icon: '🤖', color: 'var(--color-blue)', order: 1, active: true },
      { name: '运动', icon: '💪', color: 'var(--color-success)', order: 2, active: true },
      { name: '阅读', icon: '📖', color: 'var(--color-warning)', order: 3, active: true },
      { name: '复盘', icon: '🌙', color: 'var(--color-lavender)', order: 4, active: true },
      { name: '专注', icon: '🧘', color: 'var(--color-pink)', order: 5, active: true },
    ]
    for (const h of defaults) {
      await db.habits.add({ ...h, id: uid(), createdAt: now, updatedAt: now })
    }
  }, [])

  useEffect(() => { ensureHabits() }, [ensureHabits])

  // ============ 弹窗状态 ============
  const [moodSheet, setMoodSheet] = useState(false)
  const [quickInsight, setQuickInsight] = useState(false)
  const [quickInsightText, setQuickInsightText] = useState('')
  const [editHabitsSheet, setEditHabitsSheet] = useState(false)
  const [countdownSheet, setCountdownSheet] = useState(false)
  const [editingCountdown, setEditingCountdown] = useState<Countdown | null>(null)

  // 心情选择
  const handleSetMood = async (mood: number) => {
    const record = await ensureDailyRecord()
    const review = record.review ?? { wins: '', improvements: '', learned: '', tomorrow: '', mood: 3 }
    await db.daily.update(record.id, { review: { ...review, mood }, updatedAt: nowISO() })
    setMoodSheet(false)
    toast('心情已记录')
  }

  // 快速记录 Insight
  const handleQuickInsight = async () => {
    const text = quickInsightText.trim()
    if (!text) return
    const now = nowISO()
    await db.insights.add({ id: uid(), type: 'idea', title: text.slice(0, 30), content: text, tags: [], starred: false, createdAt: now, updatedAt: now })
    setQuickInsightText('')
    setQuickInsight(false)
    toast('已记录')
  }

  // 习惯打卡
  const handleHabitToggle = async (habitId: string) => {
    const logs = await db.habitLogs.where({ habitId, date: today }).toArray()
    if (logs.length > 0) {
      await db.habitLogs.bulkDelete(logs.map(l => l.id))
    } else {
      const now = nowISO()
      await db.habitLogs.add({ id: uid(), habitId, date: today, createdAt: now, updatedAt: now })
    }
  }

  // 今日打卡 set
  const checkedHabitIds = useMemo(
    () => new Set((habitLogsToday ?? []).map(l => l.habitId)),
    [habitLogsToday],
  )

  return (
    <Page bottomPad>
      <div className="px-4 pt-2 pb-24 space-y-3.5">
        {/* ===== 1. 欢迎区 ===== */}
        <div className="pt-2 pb-1">
          <h1 className="text-[26px] font-bold text-[var(--color-text)] tracking-tight leading-tight">
            {greeting}，黄漂亮{emoji}
          </h1>
          <p className="text-[15px] text-[var(--color-text-secondary)] mt-1.5 leading-relaxed">{subGreeting}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-[var(--color-text-tertiary)]">{dayLabel(today)} · {formatDate(today, true)}</span>
          </div>
          <p className="text-sm text-[var(--color-accent)] mt-2 font-medium">💬 {dailyReminder}</p>
        </div>

        {/* ===== 2. 今日状态 ===== */}
        <div className="grid grid-cols-4 gap-2">
          <StatusCard emoji="😊" label="心情"
            value={todayRecord?.review?.mood ? ['😫','😕','😐','🙂','😄'][todayRecord.review.mood - 1] : '—'}
            onClick={() => setMoodSheet(true)} />
          <StatusCard emoji="⚡" label="任务"
            value={tasks.length > 0 ? `${doneCount}/${tasks.length}` : '—'}
            onClick={() => navigate('/daily')} />
          <StatusCard emoji="🌙" label="复盘"
            value={todayRecord?.review ? '✅' : '待'}
            onClick={() => navigate('/daily')} />
          <StatusCard emoji="💡" label="记录"
            value={(recentInsights?.length ?? 0) > 0 ? `${recentInsights!.length}条` : '—'}
            onClick={() => setQuickInsight(true)} />
        </div>

        {/* ===== 3. 本周 KPI ===== */}
        <button onClick={() => navigate('/weekly')}
          className="tap w-full bg-white rounded-xl p-3.5 shadow-card text-left">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[13px] font-semibold text-[var(--color-text)] flex items-center gap-1.5">📊 本周 KPI</h3>
            <ChevronRight size={15} className="text-[var(--color-text-tertiary)]" />
          </div>
          {weeklyKpi && weeklyKpi.metrics.length > 0 ? (
            <div className="space-y-2">
              {weeklyKpi.metrics.slice(0, 3).map(m => {
                const pct = m.target ? Math.min(100, (m.actual / m.target) * 100) : 0
                return (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-secondary)] w-20 truncate">{m.name}</span>
                    <div className="flex-1 progress-bar"><div className="progress-bar-fill" style={{ width: `${pct}%` }} /></div>
                    <span className="text-xs text-[var(--color-text-tertiary)] tabular-nums w-14 text-right">{m.actual}/{m.target}</span>
                  </div>
                )
              })}
            </div>
          ) : <p className="text-xs text-[var(--color-text-tertiary)]">设定本周关键指标 →</p>}
        </button>

        {/* ===== 4. 今日三件事 (MIT) ===== */}
        <MITSection
          record={todayRecord}
          onEnsure={ensureDailyRecord}
        />

        {/* ===== 5. 今日习惯 ===== */}
        <div className="bg-white rounded-xl p-3.5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-semibold text-[var(--color-text)] flex items-center gap-1.5">✅ 今日习惯</h3>
            <button onClick={() => setEditHabitsSheet(true)}
              className="tap text-xs text-[var(--color-accent)]">编辑</button>
          </div>
          {habitDefs && habitDefs.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {habitDefs.map(h => (
                <button key={h.id}
                  onClick={() => handleHabitToggle(h.id)}
                  className="tap flex flex-col items-center gap-1 py-2 rounded-lg transition-colors"
                  style={{ background: checkedHabitIds.has(h.id) ? h.color + '18' : 'transparent' }}>
                  <span className="text-lg">{h.icon}</span>
                  <span className="text-[11px] font-medium"
                    style={{ color: checkedHabitIds.has(h.id) ? h.color : 'var(--color-text-tertiary)' }}>
                    {h.name}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--color-text-tertiary)]">还没有习惯，点击右上角「编辑」添加</p>
          )}
        </div>

        {/* ===== 6. 四大人生主线 ===== */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { path: '/project', label: '学业', icon: GraduationCap, color: 'var(--color-accent)', desc: `${activeProjects?.filter(p => p.domain === 'study').length ?? 0} 个项目` },
            { path: '/ai-learning', label: 'AI', icon: Bot, color: 'var(--color-blue)', desc: '学习记录' },
            { path: '/body', label: '身体', icon: Dumbbell, color: 'var(--color-success)', desc: '训练与健康' },
            { path: '/growth', label: '人格', icon: Sprout, color: 'var(--color-pink)', desc: recentGrowth?.[0]?.topic ?? '持续成长' },
          ].map(item => {
            const Icon = item.icon
            return (
              <button key={item.label} onClick={() => navigate(item.path)}
                className="tap bg-white rounded-xl p-3 shadow-card flex flex-col items-center gap-1.5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: item.color + '18' }}>
                  <Icon size={18} style={{ color: item.color }} />
                </div>
                <span className="text-[13px] font-medium text-[var(--color-text)]">{item.label}</span>
                <span className="text-[11px] text-[var(--color-text-tertiary)]">{item.desc}</span>
              </button>
            )
          })}
        </div>

        {/* ===== 7. 最近成长 ===== */}
        <div className="grid grid-cols-3 gap-2">
          <MiniCard icon={<Lightbulb size={15} />} color="var(--color-warning)" label="最近反思"
            content={recentInsights?.[0]?.title} fallback="去记录" onClick={() => navigate('/insight')} />
          <MiniCard icon={<Trophy size={15} />} color="var(--color-success)" label="最近成就"
            content={recentAchievement?.[0]?.title} fallback="去记录" onClick={() => navigate('/achievement')} />
          <MiniCard icon={<GitBranch size={15} />} color="var(--color-blue)" label="最近决策"
            content={recentDecision?.[0]?.title} fallback="去记录" onClick={() => navigate('/decision')} />
        </div>

        {/* ===== 8. 重要倒计时 ===== */}
        <div className="bg-white rounded-xl p-3.5 shadow-card">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[13px] font-semibold text-[var(--color-text)] flex items-center gap-1.5">⏳ 重要倒计时</h3>
            <button onClick={() => { setEditingCountdown(null); setCountdownSheet(true) }}
              className="tap text-xs text-[var(--color-accent)] flex items-center gap-0.5"><Plus size={14} /> 新增</button>
          </div>
          {countdowns && countdowns.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {countdowns.filter(c => {
                const d = parseDate(c.date); const now = new Date(); now.setHours(0,0,0,0)
                return d.getTime() >= now.getTime()
              }).slice(0, 4).map(c => {
                const days = Math.ceil((parseDate(c.date).getTime() - new Date(new Date().setHours(0,0,0,0)).getTime()) / 86400000)
                return (
                  <button key={c.id}
                    onClick={() => { setEditingCountdown(c); setCountdownSheet(true) }}
                    className="shrink-0 text-center px-4 py-2 rounded-lg tap"
                    style={{ background: c.color + '12' }}>
                    <p className="text-xl font-bold" style={{ color: c.color }}>{days}</p>
                    <p className="text-[10px] text-[var(--color-text-tertiary)]">天</p>
                    <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">{c.name}</p>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-[var(--color-text-tertiary)]">添加考试、比赛、旅行等倒计时 →</p>
          )}
        </div>
      </div>

      {/* ===== 弹窗们 ===== */}

      {/* 心情选择 */}
      <Sheet open={moodSheet} onClose={() => setMoodSheet(false)} title="今天心情如何？">
        <div className="grid grid-cols-5 gap-2 pt-2">
          {[
            { emoji: '😫', label: '很糟', mood: 1 },
            { emoji: '😕', label: '一般', mood: 2 },
            { emoji: '😐', label: '还行', mood: 3 },
            { emoji: '🙂', label: '不错', mood: 4 },
            { emoji: '😄', label: '超棒', mood: 5 },
          ].map(item => (
            <button key={item.mood}
              onClick={() => handleSetMood(item.mood)}
              className="tap flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-hover)]">
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-[11px] text-[var(--color-text-tertiary)]">{item.label}</span>
            </button>
          ))}
        </div>
      </Sheet>

      {/* 快速记录 Insight */}
      <Sheet open={quickInsight} onClose={() => setQuickInsight(false)} title="快速记录"
        footer={<Button block onClick={handleQuickInsight} disabled={!quickInsightText.trim()}>记录</Button>}>
        <Textarea autoFocus className="!bg-[var(--color-bg)]" rows={4}
          placeholder="此刻想到了什么？学到了什么？"
          value={quickInsightText} onChange={e => setQuickInsightText(e.target.value)} />
      </Sheet>

      {/* 习惯编辑 */}
      {editHabitsSheet && (
        <HabitEditor
          open={editHabitsSheet}
          onClose={() => setEditHabitsSheet(false)}
        />
      )}

      {/* 倒计时编辑 */}
      {countdownSheet && (
        <CountdownEditor
          open={countdownSheet}
          item={editingCountdown}
          onClose={() => { setCountdownSheet(false); setEditingCountdown(null) }}
        />
      )}
    </Page>
  )
}

/* ============================================================
   子组件
   ============================================================ */

/** 今日状态小卡片 */
function StatusCard({ emoji, label, value, onClick }: {
  emoji: string; label: string; value: string; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className="tap bg-white rounded-xl p-2.5 shadow-card flex flex-col items-center gap-1">
      <span className="text-lg">{emoji}</span>
      <span className="text-[11px] text-[var(--color-text-tertiary)]">{label}</span>
      <span className="text-sm font-semibold text-[var(--color-text)]">{value}</span>
    </button>
  )
}

/** 今日三件事 MIT */
function MITSection({ record, onEnsure }: {
  record?: DailyRecord
  onEnsure: () => Promise<DailyRecord>
}) {
  const [editing, setEditing] = useState(false)
  const [editTasks, setEditTasks] = useState<{ id: string; text: string; done: boolean }[]>([])

  useEffect(() => {
    setEditTasks(record?.topTasks ?? [])
  }, [record?.topTasks])

  const tasks = record?.topTasks ?? []

  const toggleTask = async (taskId: string) => {
    if (!record) return
    await db.daily.update(record.id, {
      topTasks: record.topTasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t),
      updatedAt: nowISO(),
    })
  }

  const saveEdit = async () => {
    const r = await onEnsure()
    await db.daily.update(r.id, {
      topTasks: editTasks.filter(t => t.text.trim()),
      updatedAt: nowISO(),
    })
    setEditing(false)
  }

  const addTask = () => {
    if (editTasks.filter(t => t.text.trim()).length >= 3) return
    setEditTasks([...editTasks, { id: uid(), text: '', done: false }])
  }

  const updateTask = (idx: number, text: string) => {
    setEditTasks(prev => prev.map((t, i) => i === idx ? { ...t, text } : t))
  }

  const removeTask = (idx: number) => {
    setEditTasks(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="bg-white rounded-xl p-3.5 shadow-card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[13px] font-semibold text-[var(--color-text)] flex items-center gap-1.5">📋 今日三件事</h3>
        <button onClick={() => {
          if (editing) saveEdit()
          else { setEditTasks([...tasks]); setEditing(true) }
        }} className="tap text-xs text-[var(--color-accent)]">
          {editing ? '完成' : '编辑'}
        </button>
      </div>
      {!editing ? (
        tasks.length === 0 ? (
          <button onClick={() => { setEditTasks([]); setEditing(true) }}
            className="tap w-full text-left">
            <p className="text-xs text-[var(--color-text-tertiary)]">今天最重要的三件事是什么？点击编辑 →</p>
          </button>
        ) : (
          <div className="space-y-1">
            {tasks.slice(0, 3).map(task => (
              <button key={task.id} onClick={() => toggleTask(task.id)}
                className="tap flex items-center gap-2 w-full text-left py-0.5">
                <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${task.done ? 'bg-[var(--color-accent)] border-[var(--color-accent)]' : 'border-[var(--color-border)]'}`}>
                  {task.done && <Check size={11} className="text-white" strokeWidth={3} />}
                </div>
                <span className={`text-sm ${task.done ? 'line-through text-[var(--color-text-tertiary)]' : 'text-[var(--color-text)]'}`}>
                  {task.text}
                </span>
              </button>
            ))}
          </div>
        )
      ) : (
        /* 编辑模式 */
        <div className="space-y-2">
          {editTasks.map((task, idx) => (
            <div key={task.id} className="flex items-center gap-2">
              <GripVertical size={14} className="text-[var(--color-text-tertiary)] shrink-0" />
              <Input
                value={task.text}
                onChange={e => updateTask(idx, e.target.value)}
                placeholder={`最重要的事 ${idx + 1}`}
                className="h-9 text-sm flex-1"
                autoFocus={idx === editTasks.length - 1}
              />
              <button onClick={() => removeTask(idx)}
                className="tap text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)]">
                <X size={16} />
              </button>
            </div>
          ))}
          {editTasks.filter(t => t.text.trim()).length < 3 && (
            <button onClick={addTask}
              className="tap w-full flex items-center justify-center gap-1 py-1.5 text-xs text-[var(--color-accent)] border border-dashed border-[var(--color-border)] rounded-lg">
              <Plus size={14} /> 添加
            </button>
          )}
          <p className="text-[10px] text-[var(--color-text-tertiary)]">每天最多三件最重要的事（MIT）</p>
        </div>
      )}
    </div>
  )
}

/** 习惯编辑器 */
function HabitEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const habitDefs = useLiveQuery(() => db.habits.orderBy('order').toArray(), [], [])
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('📚')
  const confirm = useConfirm()
  const toast = useToast()

  const icons = ['📚','🤖','💪','📖','🌙','🧘','🎯','💡','🎨','🎵','🏃','🧹']

  const addHabit = async () => {
    if (!newName.trim()) return
    const now = nowISO()
    const maxOrder = Math.max(0, ...(habitDefs ?? []).map(h => h.order))
    await db.habits.add({ id: uid(), name: newName.trim(), icon: newIcon, color: 'var(--color-accent)', order: maxOrder + 1, active: true, createdAt: now, updatedAt: now })
    setNewName('')
    toast('习惯已添加')
  }

  const toggleHabit = async (h: HabitDef) => {
    await db.habits.update(h.id, { active: !h.active, updatedAt: nowISO() })
  }

  const deleteHabit = async (h: HabitDef) => {
    if (await confirm({ title: '删除习惯？', message: '打卡记录也会保留', danger: true, confirmText: '删除' })) {
      await db.habits.delete(h.id)
      toast('已删除')
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="编辑习惯">
      <div className="pt-2 space-y-4">
        {/* 现有习惯 */}
        <div className="space-y-2">
          {habitDefs?.map(h => (
            <div key={h.id} className="flex items-center gap-2">
              <span className="text-lg">{h.icon}</span>
              <span className={`text-sm flex-1 ${!h.active ? 'line-through text-[var(--color-text-tertiary)]' : 'text-[var(--color-text)]'}`}>{h.name}</span>
              <button onClick={() => toggleHabit(h)}
                className="tap text-xs px-2 py-0.5 rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                {h.active ? '隐藏' : '显示'}
              </button>
              <button onClick={() => deleteHabit(h)}
                className="tap text-[var(--color-text-tertiary)]"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        {/* 新增 */}
        <div className="border-t border-[var(--color-border-subtle)] pt-4">
          <p className="text-xs text-[var(--color-text-tertiary)] mb-2">新增习惯</p>
          <div className="flex gap-2 mb-2">
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="习惯名称" className="h-9 text-sm flex-1" />
            <Button size="sm" onClick={addHabit} disabled={!newName.trim()}>添加</Button>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {icons.map(i => (
              <button key={i} onClick={() => setNewIcon(i)}
                className={`tap w-8 h-8 rounded-lg flex items-center justify-center text-sm ${newIcon === i ? 'bg-[var(--color-bg-hover)] ring-1 ring-[var(--color-accent)]' : ''}`}>{i}</button>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  )
}

/** 倒计时编辑器 */
function CountdownEditor({ open, item, onClose }: {
  open: boolean; item: Countdown | null; onClose: () => void
}) {
  const [name, setName] = useState(item?.name ?? '')
  const [date, setDate] = useState(item?.date ?? '')
  const [color, setColor] = useState(item?.color ?? 'var(--color-accent)')
  const confirm = useConfirm()
  const toast = useToast()

  const colors = ['var(--color-accent)', 'var(--color-blue)', 'var(--color-pink)', 'var(--color-warning)', 'var(--color-success)', 'var(--color-lavender)']

  const save = async () => {
    if (!name.trim() || !date) return
    const now = nowISO()
    if (item) {
      await db.countdowns.update(item.id, { name: name.trim(), date, color, updatedAt: now })
    } else {
      await db.countdowns.add({ id: uid(), name: name.trim(), date, color, createdAt: now, updatedAt: now })
    }
    toast(item ? '已更新' : '已添加')
    onClose()
  }

  const del = async () => {
    if (!item) return
    if (await confirm({ title: '删除倒计时？', danger: true, confirmText: '删除' })) {
      await db.countdowns.delete(item.id)
      toast('已删除')
      onClose()
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={item ? '编辑倒计时' : '新增倒计时'}
      footer={
        <div className="flex gap-2">
          {item && <Button variant="danger" onClick={del}><Trash2 size={18} /></Button>}
          <Button block onClick={save} disabled={!name.trim() || !date}>保存</Button>
        </div>
      }>
      <div className="space-y-4 pt-2">
        <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">名称</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="如：考研、旅行、生日" autoFocus /></div>
        <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">日期</label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">颜色</label>
          <div className="flex gap-2">{colors.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={'w-8 h-8 rounded-full transition-transform ' + (color === c ? 'ring-2 ring-offset-2 scale-110' : '')}
              style={{ background: c }} />
          ))}</div>
        </div>
      </div>
    </Sheet>
  )
}

/** 迷你卡片 */
function MiniCard({ icon, color, label, content, fallback, onClick }: {
  icon: React.ReactNode; color: string; label: string; content?: string; fallback: string; onClick: () => void
}) {
  return (
    <button onClick={onClick} className="tap bg-white rounded-xl p-3 shadow-card text-left h-full">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span style={{ color }}>{icon}</span>
        <span className="text-[11px] text-[var(--color-text-tertiary)]">{label}</span>
      </div>
      {content
        ? <p className="text-xs text-[var(--color-text)] line-clamp-2 leading-relaxed">{content}</p>
        : <p className="text-xs text-[var(--color-text-tertiary)]">{fallback}</p>}
    </button>
  )
}
