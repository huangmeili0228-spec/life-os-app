import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ListTodo, Lightbulb, Brain, HeartPulse, GitBranch,
  Trophy, Wallet, Dumbbell, Scale,
} from 'lucide-react'
import { Sheet } from '../ui/Sheet'
import { Textarea } from '../ui/Input'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { db, type InsightRecord } from '../../db/database'
import { uid, nowISO } from '../../utils/date'

interface QuickAddSheetProps {
  open: boolean
  onClose: () => void
}

/* ============================================================
   快速记录面板
   理念：任何时候点 + ，都能快速记录任何东西
   ============================================================ */

const actions = [
  { id: 'task', label: '记录任务', icon: ListTodo, color: 'var(--color-accent)', desc: '添加到今日待办' },
  { id: 'idea', label: '记录想法', icon: Lightbulb, color: 'var(--color-warning)', desc: '一闪而过的念头' },
  { id: 'reflection', label: '记录反思', icon: Brain, color: 'var(--color-lavender)', desc: '今天的感悟与成长' },
  { id: 'growth', label: '记录成长', icon: HeartPulse, color: 'var(--color-pink)', desc: '人格成长的每一步' },
  { id: 'decision', label: '记录决策', icon: GitBranch, color: 'var(--color-blue)', desc: '今天做了什么决定' },
  { id: 'achievement', label: '记录成就', icon: Trophy, color: 'var(--color-success)', desc: '值得记住的里程碑' },
  { id: 'expense', label: '记录支出', icon: Wallet, color: 'var(--color-peach)', desc: '今天花了什么钱' },
  { id: 'workout', label: '记录训练', icon: Dumbbell, color: 'var(--color-success)', desc: '今天的训练情况' },
  { id: 'weight', label: '记录体重', icon: Scale, color: 'var(--color-blue)', desc: '记录体重体脂数据' },
]

type ActionId = typeof actions[number]['id']

export function QuickAddSheet({ open, onClose }: QuickAddSheetProps) {
  const [selected, setSelected] = useState<ActionId | null>(null)
  const [text, setText] = useState('')
  const navigate = useNavigate()
  const toast = useToast()

  const handleAction = (id: ActionId) => {
    // 需要导航到具体页面的
    const pageMap: Record<string, string> = {
      task: '/daily',
      growth: '/growth',
      decision: '/decision',
      achievement: '/achievement',
      expense: '/finance',
      workout: '/body',
      weight: '/body',
    }
    const page = pageMap[id]
    if (page) {
      onClose()
      navigate(page)
      return
    }
    // 想法和反思走快速文本输入
    setSelected(id)
  }

  const handleSaveQuick = async () => {
    const content = text.trim()
    if (!content) return

    const now = nowISO()
    const type: InsightRecord['type'] = selected === 'reflection' ? 'reflection' : 'idea'
    await db.insights.add({
      id: uid(),
      type,
      title: content.slice(0, 30) + (content.length > 30 ? '…' : ''),
      content,
      tags: [],
      starred: false,
      createdAt: now,
      updatedAt: now,
    })
    setText('')
    setSelected(null)
    onClose()
    toast('已记录')
  }

  const handleClose = () => {
    setSelected(null)
    setText('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={handleClose} title={selected ? '快速记录' : '快速记录'}>
      {!selected ? (
        /* 菜单模式 */
        <div className="grid grid-cols-3 gap-2 pt-2">
          {actions.map((a) => {
            const Icon = a.icon
            return (
              <button
                key={a.id}
                onClick={() => handleAction(a.id as ActionId)}
                className="tap flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-hover)] transition-colors"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: a.color + '18' }}
                >
                  <Icon size={18} style={{ color: a.color }} />
                </div>
                <span className="text-xs font-medium text-[var(--color-text)]">{a.label}</span>
                <span className="text-[10px] text-[var(--color-text-tertiary)] text-center leading-tight">
                  {a.desc}
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        /* 快速输入模式（想法/反思） */
        <div className="pt-2 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => setSelected(null)}
              className="tap text-xs text-[var(--color-accent)]"
            >
              ← 返回
            </button>
            <span className="text-xs text-[var(--color-text-tertiary)]">
              {selected === 'reflection' ? '记录反思' : '记录想法'}
            </span>
          </div>
          <Textarea
            autoFocus
            placeholder={
              selected === 'reflection'
                ? '今天有什么感悟？哪里做得比过去好？'
                : '此刻想到了什么？哪怕只是一闪而过的念头…'
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="!bg-[var(--color-bg)]"
          />
          <Button block onClick={handleSaveQuick} disabled={!text.trim()}>
            记录
          </Button>
          <p className="text-[11px] text-[var(--color-text-tertiary)] text-center">
            记录后会进入 Insight，可随时补充标签和详细思考
          </p>
        </div>
      )}
    </Sheet>
  )
}
