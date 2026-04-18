import type {
  ParsedEquipmentItem, KnightStats, StatTarget,
  OptimizationResult, EquipmentSlotType,
} from '../types/index'

// ─── Item-level pre-score ─────────────────────────────────────────────────────
// Weights constrained stats (range/exactly/at_least/at_most) more heavily
// so they dominate pre-filtering over pure maximize stats.

function scoreItem(
  item: ParsedEquipmentItem,
  targets: StatTarget[],
  baseStats: KnightStats,
): number {
  const allStats = [...item.main_stats, ...item.sub_stats]
  let score = 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allStats.forEach((stat: any) => {
    const target = targets.find(t => {
      if (t.stat_key === 'base_attack_physical' || t.stat_key === 'base_attack_magic') {
        return stat.stat_name === t.stat_key || stat.stat_name === 'all_attack'
      }
      return stat.stat_name === t.stat_key
    })
    if (!target) return

    const contribution =
      stat.is_percent      ? ((baseStats as unknown as Record<string, number>)[target.stat_key] ?? 0) * stat.value / 100 :
      stat.is_flat_percent ? stat.value :
      stat.value

    // Constrained stats are more urgent than pure maximize
    const urgencyMultiplier =
      target.constraint === 'range'    ? 3.0 :
      target.constraint === 'exactly'  ? 2.5 :
      target.constraint === 'at_least' ? 2.0 :
      target.constraint === 'at_most'  ? 2.0 :
      1.0  // maximize / minimize

    score += contribution * target.weight * urgencyMultiplier
  })

  return score
}

// ─── Per-combination stat calculation ────────────────────────────────────────

function calcCombination(
  slots: Record<EquipmentSlotType, ParsedEquipmentItem | null>,
  baseStats: KnightStats,
): Record<string, number> {
  const stats: Record<string, number> = {
    base_hp:                  baseStats.base_hp                  ?? 0,
    base_attack_physical:     baseStats.base_attack_physical     ?? 0,
    base_attack_magic:        baseStats.base_attack_magic        ?? 0,
    base_defense:             baseStats.base_defense             ?? 0,
    base_speed:               baseStats.base_speed               ?? 0,
    base_crit_rate:           baseStats.base_crit_rate           ?? 0,
    base_crit_damage:         baseStats.base_crit_damage         ?? 0,
    base_weakness:            baseStats.base_weakness            ?? 0,
    base_resistance:          baseStats.base_resistance          ?? 0,
    base_effective_hit_rate:  baseStats.base_effective_hit_rate  ?? 0,
  }

  const physBase = baseStats.base_attack_physical ?? 0
  const magBase  = baseStats.base_attack_magic    ?? 0

  Object.values(slots).forEach(item => {
    if (!item) return
    const allStats = [...item.main_stats, ...item.sub_stats]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allStats.forEach((s: any) => {
      const key = s.stat_name

      if (key === 'all_attack') {
        if (s.is_percent) {
          stats['base_attack_physical'] += physBase * s.value / 100
          stats['base_attack_magic']    += magBase  * s.value / 100
        } else {
          stats['base_attack_physical'] += s.value
          stats['base_attack_magic']    += s.value
        }
        return
      }

      if (!(key in stats)) return

      if (s.is_percent) {
        // Multiply base: e.g. HP(%) 28% → base_hp × 0.28
        stats[key] += (baseStats as unknown as Record<string, number>)[key] * s.value / 100
      } else if (s.is_flat_percent) {
        // Flat addition: e.g. Crit Rate 24% → just add 24
        stats[key] += s.value
      } else {
        // Flat number: e.g. Speed 12 → add 12
        stats[key] += s.value
      }
    })
  })

  return stats
}

// ─── Per-combination scoring ──────────────────────────────────────────────────

const REFERENCE_MAX: Record<string, number> = {
  base_attack_physical: 50000,
  base_attack_magic:    50000,
  base_hp:              200000,
  base_defense:         30000,
  base_crit_damage:     500,
  base_speed:           500,
}

