import Dexie, { type Table } from 'dexie'

// ============================================================
// Life OS 数据库
// 所有模块共享同一个 IndexedDB 数据库，通过 Dexie 管理版本与索引。
// 每个实体都有 id / createdAt / updatedAt，时间统一用 ISO 字符串。
// ============================================================

export interface BaseRecord {
  id: string
  createdAt: string
  updatedAt: string
}

// ---- Daily 每日管理 ----
export interface DailyRecord extends BaseRecord {
  date: string // YYYY-MM-DD，一天只有一条
  // 今日最重要的事
  topTasks: { id: string; text: string; done: boolean }[]
  // 时间块规划
  timeBlocks: { id: string; start: string; end: string; title: string; category: string }[]
  // 晚间复盘
  review?: {
    wins: string // 今天做对了什么
    improvements: string // 哪里可以更好
    learned: string // 学到了什么
    tomorrow: string // 明天最重要的事
    mood: number // 1-5
  }
  // 日记/随手记
  notes?: string
}

// ---- Insight 思想沉淀 ----
export interface InsightRecord extends BaseRecord {
  type: 'reflection' | 'chatgpt' | 'book' | 'article' | 'video' | 'course' | 'idea'
  title: string
  content: string // 核心观点，markdown
  source?: string // 来源（书名、链接、对话）
  tags: string[]
  starred: boolean
  // 关联的人生方向
  domain?: 'study' | 'ai' | 'body' | 'finance' | 'growth' | 'thought'
}

// ---- Weekly KPI 周度 ----
export interface WeeklyKpi extends BaseRecord {
  weekStart: string // YYYY-MM-DD（周一）
  weekEnd: string
  // 本周关键指标
  metrics: {
    id: string
    name: string
    target: number
    actual: number
    unit: string
  }[]
  // 本周复盘
  review?: {
    achieved: string // 完成了什么
    missed: string // 没完成什么
    lesson: string // 学到什么
    nextWeek: string // 下周重点
  }
}

// ---- Monthly KPI 月度 ----
export interface MonthlyKpi extends BaseRecord {
  year: number
  month: number // 1-12
  metrics: {
    id: string
    name: string
    target: number
    actual: number
    unit: string
  }[]
  review?: {
    highlights: string
    lowlights: string
    lesson: string
    nextMonth: string
  }
}

// ---- Quarterly KPI 季度 ----
export interface QuarterlyKpi extends BaseRecord {
  year: number
  quarter: number // 1-4
  goals: {
    id: string
    name: string
    status: 'on-track' | 'at-risk' | 'behind' | 'done'
    progress: number // 0-100
    note: string
  }[]
  review?: string
}

// ---- Project 项目 ----
export interface Project extends BaseRecord {
  name: string
  description: string
  domain: 'study' | 'ai' | 'body' | 'finance' | 'growth' | 'thought' | 'other'
  status: 'active' | 'paused' | 'done' | 'archived'
  // 里程碑
  milestones: {
    id: string
    title: string
    done: boolean
    dueDate?: string
  }[]
  // 关联的长期目标
  longTermGoal?: string
  color: string
}

// ---- Growth 人格成长 ----
export interface GrowthRecord extends BaseRecord {
  date: string
  topic: string // 果敢、独立、边界、控制欲、机会成本、表达需求、决策能力、情绪稳定...
  // 今天哪里成长了
  before: string // 以前会怎样
  after: string // 现在怎样
  reflection: string // 反思
  rating: number // 1-5，这次表现的自我评价
}

// ---- Body 身体管理 ----
export interface BodyRecord extends BaseRecord {
  date: string
  weight?: number // kg
  bodyFat?: number // %
  // 围度
  waist?: number
  chest?: number
  hip?: number
  arm?: number
  // 训练
  workout?: {
    type: string // 力量/有氧/...
    items: { name: string; sets: number; reps: number; weight?: number }[]
    duration: number // 分钟
  }
  // 饮食
  diet?: {
    meals: string
    protein: number // g
    calories?: number
  }
  sleep?: {
    hours: number
    quality: number // 1-5
  }
  note?: string
  // 身体照片 base64
  photos?: string[]
}

// ---- Finance 财务 ----
export interface FinanceRecord extends BaseRecord {
  date: string
  type: 'income' | 'expense'
  amount: number
  category: string
  description: string
  // 机会成本反思：这笔钱本可以用来做什么，是否值得
  opportunityCost?: string
  worth: number // 1-5，这笔花得值不值
  account?: string
}

