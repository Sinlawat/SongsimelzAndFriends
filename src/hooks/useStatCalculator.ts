import { useMemo } from 'react'
import type { Knight, FinalStats, ItemStatBonus } from '../types/index'
import { getKnightStats } from '../types/index'

type StatKey = keyof Omit<FinalStats, 'bonuses'>

const STAT_LABELS: Record<string, string> = {
  hp:              'HP',
  attack_physical: 'ATK (Phys)',
  attack_magic:    'ATK (Magic)',
  defense:         'DEF',
  speed:           'SPD',
  crit_rate:       'CRIT Rate',
  crit_damage:     'CRIT DMG',
}

export function getStatLabel(stat: string): string {
  return STAT_LABELS[stat] ?? stat
}

export function useStatCalculator(
  knight: Knight | null,
  itemBonuses: ItemStatBonus[]
): { finalStats: FinalStats | null; isEmpty: boolean } {
  const finalStats = useMemo(() => {
    if (!knight) return null

    const s = getKnightStats(knight) ?? {
      base_hp: 0, base_attack_physical: 0, base_attack_magic: 0,
      base_defense: 0, base_speed: 0, base_crit_rate: 0, base_crit_damage: 150,
      base_resistance: 0, base_effective_hit_rate: 0,
      base_block_rate: 0, base_weakness: 0, base_damage_taken_reduction: 0,
    }

    const baseStats: Record<StatKey, number> = {
      hp:              s.base_hp,
      attack_physical: s.base_attack_physical,
      attack_magic:    s.base_attack_magic,
      defense:         s.base_defense,
      speed:           s.base_speed,
      crit_rate:       s.base_crit_rate,
      crit_damage:     s.base_crit_damage,
    }

    const flatBonuses: Record<StatKey, number> = {
      hp: 0, attack_physical: 0, attack_magic: 0,
      defense: 0, speed: 0, crit_rate: 0, crit_damage: 0,
    }
    const percentBonuses: Record<StatKey, number> = {
      hp: 0, attack_physical: 0, attack_magic: 0,
      defense: 0, speed: 0, crit_rate: 0, crit_damage: 0,
    }

    for (const bonus of itemBonuses) {
      // Equipment 'attack' bonuses apply to physical attack
      const key: StatKey = bonus.stat_name === 'attack' ? 'attack_physical' : bonus.stat_name as StatKey
      if (!(key in baseStats)) continue
      if (bonus.bonus_type === 'flat') {
        flatBonuses[key] += bonus.value
      } else {
        percentBonuses[key] += bonus.value
      }
    }

    // total = base + flat + (base * percent / 100)
    const bonusBreakdown = {} as FinalStats['bonuses']
    const totals = {} as Omit<FinalStats, 'bonuses'>

    for (const key of Object.keys(baseStats) as StatKey[]) {
      const base = baseStats[key]
      const flat = flatBonuses[key]
      const pct  = percentBonuses[key]
      const percentValue = base * pct / 100
      bonusBreakdown[key] = flat + percentValue
      totals[key] = base + flat + percentValue
    }

    return { ...totals, bonuses: bonusBreakdown } satisfies FinalStats
  }, [knight, itemBonuses])

  return {
    finalStats,
    isEmpty: knight === null,
  }
}
