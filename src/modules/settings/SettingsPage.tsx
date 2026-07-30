import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Download, Upload, Trash2, Database, Shield, Cloud,
  Clock, CheckCircle2, AlertCircle, RefreshCw,
} from 'lucide-react'
import { Page, PageHeader } from '../../components/layout/Page'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/Confirm'
import { useToast } from '../../components/ui/Toast'
import { db } from '../../db/database'
import { nowISO } from '../../utils/date'

/* ============================================================
   Settings — 数据管理与备份
   ============================================================ */

const tableMap: Record<string, string> = {
  daily: 'daily', insights: 'insights', weeklyKpis: 'weeklyKpis',
  monthlyKpis: 'monthlyKpis', quarterlyKpis: 'quarterlyKpis',
  projects: 'projects', growth: 'growth', body: 'body',
  finance: 'finance', decisions: 'decisions', achievements: 'achievements',
  secondBrain: 'secondBrain', aiLearning: 'aiLearning',
  habits: 'habits', habitLogs: 'habitLogs', countdowns: 'countdowns',
}

const tableLabels: Record<string, string> = {
  daily: 'Daily', insights: 'Insight', weeklyKpis: 'Weekly KPI',
  monthlyKpis: 'Monthly KPI', quarterlyKpis: 'Quarterly KPI',
  projects: 'Project', growth: 'Growth', body: 'Body',
  finance: 'Finance', decisions: 'Decision', achievements: 'Achievement',
  secondBrain: 'Second Brain', aiLearning: 'AI Learning',
  habits: '习惯', habitLogs: '习惯打卡', countdowns: '倒计时',
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function SettingsPage() {
  const confirm = useConfirm()
  const toast = useToast()
  const [stats, setStats] = useState<Record<string, number>>({})
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [importProgress, setImportProgress] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const t = localStorage.getItem('lifeos_last_backup')
      if (t) setLastBackup(t)
    } catch {}
  }, [])

  const loadStats = useCallback(async () => {
    const s: Record<string, number> = {}
    for (const key of Object.keys(tableMap)) {
      try { s[key] = await (db as any)[key].count() } catch { s[key] = 0 }
    }
    setStats(s)
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

  const totalRecords = Object.values(stats).reduce((a, b) => a + b, 0)

  // ============ 导出 ============
  const handleExport = async () => {
    setSaveStatus('saving')
    try {
      const data: Record<string, unknown[]> = {}
      const meta = { version: '2.0', exportedAt: nowISO(), tableCounts: {} as Record<string, number> }
      for (const key of Object.keys(tableMap)) {
        try {
          data[key] = await (db as any)[key].toArray()
          meta.tableCounts[key] = data[key].length
        } catch { data[key] = []; meta.tableCounts[key] = 0 }
      }
      const full = { meta, data }
      const json = JSON.stringify(full, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const dateStr = new Date().toISOString().split('T')[0]
      a.href = url
      a.download = `life-os-backup-${dateStr}.json`
      a.click()
      URL.revokeObjectURL(url)
      try { localStorage.setItem('lifeos_last_backup', nowISO()) } catch {}
      setLastBackup(nowISO())
      setSaveStatus('saved')
      toast(`已导出 ${totalRecords} 条记录`)
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
      toast('导出失败')
    }
  }

  // ============ 导入 ============
  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const doImport = async (file: File) => {
    setSaveStatus('saving')
    setImportProgress('读取中…')
    try {
      const text = await file.text()
      const raw = JSON.parse(text)
      const data = raw.data ?? raw
      const total = Object.keys(data).reduce((sum, k) => sum + (Array.isArray(data[k]) ? data[k].length : 0), 0)

      setImportProgress('导入中…')
      for (const [key, tableName] of Object.entries(tableMap)) {
        if (data[key] && Array.isArray(data[key]) && data[key].length > 0) {
          const table = (db as any)[tableName]
          if (table) {
            await table.clear()
            await table.bulkAdd(data[key])
          }
        }
      }
      setImportProgress('')
      setSaveStatus('saved')
      await loadStats()
      toast(`已导入 ${total} 条记录`)
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (e: any) {
      setImportProgress('')
      setSaveStatus('error')
      toast('导入失败：' + (e.message ?? '格式错误'))
    }
  }

  // ============ 清除 ============
  const handleClearAll = async () => {
    const ok = await confirm({
      title: '清除所有数据？',
      message: '此操作不可逆！请务必先导出备份。',
      danger: true,
      confirmText: '确认清除',
    })
    if (!ok) return
    await db.delete()
    window.location.reload()
  }

  // ============ 自动备份提醒 ============
  const needsBackup = lastBackup
    ? new Date().getTime() - new Date(lastBackup).getTime() > 7 * 24 * 3600 * 1000
    : totalRecords > 0

  return (
    <Page>
      <PageHeader title="Settings" subtitle="设置与数据管理" />

      <div className="px-4 space-y-3">
        {/* 保存状态 */}
        <div className="flex items-center justify-center gap-2 py-1">
          {saveStatus === 'saving' && <RefreshCw size={14} className="text-[var(--color-accent)] animate-spin" />}
          {saveStatus === 'saved' && <CheckCircle2 size={14} className="text-[var(--color-success)]" />}
          {saveStatus === 'error' && <AlertCircle size={14} className="text-[var(--color-danger)]" />}
          <span className="text-xs text-[var(--color-text-tertiary)]">
            {saveStatus === 'saving' ? '正在保存…' :
             saveStatus === 'saved' ? '已保存' :
             saveStatus === 'error' ? '保存失败' :
             importProgress ? importProgress : '就绪'}
          </span>
        </div>

        {/* 数据总览 */}
        <Card>
          <h3 className="text-[15px] font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <Database size={16} className="text-[var(--color-accent)]" />
            数据总览
          </h3>
          <div className="flex items-center gap-4 mb-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--color-accent)]">{totalRecords}</p>
              <p className="text-[11px] text-[var(--color-text-tertiary)]">总记录数</p>
            </div>
            <div className="flex-1 h-px bg-[var(--color-border-subtle)]" />
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--color-text)]">{Object.keys(tableMap).length}</p>
              <p className="text-[11px] text-[var(--color-text-tertiary)]">数据表</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 max-h-[180px] overflow-y-auto no-scrollbar">
            {Object.entries(stats).map(([key, count]) => (
              <div key={key} className="flex items-center justify-between py-1 px-2 rounded-lg bg-[var(--color-bg-elevated)]">
                <span className="text-xs text-[var(--color-text-secondary)]">{tableLabels[key] ?? key}</span>
                <span className="text-xs font-medium text-[var(--color-accent)]">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 备份 */}
        <Card>
          <h3 className="text-[15px] font-semibold text-[var(--color-text)] mb-1 flex items-center gap-2">
            <Shield size={16} className="text-[var(--color-accent)]" />
            数据备份
          </h3>
          <p className="text-xs text-[var(--color-text-tertiary)] mb-3 leading-relaxed">
            数据存储在浏览器本地。定期导出备份到文件，防止换设备或清缓存时丢失。
          </p>

          {needsBackup && totalRecords > 0 && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 flex items-center gap-2">
              <Clock size={14} className="text-[var(--color-warning)] shrink-0" />
              <span className="text-xs text-[var(--color-warning)]">
                {lastBackup ? '已超过 7 天未备份，建议立即备份' : '尚未备份过，建议立即备份'}
              </span>
            </div>
          )}

          {lastBackup && (
            <p className="text-[11px] text-[var(--color-text-tertiary)] mb-3">
              上次备份：{new Date(lastBackup).toLocaleString('zh-CN')}
            </p>
          )}

          <div className="space-y-2">
            <Button variant="secondary" block onClick={handleExport} disabled={saveStatus === 'saving'}>
              <Download size={18} />
              {saveStatus === 'saving' ? '导出中…' : '导出全量备份 (JSON)'}
            </Button>
            <Button variant="secondary" block onClick={handleImport}>
              <Upload size={18} /> 从备份文件恢复
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) doImport(file)
              e.target.value = ''
            }}
          />
        </Card>

        {/* 存储说明 */}
        <Card>
          <h3 className="text-[15px] font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <Cloud size={16} className="text-[var(--color-accent)]" />
            存储说明
          </h3>
          <div className="space-y-2 text-xs text-[var(--color-text-secondary)] leading-relaxed">
            <p>✅ 刷新页面 → 数据保留</p>
            <p>✅ 关闭浏览器 → 数据保留</p>
            <p>✅ 沙箱休眠恢复 → 数据保留</p>
            <p>⚠️ 换浏览器 / 换设备 → 需要先导出再导入</p>
            <p>⚠️ 浏览器清除缓存 → 数据会丢失（请定期备份）</p>
            <p>📦 存储方式：浏览器 IndexedDB（约 50MB+ 可用）</p>
          </div>
        </Card>

        {/* 危险操作 */}
        <Card>
          <h3 className="text-[15px] font-semibold text-[var(--color-text)] mb-3">危险操作</h3>
          <Button variant="danger" block onClick={handleClearAll}>
            <Trash2 size={18} /> 清除所有数据
          </Button>
        </Card>

        <p className="text-xs text-[var(--color-text-tertiary)] text-center pt-2 pb-8">
          Life OS v2.0 · 数据属于你 · 请定期备份
        </p>
      </div>
    </Page>
  )
}
