import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Wallet, TrendingUp, TrendingDown, Trash2, Star, Lightbulb } from 'lucide-react'
import { Page, PageHeader } from '../../components/layout/Page'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { Input, Textarea } from '../../components/ui/Input'
import { Segmented } from '../../components/ui/EmptyState'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/Confirm'
import { db, type FinanceRecord } from '../../db/database'
import { uid, nowISO, toDateStr, dayLabel } from '../../utils/date'

const PRESET_CATEGORIES = [
  '餐饮', '购物', '交通', '住房', '娱乐', '学习', '医疗', '社交',
  '收入-工资', '收入-其他',
]

const INCOME_CATEGORIES = ['收入-工资', '收入-其他']

// ============================================================
// 主页面
// ============================================================
export function FinancePage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<FinanceRecord | null>(null)

  const records = useLiveQuery(
    () => db.finance.orderBy('date').reverse().toArray(),
    [],
    [],
  )

  // 当前月份
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`

  // 当前月记录
  const monthRecords = useMemo(
    () => (records ?? []).filter((r) => r.date.startsWith(monthPrefix)),
    [records, monthPrefix],
  )

  // 月度汇总
  const monthExpense = monthRecords
    .filter((r) => r.type === 'expense')
    .reduce((sum, r) => sum + r.amount, 0)
  const monthIncome = monthRecords
    .filter((r) => r.type === 'income')
    .reduce((sum, r) => sum + r.amount, 0)
  const monthNet = monthIncome - monthExpense

  // 支出分类汇总
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    monthRecords
      .filter((r) => r.type === 'expense')
      .forEach((r) => {
        map.set(r.category, (map.get(r.category) ?? 0) + r.amount)
      })
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({
        category,
        amount,
        percent: monthExpense > 0 ? (amount / monthExpense) * 100 : 0,
      }))
  }, [monthRecords, monthExpense])

  // 机会成本洞察：worth <= 2 的记录
  const lowWorthRecords = useMemo(
    () =>
      monthRecords
        .filter((r) => r.type === 'expense' && r.worth <= 2)
        .sort((a, b) => a.worth - b.worth),
    [monthRecords],
  )

  const lowWorthTotal = lowWorthRecords.reduce((sum, r) => sum + r.amount, 0)

  return (
    <Page>
      <PageHeader
        title="Finance"
        subtitle="这笔钱值不值得"
        right={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={18} /> 记一笔
          </Button>
        }
      />

      <div className="px-4 space-y-4">
        {/* 月度汇总 */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/15 flex items-center justify-center">
              <Wallet size={16} className="text-[var(--color-accent)]" />
            </div>
            <h3 className="text-[15px] font-semibold text-[var(--color-text)]">
              {currentMonth}月汇总
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {/* 收入 */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp size={13} className="text-[var(--color-success)]" />
                <p className="text-xs text-[var(--color-text-tertiary)]">收入</p>
              </div>
              <p className="text-lg font-bold text-[var(--color-success)]">
                {monthIncome > 0 ? `+${formatAmount(monthIncome)}` : '—'}
              </p>
            </div>
            {/* 支出 */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingDown size={13} className="text-[var(--color-danger)]" />
                <p className="text-xs text-[var(--color-text-tertiary)]">支出</p>
              </div>
              <p className="text-lg font-bold text-[var(--color-danger)]">
                {monthExpense > 0 ? `-${formatAmount(monthExpense)}` : '—'}
              </p>
            </div>
            {/* 净额 */}
            <div className="text-center">
              <p className="text-xs text-[var(--color-text-tertiary)] mb-1">净额</p>
              <p
                className={
                  'text-lg font-bold ' +
                  (monthNet > 0
                    ? 'text-[var(--color-success)]'
                    : monthNet < 0
                      ? 'text-[var(--color-danger)]'
                      : 'text-[var(--color-text-tertiary)]')
                }
              >
                {monthNet !== 0
                  ? (monthNet > 0 ? '+' : '') + formatAmount(monthNet)
                  : '—'}
              </p>
            </div>
          </div>
        </Card>

        {/* 支出分类 */}
        {categoryBreakdown.length > 0 && (
          <Card>
            <h3 className="text-[15px] font-semibold text-[var(--color-text)] mb-3">
              支出分类
            </h3>
            <div className="space-y-2.5">
              {categoryBreakdown.map((item) => (
                <div key={item.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      {item.category}
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-medium text-[var(--color-text)]">
                        ¥{formatAmount(item.amount)}
                      </span>
                      <span className="text-xs text-[var(--color-text-tertiary)]">
                        {item.percent.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  {/* 进度条 */}
                  <div className="h-1.5 rounded-full bg-[var(--color-bg-hover)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 机会成本洞察 */}
        {lowWorthRecords.length > 0 && (
          <Card className="border-[var(--color-danger)]/30">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-danger)]/15 flex items-center justify-center">
                <Lightbulb size={16} className="text-[var(--color-danger)]" />
              </div>
              <div className="flex-1">
                <h3 className="text-[15px] font-semibold text-[var(--color-text)]">
                  本月不值得的消费
                </h3>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                  {lowWorthRecords.length} 笔，共 ¥{formatAmount(lowWorthTotal)}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {lowWorthRecords.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-2 py-1.5 border-b border-[var(--color-border-subtle)] last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-[var(--color-text)] truncate">
                        {r.category}
                      </span>
                      {r.description && (
                        <span className="text-xs text-[var(--color-text-tertiary)] truncate">
                          {r.description}
                        </span>
                      )}
                    </div>
                    {r.opportunityCost && (
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5 truncate">
                        本可：{r.opportunityCost}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-sm font-medium text-[var(--color-danger)]">
                      ¥{formatAmount(r.amount)}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          size={10}
                          className={
                            n <= r.worth
                              ? 'text-[var(--color-warning)] fill-[var(--color-warning)]'
                              : 'text-[var(--color-text-tertiary)]'
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 记录列表 */}
        {records && records.length > 0 ? (
          <div className="space-y-2.5">
            {records.map((r) => (
              <RecordCard key={r.id} record={r} onClick={() => setEditing(r)} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Wallet size={26} />}
            title="还没有财务记录"
            description="记一笔，看看钱花得值不值"
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={16} /> 开始记录
              </Button>
            }
          />
        )}
      </div>

      {/* 新建/编辑 */}
      {(createOpen || editing) && (
        <FinanceEditor
          open={createOpen || !!editing}
          item={editing ?? undefined}
          onClose={() => {
            setCreateOpen(false)
            setEditing(null)
          }}
          onSave={async (data) => {
            if (editing) {
              await db.finance.update(editing.id, { ...data, updatedAt: nowISO() })
            } else {
              const now = nowISO()
              await db.finance.add({ ...data, id: uid(), createdAt: now, updatedAt: now })
            }
            setCreateOpen(false)
            setEditing(null)
          }}
          onDelete={editing ? async () => {
            await db.finance.delete(editing.id)
            setEditing(null)
          } : undefined}
        />
      )}
    </Page>
  )
}

// ============================================================
// 格式化金额
// ============================================================
function formatAmount(n: number): string {
  if (Math.abs(n) >= 10000) {
    return (n / 10000).toFixed(1) + 'w'
  }
  return n.toFixed(n % 1 === 0 ? 0 : 2)
}

// ============================================================
// 记录卡片
// ============================================================
function RecordCard({ record, onClick }: { record: FinanceRecord; onClick: () => void }) {
  const isIncome = record.type === 'income'
  return (
    <Card className="tap cursor-pointer" onClick={onClick}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          {/* 收支类型标记 */}
          <div
            className={
              'w-2 h-2 rounded-full mt-1.5 shrink-0 ' +
              (isIncome
                ? 'bg-[var(--color-success)]'
                : 'bg-[var(--color-danger)]')
            }
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--color-text)]">
                {record.category}
              </span>
              <span className="text-xs text-[var(--color-text-tertiary)]">
                {dayLabel(record.date)}
              </span>
            </div>
            {record.description && (
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 truncate">
                {record.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              {/* worth 星级 */}
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    size={10}
                    className={
                      n <= record.worth
                        ? 'text-[var(--color-warning)] fill-[var(--color-warning)]'
                        : 'text-[var(--color-text-tertiary)]'
                    }
                  />
                ))}
              </div>
              {record.account && (
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  · {record.account}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* 金额 */}
        <div className="text-right shrink-0">
          <span
            className={
              'text-[15px] font-bold ' +
              (isIncome
                ? 'text-[var(--color-success)]'
                : 'text-[var(--color-danger)]')
            }
          >
            {isIncome ? '+' : '-'}¥{formatAmount(record.amount)}
          </span>
        </div>
      </div>
    </Card>
  )
}

// ============================================================
// 新建/编辑 Sheet
// ============================================================
function FinanceEditor({
  open,
  item,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  item?: FinanceRecord
  onClose: () => void
  onSave: (data: Omit<FinanceRecord, 'id' | 'createdAt' | 'updatedAt'>) => void
  onDelete?: () => void
}) {
  const [date, setDate] = useState(item?.date ?? toDateStr())
  const [type, setType] = useState<'income' | 'expense'>(item?.type ?? 'expense')
  const [amount, setAmount] = useState(item?.amount?.toString() ?? '')
  const [category, setCategory] = useState(item?.category ?? '餐饮')
  const [customCategory, setCustomCategory] = useState('')
  const [description, setDescription] = useState(item?.description ?? '')
  const [opportunityCost, setOpportunityCost] = useState(item?.opportunityCost ?? '')
  const [worth, setWorth] = useState(item?.worth ?? 3)
  const [account, setAccount] = useState(item?.account ?? '')

  const toast = useToast()
  const confirm = useConfirm()

  // 根据类型过滤预设分类
  const availableCategories = useMemo(() => {
    if (type === 'income') return INCOME_CATEGORIES
    return PRESET_CATEGORIES.filter((c) => !c.startsWith('收入'))
  }, [type])

  // 切换类型时重置分类
  const handleTypeChange = (v: 'income' | 'expense') => {
    setType(v)
    if (v === 'income') {
      setCategory('收入-工资')
    } else {
      setCategory('餐饮')
    }
    setCustomCategory('')
  }

  const effectiveCategory = customCategory.trim() || category

  const handleSave = () => {
    const data: Omit<FinanceRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      date,
      type,
      amount: parseFloat(amount),
      category: effectiveCategory,
      description: description.trim(),
      worth,
    }
    if (opportunityCost.trim()) data.opportunityCost = opportunityCost.trim()
    if (account.trim()) data.account = account.trim()
    onSave(data)
  }

  const canSave = date && amount.trim() && parseFloat(amount) > 0

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={item ? '编辑记录' : '记一笔'}
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

        {/* 收支类型 */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            类型
          </label>
          <Segmented
            options={[
              { value: 'expense', label: '支出' },
              { value: 'income', label: '收入' },
            ]}
            value={type}
            onChange={(v) => handleTypeChange(v)}
          />
        </div>

        {/* 金额 */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            金额 (¥)
          </label>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-lg font-semibold"
          />
        </div>

        {/* 分类 */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">
            分类
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {availableCategories.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCategory(c)
                  setCustomCategory('')
                }}
                className={
                  'tap h-8 px-3 rounded-full text-xs border transition-colors ' +
                  (category === c && !customCategory
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                    : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]')
                }
              >
                {c}
              </button>
            ))}
          </div>
          <Input
            placeholder="自定义分类"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
          />
        </div>

        {/* 描述 */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            描述
          </label>
          <Input
            placeholder="买了什么 / 为什么花这笔钱"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* 机会成本反思 */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            机会成本反思
          </label>
          <Textarea
            placeholder="这笔钱本可以用来做什么？花得值吗？"
            value={opportunityCost}
            onChange={(e) => setOpportunityCost(e.target.value)}
            rows={2}
          />
        </div>

        {/* worth 评分 */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">
            值不值？(1-5)
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setWorth(n)}
                className={
                  'tap flex-1 h-11 rounded-xl border flex items-center justify-center transition-colors ' +
                  (worth === n
                    ? 'border-[var(--color-accent)] bg-[var(--color-bg-hover)]'
                    : 'border-[var(--color-border-subtle)]')
                }
              >
                <Star
                  size={20}
                  className={
                    n <= worth
                      ? 'text-[var(--color-warning)] fill-[var(--color-warning)]'
                      : 'text-[var(--color-text-tertiary)]'
                  }
                />
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1.5 text-center">
            {['很不值得', '不太值', '一般', '比较值', '非常值得'][worth - 1]}
          </p>
        </div>

        {/* 账户 */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            账户 (可选)
          </label>
          <Input
            placeholder="微信 / 支付宝 / 银行卡 / 现金"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          />
        </div>
      </div>
    </Sheet>
  )
}

export default FinancePage