function scoreCombination(
  finalStats: Record<string, number>,
  targets: StatTarget[],
): { score: number; meets_all: boolean; violations: string[] } {
  let totalScore  = 0
  let totalWeight = 0
  const violations: string[] = []

  targets.forEach(target => {
    const actual = finalStats[target.stat_key] ?? 0
    totalWeight += target.weight
    let statScore = 0

    switch (target.constraint) {
      case 'maximize': {
        const refMax = REFERENCE_MAX[target.stat_key] ?? 10000
        statScore = target.weight * Math.min(actual / refMax, 1)
        break
      }

      case 'minimize':
        statScore = Math.max(0, 1 - actual / 1000) * target.weight
        break

      case 'exactly': {
        const target_val = target.target_value ?? 0
        const diff = Math.abs(actual - target_val)
        if (diff === 0) {
          statScore = target.weight
        } else if (diff <= 2) {
          statScore = target.weight * 0.8
        } else if (diff <= 5) {
          statScore = target.weight * 0.4
        } else {
          const divisor = target_val === 0 ? 1 : target_val
          statScore = -target.weight * (diff / divisor)
          violations.push(
            `${target.label}: ${actual.toFixed(1)} (ต้องการ ${target_val})`
          )
        }
        break
      }

      case 'range': {
        const min  = target.min_value  ?? 0
        const max  = target.max_value  ?? 999
        const pref = target.preferred_value ?? min

        if (actual < min) {
          const deficit = min - actual
          const divisor = min === 0 ? 1 : min
          statScore = -target.weight * 2 * (deficit / divisor)
          violations.push(
            `${target.label}: ${actual.toFixed(1)} (ต้องการอย่างน้อย ${min})`
          )
        } else if (actual > max) {
          const excess  = actual - max
          const divisor = max === 0 ? 1 : max
          statScore = -target.weight * 2 * (excess / divisor)
          violations.push(
            `${target.label}: ${actual.toFixed(1)} (เกิน ${max})`
          )
        } else {
          const dist      = Math.abs(actual - pref)
          const range     = Math.max(max - min, 1)
          const closeness = 1 - (dist / range)
          statScore = target.weight * (0.8 + closeness * 0.2)
        }
        break
      }

      case 'at_least':
        if (actual >= (target.target_value ?? 0)) {
          statScore = target.weight
        } else {
          violations.push(
            `${target.label}: ${actual.toFixed(1)} (น้อยกว่า ${target.target_value})`
          )
        }
        break

      case 'at_most':
        if (actual <= (target.target_value ?? 0)) {
          statScore = target.weight
        } else {
          violations.push(
            `${target.label}: ${actual.toFixed(1)} (เกิน ${target.target_value})`
          )
        }
        break
    }

    totalScore += statScore
  })

  return {
    score:     totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0,
    meets_all: violations.length === 0,
    violations,
  }
}

// ─── Main optimizer ───────────────────────────────────────────────────────────

const BEAM = 5  // top results to return