// ---- Decision Log 决策日志 ----
export interface DecisionRecord extends BaseRecord {
  date: string
  title: string
  context: string // 决策背景
  options: { id: string; text: string; chosen: boolean }[]
  reasoning: string // 为什么选这个
  expectedOutcome: string // 预期结果
  // 后续回溯
  reviewDate?: string
  actualOutcome?: string
  lesson?: string
  importance: number // 1-5
}

// ---- Achievement 成就 ----
export interface Achievement extends BaseRecord {
  date: string
  title: string
  description: string
  domain: string
  significance: string // 为什么重要
}

// ---- Second Brain 第二大脑 ----
export interface SecondBrainItem extends BaseRecord {
  type: 'paper' | 'course' | 'article' | 'ai-resource' | 'tool' | 'other'
  title: string
  content: string
  link?: string
  tags: string[]
  // 我的使用计划
  plan?: string
  status: 'to-read' | 'reading' | 'done' | 'archived'
}

// ---- AI Learning ----
export interface AiLearningRecord extends BaseRecord {
  date: string
  topic: string // Prompt / API / Python / Agent / Codex / 自动化
  content: string
  practice?: string // 实践项目
  resources?: string
  level: number // 1-5 自评掌握程度
}

// ---- Habit 习惯 ----
export interface HabitDef extends BaseRecord {
  name: string
  icon: string
  color: string
  order: number
  active: boolean
}

export interface HabitLog extends BaseRecord {
  habitId: string
  date: string // YYYY-MM-DD
}

// ---- Countdown 倒计时 ----
export interface Countdown extends BaseRecord {
  name: string
  date: string // YYYY-MM-DD
  color: string
}

// ---- Settings ----
export interface Setting extends BaseRecord {
  key: string
  value: unknown
}

// ============================================================
// Dexie 数据库定义
// ============================================================

export class LifeOSDatabase extends Dexie {
  daily!: Table<DailyRecord, string>
  insights!: Table<InsightRecord, string>
  weeklyKpis!: Table<WeeklyKpi, string>
  monthlyKpis!: Table<MonthlyKpi, string>
  quarterlyKpis!: Table<QuarterlyKpi, string>
  projects!: Table<Project, string>
  growth!: Table<GrowthRecord, string>
  body!: Table<BodyRecord, string>
  finance!: Table<FinanceRecord, string>
  decisions!: Table<DecisionRecord, string>
  achievements!: Table<Achievement, string>
  secondBrain!: Table<SecondBrainItem, string>
  aiLearning!: Table<AiLearningRecord, string>
  habits!: Table<HabitDef, string>
  habitLogs!: Table<HabitLog, string>
  countdowns!: Table<Countdown, string>
  settings!: Table<Setting, string>

  constructor() {
    super('LifeOSDB')
    this.version(1).stores({
      daily: 'id, date, createdAt, updatedAt',
      insights: 'id, type, starred, domain, createdAt, updatedAt, *tags',
      weeklyKpis: 'id, weekStart, createdAt, updatedAt',
      monthlyKpis: 'id, [year+month], createdAt, updatedAt',
      quarterlyKpis: 'id, [year+quarter], createdAt, updatedAt',
      projects: 'id, domain, status, createdAt, updatedAt',
      growth: 'id, date, topic, createdAt, updatedAt',
      body: 'id, date, createdAt, updatedAt',
      finance: 'id, date, type, category, createdAt, updatedAt',
      decisions: 'id, date, importance, createdAt, updatedAt',
      achievements: 'id, date, domain, createdAt, updatedAt',
      secondBrain: 'id, type, status, createdAt, updatedAt, *tags',
      aiLearning: 'id, date, topic, createdAt, updatedAt',
      settings: 'id, key',
    })
    this.version(2).stores({
      daily: 'id, date, createdAt, updatedAt',
      insights: 'id, type, starred, domain, createdAt, updatedAt, *tags',
      weeklyKpis: 'id, weekStart, createdAt, updatedAt',
      monthlyKpis: 'id, [year+month], createdAt, updatedAt',
      quarterlyKpis: 'id, [year+quarter], createdAt, updatedAt',
      projects: 'id, domain, status, createdAt, updatedAt',
      growth: 'id, date, topic, createdAt, updatedAt',
      body: 'id, date, createdAt, updatedAt',
      finance: 'id, date, type, category, createdAt, updatedAt',
      decisions: 'id, date, importance, createdAt, updatedAt',
      achievements: 'id, date, domain, createdAt, updatedAt',
      secondBrain: 'id, type, status, createdAt, updatedAt, *tags',
      aiLearning: 'id, date, topic, createdAt, updatedAt',
      settings: 'id, key',
      habits: 'id, order',
      habitLogs: 'id, [habitId+date], date',
      countdowns: 'id, date',
    })
  }
}

export const db = new LifeOSDatabase()
