import { useNavigate } from 'react-router-dom'
import {
  TrendingUp,
  FolderKanban,
  HeartPulse,
  Wallet,
  GitBranch,
  Trophy,
  Brain,
  Bot,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { Page, PageHeader } from '../../components/layout/Page'
import { Card } from '../../components/ui/Card'

interface ModuleEntry {
  path: string
  title: string
  desc: string
  icon: LucideIcon
  color: string
}

const modules: ModuleEntry[] = [
  { path: '/weekly', title: 'Weekly KPI', desc: '这一周有没有真正前进', icon: TrendingUp, color: '#6366f1' },
  { path: '/monthly', title: 'Monthly KPI', desc: '月度复盘与指标', icon: BarChart3, color: '#8b5cf6' },
  { path: '/quarterly', title: 'Quarterly KPI', desc: '季度目标进度', icon: BarChart3, color: '#a855f7' },
  { path: '/project', title: 'Project', desc: '离长期目标还有多远', icon: FolderKanban, color: '#3b82f6' },
  { path: '/growth', title: 'Growth', desc: '今天我哪里成长了', icon: HeartPulse, color: '#ec4899' },
  { path: '/body', title: 'Body', desc: '身体是不是越来越健康', icon: HeartPulse, color: '#10b981' },
  { path: '/finance', title: 'Finance', desc: '这笔钱值不值得', icon: Wallet, color: '#f59e0b' },
  { path: '/decision', title: 'Decision Log', desc: '今天做了什么重要决定', icon: GitBranch, color: '#06b6d4' },
  { path: '/achievement', title: 'Achievement', desc: '里程碑归档', icon: Trophy, color: '#eab308' },
  { path: '/second-brain', title: 'Second Brain', desc: '长期资料库', icon: Brain, color: '#14b8a6' },
  { path: '/ai-learning', title: 'AI Learning', desc: 'AI 学习记录', icon: Bot, color: '#f97316' },
  { path: '/settings', title: 'Settings', desc: '设置', icon: Settings, color: '#6b7280' },
]

export function MorePage() {
  const navigate = useNavigate()

  return (
    <Page>
      <PageHeader title="更多" subtitle="所有模块" />
      <div className="px-4 grid grid-cols-2 gap-3">
        {modules.map((m) => {
          const Icon = m.icon
          return (
            <Card
              key={m.path}
              padded
              className="tap cursor-pointer active:bg-[var(--color-bg-hover)]"
              onClick={() => navigate(m.path)}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-2.5"
                style={{ background: m.color + '22' }}
              >
                <Icon size={20} style={{ color: m.color }} />
              </div>
              <h3 className="text-[15px] font-semibold text-[var(--color-text)]">{m.title}</h3>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5 leading-relaxed">
                {m.desc}
              </p>
            </Card>
          )
        })}
      </div>
    </Page>
  )
}
