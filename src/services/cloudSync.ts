/**
 * Life OS — Supabase 云端同步服务
 *
 * 架构：
 *   IndexedDB（本地缓存 + 离线操作）
 *   ↕ 自动同步
 *   Supabase Postgres（云端主存储）
 *
 * 数据属于用户账号，换设备登录同一账号即可自动恢复。
 */

import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

// ============================================================
// 配置（部署时替换为实际 Supabase 项目信息）
// ============================================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

let supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase 未配置。请在 .env 中设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY')
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        storageKey: 'lifeos_auth',
      },
    })
  }
  return supabase
}

// ============================================================
// 账号
// ============================================================

export async function signUp(email: string, password: string) {
  const { data, error } = await getSupabase().auth.signUp({ email, password })
  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  await getSupabase().auth.signOut()
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await getSupabase().auth.getSession()
  return data.session?.user ?? null
}

async function getUserId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession()
  return data.session?.user?.id ?? null
}

export function onAuthChange(callback: (user: User | null) => void) {
  return getSupabase().auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null)
  })
}

export function isCloudAvailable(): boolean {
  return !!SUPABASE_URL && !!SUPABASE_ANON_KEY
}

// ============================================================
// 数据同步（通用）
// ============================================================

const TABLE_MAP: Record<string, string> = {
  daily: 'daily',
  insights: 'insights',
  weeklyKpis: 'weekly_kpis',
  monthlyKpis: 'monthly_kpis',
  quarterlyKpis: 'quarterly_kpis',
  projects: 'projects',
  growth: 'growth',
  body: 'body',
  finance: 'finance',
  decisions: 'decisions',
  achievements: 'achievements',
  secondBrain: 'second_brain',
  aiLearning: 'ai_learning',
  habits: 'habits',
  habitLogs: 'habit_logs',
  countdowns: 'countdowns',
  settings: 'settings',
}

/**
 * 将本地 IndexedDB 的全部数据推送到 Supabase。
 * 用于首次迁移或手动同步。
 */
export async function pushAllToCloud(
  localData: Record<string, unknown[]>,
  onProgress?: (table: string, done: number, total: number) => void,
) {
  const client = getSupabase()
  const userId = await getUserId()
  if (!userId) throw new Error('未登录')

  const tables = Object.entries(TABLE_MAP)
  let tableIdx = 0

  for (const [localKey, cloudTable] of tables) {
    const records = localData[localKey]
    if (!records || records.length === 0) {
      onProgress?.(localKey, 0, 0)
      tableIdx++
      continue
    }

    // 逐条 upsert（避免一次性大量数据的问题）
    for (let i = 0; i < records.length; i++) {
      const record = records[i] as Record<string, unknown>
      const { error } = await client
        .from(cloudTable)
        .upsert({
          ...record,
          user_id: userId,
          synced_at: new Date().toISOString(),
        }, { onConflict: 'id' })

      if (error) {
        console.error(`同步 ${cloudTable} 失败:`, error)
      }
      onProgress?.(localKey, i + 1, records.length)
    }
    tableIdx++
  }
}

/**
 * 从 Supabase 拉取用户全部数据。
 */
export async function pullAllFromCloud(): Promise<Record<string, unknown[]>> {
  const client = getSupabase()
  const userId = await getUserId()
  if (!userId) throw new Error('未登录')

  const result: Record<string, unknown[]> = {}

  for (const [localKey, cloudTable] of Object.entries(TABLE_MAP)) {
    const { data, error } = await client
      .from(cloudTable)
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error(`拉取 ${cloudTable} 失败:`, error)
      result[localKey] = []
      continue
    }

    // 去掉 Supabase 自动字段
    result[localKey] = (data ?? []).map((row: any) => {
      const { user_id, synced_at, ...rest } = row
      return rest
    })
  }

  return result
}

/**
 * 单条记录同步到云端。
 */
export async function syncRecord(
  cloudTable: string,
  record: Record<string, unknown>,
  operation: 'insert' | 'update' | 'delete',
) {
  const client = getSupabase()
  const userId = await getUserId()
  if (!userId) return

  const payload = { ...record, user_id: userId, synced_at: new Date().toISOString() }

  try {
    if (operation === 'delete') {
      await client.from(cloudTable).delete().eq('id', record.id as string)
    } else {
      await client.from(cloudTable).upsert(payload, { onConflict: 'id' })
    }
  } catch (e) {
    console.error(`云端同步失败 [${cloudTable}]:`, e)
  }
}

/**
 * 获取云端数据最后更新时间（用于增量同步判断）。
 */
export async function getLastSyncTime(): Promise<string | null> {
  const client = getSupabase()
  const userId = await getUserId()
  if (!userId) return null

  // 从 settings 表读取
  const { data } = await client
    .from('settings')
    .select('value')
    .eq('user_id', userId)
    .eq('key', 'last_sync')
    .single()

  return data?.value ?? null
}

export async function setLastSyncTime(time: string) {
  const client = getSupabase()
  const userId = await getUserId()
  if (!userId) return

  await client.from('settings').upsert({
    user_id: userId,
    key: 'last_sync',
    value: time,
    id: `${userId}_last_sync`,
    synced_at: new Date().toISOString(),
  })
}
