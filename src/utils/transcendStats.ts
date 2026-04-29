import type { KnightStats, TranscendBonus } from '../types/index'
import { TRANSCEND_STAT_MAP } from '../types/index'

const FLAT_ADD_TRANSCEND_STATS = new Set([
  'base_crit_rate',
  'base_crit_damage',
  'base_weakness',
  'base_resistance',
  'base_effective_hit_rate',
  'base_block_rate',
  'base_damage_taken_reduction',
])

export function calculateTranscendStats(
  base: KnightStats,
  transcendLevel: number,
  knightTranscends: TranscendBonus[],
  globalTranscends: TranscendBonus[],
): KnightStats {
  if (transcendLevel === 0) return base

  const activeLevels = Array.from({ length: transcendLevel }, (_, i) => i + 1)
  const allBonuses = [
    ...knightTranscends.filter(t => activeLevels.includes(t.transcend_level)),
    ...globalTranscends.filter(t => activeLevels.includes(t.transcend_level)),
  ]

  const result = { ...base }

  allBonuses.forEach(bonus => {
    const fields = TRANSCEND_STAT_MAP[bonus.stat_name] ?? []
    fields.forEach(field => {
      const key     = field as keyof KnightStats
      const baseVal = Number(base[key] ?? 0)
      const cur     = Number((result as Record<string, unknown>)[key] ?? 0)
      if (bonus.is_percent) {
        ;(result as Record<string, unknown>)[key] = FLAT_ADD_TRANSCEND_STATS.has(field)
          ? cur + bonus.value
          : cur + baseVal * bonus.value / 100
      } else {
        ;(result as Record<string, unknown>)[key] = cur + bonus.value
      }
    })
  })

  return result
}
