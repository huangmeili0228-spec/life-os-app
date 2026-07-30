import { useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Table, UpdateSpec } from 'dexie'
import { db, type BaseRecord } from '../db/database'
import { uid, nowISO } from '../utils/date'

/**
 * 通用 CRUD hook。
 * 给任意 Dexie table 提供增删改查 + 实时订阅的能力。
 * 所有写操作自动注入 id / createdAt / updatedAt。
 */
export function useCrud<T extends BaseRecord>(
  tableName: keyof typeof db,
) {
  const table = db[tableName] as unknown as Table<T, string>

  const all = useLiveQuery(() => table.toArray(), [], [] as T[])

  const getById = useCallback(
    (id: string) => table.get(id),
    [table],
  )

  const add = useCallback(
    async (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = nowISO()
      const record = {
        ...(data as object),
        id: uid(),
        createdAt: now,
        updatedAt: now,
      } as T
      await table.add(record)
      return record
    },
    [table],
  )

  const update = useCallback(
    async (id: string, patch: Partial<T>) => {
      await table.update(id, { ...patch, updatedAt: nowISO() } as UpdateSpec<T>)
    },
    [table],
  )

  const remove = useCallback(
    (id: string) => table.delete(id),
    [table],
  )

  const bulkRemove = useCallback(
    (ids: string[]) => table.bulkDelete(ids),
    [table],
  )

  return {
    items: all ?? [],
    getById,
    add,
    update,
    remove,
    bulkRemove,
    table,
  }
}
