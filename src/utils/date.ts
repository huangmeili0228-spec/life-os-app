// ============================================================
// 通用工具函数
// ============================================================

/** 生成唯一 ID */
export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  )
}

/** 当前 ISO 时间戳 */
export function nowISO(): string {
  return new Date().toISOString()
}

/** 日期 -> YYYY-MM-DD（本地时区） */
export function toDateStr(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 解析 YYYY-MM-DD -> Date（本地） */
export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** 本周一的日期字符串 */
export function startOfWeek(d: Date = new Date()): string {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day // 周一为起点
  date.setDate(date.getDate() + diff)
  return toDateStr(date)
}

/** 本周日的日期字符串 */
export function endOfWeek(d: Date = new Date()): string {
  const start = parseDate(startOfWeek(d))
  start.setDate(start.getDate() + 6)
  return toDateStr(start)
}

/** 加/减天数 */
export function addDays(dateStr: string, n: number): string {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

/** 友好的日期显示 */
export function formatDate(dateStr: string, withWeekday = false): string {
  const d = parseDate(dateStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  let result = `${month}月${day}日`
  if (withWeekday) result += ` 周${weekdays[d.getDay()]}`
  return result
}

/** 相对时间 */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}小时前`
  const day = Math.floor(hour / 24)
  if (day < 30) return `${day}天前`
  const month = Math.floor(day / 30)
  if (month < 12) return `${month}个月前`
  return `${Math.floor(month / 12)}年前`
}

/** 今天/昨天/前天 标签 */
export function dayLabel(dateStr: string): string {
  const today = toDateStr()
  const yesterday = addDays(today, -1)
  const beforeYesterday = addDays(today, -2)
  if (dateStr === today) return '今天'
  if (dateStr === yesterday) return '昨天'
  if (dateStr === beforeYesterday) return '前天'
  return formatDate(dateStr, true)
}

/** 当前年第几周 */
export function weekNumber(dateStr: string = toDateStr()): number {
  const d = parseDate(dateStr)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}