export function optimizeGear(
  importedItems: ParsedEquipmentItem[],
  baseStats: KnightStats,
  targets: StatTarget[],
  selectedSets: string[],
  weaponType: 'physical' | 'magic' = 'physical',
): OptimizationResult[] {
  // ── Debug ────────────────────────────────────────────────────────────────────
  console.log('=== OPTIMIZER DEBUG ===')
  console.log('Total items:', importedItems.length)

  const sampleItem = importedItems.find(i => i.name.toLowerCase().includes('slayer'))
  if (sampleItem) {
    console.log('Sample slayer main_stats:', sampleItem.main_stats)
    console.log('Sample slayer sub_stats:', sampleItem.sub_stats)
  }

  const critRateItems = importedItems.filter(i =>
    [...i.main_stats, ...i.sub_stats].some(s => s.stat_name === 'base_crit_rate')
  )
  console.log('Items with crit_rate:', critRateItems.length)

  const allCritRateValues = importedItems
    .flatMap(i => [...i.main_stats, ...i.sub_stats])
    .filter(s => s.stat_name === 'base_crit_rate')
    .map(s => s.value)

  console.log('All crit rate values found:', allCritRateValues)
  console.log(
    'Top 4 highest crit rate values:',
    [...allCritRateValues].sort((a, b) => b - a).slice(0, 4)
  )
  console.log(
    'Max possible crit from best 4 items combined:',
    [...allCritRateValues]
      .sort((a, b) => b - a)
      .slice(0, 4)
      .reduce((sum, val) => sum + val, 0)
  )
  console.log(
    'Max possible crit including base stat (5):',
    5 + [...allCritRateValues]
      .sort((a, b) => b - a)
      .slice(0, 4)
      .reduce((sum, val) => sum + val, 0)
  )
  // ─────────────────────────────────────────────────────────────────────────────

  // 1. Filter by selected sets (if any)
  const filtered = selectedSets.length > 0
    ? importedItems.filter(i => selectedSets.includes(i.set_name ?? ''))
    : importedItems

  // 2. Separate by slot type, filtering weapons by type if specified
  const allWeapons = filtered.filter(i => i.slot_type === 'weapon')
  const weapons = allWeapons.filter(item => {
    if (weaponType === 'physical') {
      return item.main_stats.some(s => s.stat_name === 'base_attack_physical') ||
        (item.type ?? '').toLowerCase().includes('physical')
    }
    // magic
    return item.main_stats.some(s => s.stat_name === 'base_attack_magic') ||
      (item.type ?? '').toLowerCase().includes('magic')
  })
  const armors  = filtered.filter(i => i.slot_type === 'armor')
  const rings   = filtered.filter(i => i.slot_type === 'ring')

  // 3. Build candidate pool per slot — top N by score PLUS top 20 per hard constraint
  const TOP_N = 50
  const HARD_TOP = 20

  const hardConstraints = targets.filter(t =>
    ['range', 'exactly', 'at_least', 'at_most'].includes(t.constraint)
  )

  function getTopCandidates(items: ParsedEquipmentItem[]): ParsedEquipmentItem[] {
    const mustInclude = new Set<number>()

    // For each hard-constrained stat, force-include the items that contribute most to it
    hardConstraints.forEach(constraint => {
      items
        .map((item, idx) => {
          const allStats = [...item.main_stats, ...item.sub_stats]
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const contribution = allStats
            .filter((s: any) => {
              if (
                constraint.stat_key === 'base_attack_physical' ||
                constraint.stat_key === 'base_attack_magic'
              ) {
                return s.stat_name === constraint.stat_key || s.stat_name === 'all_attack'
              }
              return s.stat_name === constraint.stat_key
            })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .reduce((sum: number, s: any) => {
              const val = s.is_percent
                ? ((baseStats as unknown as Record<string, number>)[constraint.stat_key] ?? 0) * s.value / 100
                : s.value
              return sum + val
            }, 0)
          return { idx, contribution }
        })
        .filter(x => x.contribution > 0)
        .sort((a, b) => b.contribution - a.contribution)
        .slice(0, HARD_TOP)
        .forEach(x => mustInclude.add(x.idx))
    })

    // Also include top N by overall pre-score
    ;[...items]
      .sort((a, b) => scoreItem(b, targets, baseStats) - scoreItem(a, targets, baseStats))
      .slice(0, TOP_N)
      .forEach(item => mustInclude.add(items.indexOf(item)))

    return [...mustInclude].map(idx => items[idx])
  }

  // 4. Build per-slot candidate lists
  const topWeapons = getTopCandidates(weapons)
  const topArmors  = getTopCandidates(armors)
  const topRings   = getTopCandidates(rings)

  console.log('Weapon candidates:', topWeapons.length)
  console.log('Armor candidates:', topArmors.length)
  console.log('Ring candidates:', topRings.length)

  const weaponOptions: (ParsedEquipmentItem | null)[] = [null, ...topWeapons]
  const armorOptions:  (ParsedEquipmentItem | null)[] = [null, ...topArmors]
  const ringOptions:   (ParsedEquipmentItem | null)[] = [null, ...topRings]

  // 5. Enumerate combinations (w1 × w2 × a1 × a2 × ring), keep top BEAM
  const results: OptimizationResult[] = []

  for (const w1 of weaponOptions) {
    for (const w2 of weaponOptions) {
      if (w1 && w2 && w1.run_no === w2.run_no) continue
      for (const a1 of armorOptions) {
        for (const a2 of armorOptions) {
          if (a1 && a2 && a1.run_no === a2.run_no) continue
          for (const r of ringOptions) {
            const slots: Record<EquipmentSlotType, ParsedEquipmentItem | null> = {
              weapon1: w1, weapon2: w2, armor1: a1, armor2: a2, ring: r,
            }
            const finalStats = calcCombination(slots, baseStats)
            const { score, meets_all, violations } = scoreCombination(finalStats, targets)

            results.push({
              slots,
              final_stats: finalStats,
              score,
              meets_all_constraints: meets_all,
              violations,
            })

            // Keep beam: hard constraints first, then fewest violations, then score
            results.sort((a, b) => {
              if (a.meets_all_constraints !== b.meets_all_constraints) {
                return a.meets_all_constraints ? -1 : 1
              }
              if (a.violations.length !== b.violations.length) {
                return a.violations.length - b.violations.length
              }
              return b.score - a.score
            })
            if (results.length > BEAM) results.pop()
          }
        }
      }
    }
  }

  console.log('Best result final stats:', results[0]?.final_stats)
  console.log('Best crit_rate:', results[0]?.final_stats?.base_crit_rate)
  console.log('Violations:', results[0]?.violations)

  return results
}
