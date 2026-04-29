import type {
  ParsedEquipmentItem, KnightStats, StatTarget, OptimizationResult, Knight,
} from '../types/index'
import { optimizeGear } from './gearOptimizer'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KnightOptConfig {
  knight: Knight
  baseStats: KnightStats   // transcend-boosted stats (same as stat calculator display)
  targets: StatTarget[]
  weaponType: 'physical' | 'magic'
}

export interface MultiKnightResult {
  priority: number          // 1-indexed
  config: KnightOptConfig
  result: OptimizationResult | null   // null = pool exhausted before this knight
}

// ─── Algorithm ────────────────────────────────────────────────────────────────
//
// Greedy by priority:
//   1. Run single-knight optimizer on the remaining item pool
//   2. Pick the top result, mark its run_nos as used
//   3. Remove those items from the pool for the next knight
//
// Critically, this calls the existing `optimizeGear` unchanged — we only
// control which items are passed in on each iteration.

export function multiKnightOptimize(
  knights: KnightOptConfig[],
  itemPool: ParsedEquipmentItem[],
): MultiKnightResult[] {
  const usedRunNos = new Set<number>()
  const output: MultiKnightResult[] = []

  for (let i = 0; i < knights.length; i++) {
    const config = knights[i]

    // Filter pool: remove any item already claimed by a higher-priority knight
    const available = itemPool.filter(item => !usedRunNos.has(item.run_no))

    let result: OptimizationResult | null = null
    if (available.length > 0) {
      const results = optimizeGear(
        available,
        config.baseStats,
        config.targets,
        [],             // no set filter — use entire remaining pool
        config.weaponType,
      )
      result = results[0] ?? null
    }

    // Claim items used by this knight's best result
    if (result) {
      Object.values(result.slots).forEach(item => {
        if (item) usedRunNos.add(item.run_no)
      })
    }

    output.push({ priority: i + 1, config, result })
  }

  return output
}
