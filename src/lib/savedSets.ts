import { supabase } from './supabaseClient'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SavedSetItem {
  run_no: number
  slot_type: string
  name: string
  set_name: string | null
  main_stat_display: string
}

export interface SavedSet {
  id: string
  knight_name: string
  set_name: string
  source_file: string | null
  equipment_items: SavedSetItem[]
}

// Row shape as stored in Supabase (actual column names)
interface DbRow {
  id: string
  user_id: string
  knight_name: string
  set_name: string | null
  source_file: string | null
  equipment: SavedSetItem[]
  created_at: string
}

function rowToSet(row: DbRow): SavedSet {
  return {
    id:              row.id,
    knight_name:     row.knight_name,
    set_name:        row.set_name ?? '',
    source_file:     row.source_file ?? null,
    equipment_items: row.equipment ?? [],
  }
}

// ─── API ──────────────────────────────────────────────────────────────────────

export async function getSavedSets(): Promise<SavedSet[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('saved_sets')
    .select('id, user_id, knight_name, set_name, source_file, equipment, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) { console.error('getSavedSets:', error); return [] }
  return (data as DbRow[]).map(rowToSet)
}

export async function saveSet(set: Omit<SavedSet, 'id'>): Promise<SavedSet | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('saved_sets')
    .insert({
      user_id:     user.id,
      knight_name: set.knight_name,
      set_name:    set.set_name,
      source_file: set.source_file,
      equipment:   set.equipment_items,
    })
    .select()
    .single()

  if (error) { console.error('saveSet:', error); return null }
  return rowToSet(data as DbRow)
}

export async function deleteSavedSet(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from('saved_sets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)   // RLS double-check

  if (error) console.error('deleteSavedSet:', error)
}
