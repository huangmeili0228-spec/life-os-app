import { HashRouter, Routes, Route } from 'react-router-dom'
import { TabBar } from './components/layout/TabBar'
import { ConfirmProvider } from './components/ui/Confirm'
import { ToastProvider } from './components/ui/Toast'
import { DashboardPage } from './modules/dashboard/DashboardPage'
import { DailyPage } from './modules/daily/DailyPage'
import { InsightPage } from './modules/insight/InsightPage'
import { MorePage } from './modules/settings/MorePage'
import { WeeklyPage } from './modules/weekly/WeeklyPage'
import { MonthlyPage } from './modules/monthly/MonthlyPage'
import { QuarterlyPage } from './modules/quarterly/QuarterlyPage'
import { ProjectPage } from './modules/project/ProjectPage'
import { GrowthPage } from './modules/growth/GrowthPage'
import { BodyPage } from './modules/body/BodyPage'
import { FinancePage } from './modules/finance/FinancePage'
import { DecisionPage } from './modules/decision/DecisionPage'
import { AchievementPage } from './modules/achievement/AchievementPage'
import { SecondBrainPage } from './modules/second-brain/SecondBrainPage'
import { AiLearningPage } from './modules/ai-learning/AiLearningPage'
import { SettingsPage } from './modules/settings/SettingsPage'

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <HashRouter>
          <div className="max-w-[480px] mx-auto relative bg-[var(--color-bg)] min-h-dvh">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/daily" element={<DailyPage />} />
              <Route path="/insight" element={<InsightPage />} />
              <Route path="/more" element={<MorePage />} />
              <Route path="/weekly" element={<WeeklyPage />} />
              <Route path="/monthly" element={<MonthlyPage />} />
              <Route path="/quarterly" element={<QuarterlyPage />} />
              <Route path="/project" element={<ProjectPage />} />
              <Route path="/growth" element={<GrowthPage />} />
              <Route path="/body" element={<BodyPage />} />
              <Route path="/finance" element={<FinancePage />} />
              <Route path="/decision" element={<DecisionPage />} />
              <Route path="/achievement" element={<AchievementPage />} />
              <Route path="/second-brain" element={<SecondBrainPage />} />
              <Route path="/ai-learning" element={<AiLearningPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
            <TabBar />
          </div>
        </HashRouter>
      </ConfirmProvider>
    </ToastProvider>
  )
}
