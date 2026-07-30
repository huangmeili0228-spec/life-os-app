import { useLocation, useNavigate } from 'react-router-dom'
import { Home, CalendarDays, Lightbulb, Grid, Plus } from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'
import { QuickAddSheet } from './QuickAddSheet'

const tabs = [
  { path: '/', label: '首页', icon: Home },
  { path: '/daily', label: 'Daily', icon: CalendarDays },
  { path: '/insight', label: 'Insight', icon: Lightbulb },
  { path: '/more', label: '更多', icon: Grid },
]

export function TabBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-bg)]/90 backdrop-blur-xl border-t border-[var(--color-border)] safe-bottom">
        <div className="flex items-center justify-around h-14 px-2">
          {tabs.slice(0, 2).map((tab) => {
            const Icon = tab.icon
            const active = isActive(tab.path)
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="tap flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
              >
                <Icon
                  size={23}
                  strokeWidth={active ? 2.4 : 1.8}
                  className={active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-tertiary)]'}
                />
                <span
                  className={clsx(
                    'text-[10px]',
                    active ? 'text-[var(--color-accent)] font-medium' : 'text-[var(--color-text-tertiary)]',
                  )}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}

          {/* 中间快速记录按钮 */}
          <button
            onClick={() => setQuickAddOpen(true)}
            className="tap flex items-center justify-center mx-1"
          >
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-accent)] flex items-center justify-center shadow-lg shadow-[var(--color-accent)]/30">
              <Plus size={26} className="text-white" strokeWidth={2.5} />
            </div>
          </button>

          {tabs.slice(2).map((tab) => {
            const Icon = tab.icon
            const active = isActive(tab.path)
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="tap flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
              >
                <Icon
                  size={23}
                  strokeWidth={active ? 2.4 : 1.8}
                  className={active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-tertiary)]'}
                />
                <span
                  className={clsx(
                    'text-[10px]',
                    active ? 'text-[var(--color-accent)] font-medium' : 'text-[var(--color-text-tertiary)]',
                  )}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      <QuickAddSheet open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </>
  )
}
