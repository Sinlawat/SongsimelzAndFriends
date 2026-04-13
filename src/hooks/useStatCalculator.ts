import { useMemo } from 'react'
import type { Character, EquippedItems, FinalStats, ItemStatBonus } from '../types/index'

type StatKey = keyof Omit<FinalStats, 'bonuses'>

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'ATK',
  defense: 'DEF',
  speed: 'SPD',
  crit_rate: 'CRIT Rate',
  crit_damage: 'CRIT DMG',
}

export function getStatLabel(stat: string): string {
  return STAT_LABELS[stat] ?? stat
}

export function useStatCalculator(
  character: Character | null,
  equippedItems: EquippedItems
): { finalStats: FinalStats | null; isEmpty: boolean } {
  const finalStats = useMemo(() => {
    if (!character) return null

    // Collect all bonuses from non-null slots
    const allBonuses: ItemStatBonus[] = Object.values(equippedItems)
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .flatMap(item => item.item_stat_bonuses)

    const baseStats: Record<StatKey, number> = {
      hp: character.base_hp,
      attack: character.base_attack,
      defense: character.base_defense,
      speed: character.base_speed,
      crit_rate: character.base_crit_rate,
      crit_damage: character.base_crit_damage,
    }

    const flatBonuses: Record<StatKey, number> = {
      hp: 0, attack: 0, defense: 0, speed: 0, crit_rate: 0, crit_damage: 0,
    }
    const percentBonuses: Record<StatKey, number> = {
      hp: 0, attack: 0, defense: 0, speed: 0, crit_rate: 0, crit_damage: 0,
    }

    for (const bonus of allBonuses) {
      const key = bonus.stat_name as StatKey
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
      const pct = percentBonuses[key]
      const percentValue = base * pct / 100
      bonusBreakdown[key] = flat + percentValue
      totals[key] = base + flat + percentValue
    }

    return { ...totals, bonuses: bonusBreakdown } satisfies FinalStats
  }, [character, equippedItems])

  return {
    finalStats,
    isEmpty: character === null,
  }
}
