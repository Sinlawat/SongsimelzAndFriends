import { useRef, useEffect, useState, Fragment } from 'react'
import type { Knight, FinalStats, ItemStatBonus } from '../types/index'
import { useStatCalculator, getStatLabel } from '../hooks/useStatCalculator'

interface Props {
  character: Knight
  itemBonuses: ItemStatBonus[]
}

type StatKey = keyof Omit<FinalStats, 'bonuses'>

const STAT_ORDER: StatKey[] = ['hp', 'attack_physical', 'attack_magic', 'defense', 'speed', 'crit_rate', 'crit_damage']

// Three rows with a gold divider after row 1
const STAT_ROWS: StatKey[][] = [
  ['hp', 'attack_physical', 'attack_magic'],
  ['defense', 'speed', 'crit_rate', 'crit_damage'],
]

const STAT_META: Record<StatKey, { icon: string; color: string; accentBg: string; tooltip: string }> = {
  hp:              { icon: '❤️', color: '#ef4444', accentBg: '#ef444412', tooltip: 'Total Health Points' },
  attack_physical: { icon: '⚔️', color: '#f59e0b', accentBg: '#f59e0b12', tooltip: 'Physical Attack Power' },
  attack_magic:    { icon: '✨', color: '#a78bfa', accentBg: '#a78bfa12', tooltip: 'Magic Attack Power' },
  defense:         { icon: '🛡️', color: '#3b82f6', accentBg: '#3b82f612', tooltip: 'Defense Power' },
  speed:           { icon: '💨', color: '#22c55e', accentBg: '#22c55e12', tooltip: 'Speed (turn order)' },
  crit_rate:       { icon: '🎯', color: '#a855f7', accentBg: '#a855f712', tooltip: 'Probability of critical hit' },
  crit_damage:     { icon: '💥', color: '#fb923c', accentBg: '#fb923c12', tooltip: 'Damage multiplier on critical hit' },
}

const PCT_KEYS: Set<StatKey> = new Set(['crit_rate', 'crit_damage'])

function formatValue(key: StatKey, value: number): string {
  if (PCT_KEYS.has(key)) return `${value.toFixed(1)}%`
  return Math.round(value).toLocaleString()
}

function formatBonus(key: StatKey, value: number): string {
  if (value <= 0) return ''
  if (PCT_KEYS.has(key)) return `+${value.toFixed(1)}%`
  return `+${Math.round(value).toLocaleString()}`
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

interface TooltipProps {
  text: string
  children: React.ReactNode
}

function Tooltip({ text, children }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className="absolute bottom-full left-0 mb-2 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap z-50 pointer-events-none"
          style={{
            backgroundColor: '#0d1117',
            border: '1px solid #1e2d47',
            color: '#94a3b8',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}
        >
          {text}
          <div
            className="absolute top-full left-3"
            style={{
              width: 0, height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '4px solid #1e2d47',
            }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Animated value ───────────────────────────────────────────────────────────

interface AnimatedValueProps {
  value: string
  className?: string
  style?: React.CSSProperties
}

function AnimatedValue({ value, className = '', style }: AnimatedValueProps) {
  const spanRef = useRef<HTMLSpanElement>(null)
  const prevValue = useRef<string>(value)

  useEffect(() => {
    if (prevValue.current !== value && spanRef.current) {
      spanRef.current.classList.remove('stat-value-animate')
      void spanRef.current.offsetWidth
      spanRef.current.classList.add('stat-value-animate')
      prevValue.current = value
    }
  }, [value])

  return (
    <span ref={spanRef} className={className} style={style}>
      {value}
    </span>
  )
}

// ─── Gold Divider ─────────────────────────────────────────────────────────────

function GoldDivider() {
  return (
    <div className="col-span-full flex items-center gap-3 py-1">
      <div
        className="flex-1 h-px"
        style={{ background: 'linear-gradient(to right, transparent, #f59e0b55, transparent)' }}
      />
      <span style={{ color: '#f59e0b44', fontSize: '8px' }}>◆</span>
      <div
        className="flex-1 h-px"
        style={{ background: 'linear-gradient(to left, transparent, #f59e0b55, transparent)' }}
      />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StatDisplay({ character, itemBonuses }: Props) {
  const { finalStats } = useStatCalculator(character, itemBonuses)
  if (!finalStats) return null

  const s = character.knight_stats
  const baseStats: Record<StatKey, number> = {
    hp:              s?.base_hp              ?? 0,
    attack_physical: s?.base_attack_physical ?? 0,
    attack_magic:    s?.base_attack_magic    ?? 0,
    defense:         s?.base_defense         ?? 0,
    speed:           s?.base_speed           ?? 0,
    crit_rate:       s?.base_crit_rate       ?? 0,
    crit_damage:     s?.base_crit_damage     ?? 0,
  }

  let cardIndex = 0

  return (
    <div className="stats-section-enter">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, #f59e0b)' }} />
        <span className="text-xs text-yellow-600 tracking-widest uppercase font-bold">Final Stats</span>
        <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, #f59e0b)' }} />
      </div>

      {/* Character identity bar */}
      <div
        className="rounded-xl px-4 py-3 mb-4 flex items-center gap-3"
        style={{ backgroundColor: '#111827', border: '1px solid #1e2d47' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
          style={{ backgroundColor: '#f59e0b18', border: '1px solid #f59e0b40' }}
        >
          🧙
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm" style={{ color: '#f59e0b' }}>{character.name}</span>
          <span className="text-gray-600 text-xs">·</span>
          <span className="text-gray-400 text-xs">{character.class}</span>
          <span className="text-gray-600 text-xs">·</span>
          <span className="text-gray-500 text-xs">{character.element}</span>
        </div>
        <div className="ml-auto text-xs text-gray-600 flex-shrink-0">
          {new Set(itemBonuses.map(b => b.item_id)).size} / 4 items
        </div>
      </div>

      {/* Stats grid with gold divider between rows */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {STAT_ROWS.map((row, rowIdx) => (
          <Fragment key={rowIdx}>
            {row.map(key => {
              const total     = finalStats[key]
              const bonus     = finalStats.bonuses[key]
              const base      = baseStats[key]
              const bonusText = formatBonus(key, bonus)
              const hasBonus  = bonus > 0
              const meta      = STAT_META[key]
              const barPct    = hasBonus ? Math.min(100, (bonus / total) * 100 * 2.5) : 0
              const delay     = cardIndex++ * 60

              return (
                <div
                  key={key}
                  className="rounded-xl p-4 flex flex-col gap-2 stat-card-enter"
                  style={{
                    backgroundColor: '#111827',
                    border: `1px solid ${hasBonus ? meta.color + '40' : '#1e2d47'}`,
                    boxShadow: hasBonus ? `0 0 16px ${meta.color}12` : 'none',
                    animationDelay: `${delay}ms`,
                    animationFillMode: 'both',
                  }}
                >
                  {/* Label + tooltip + bonus */}
                  <div className="flex items-center justify-between">
                    <Tooltip text={meta.tooltip}>
                      <div className="flex items-center gap-1.5 cursor-default">
                        <span
                          className="w-6 h-6 rounded-md flex items-center justify-center text-xs flex-shrink-0"
                          style={{ backgroundColor: meta.accentBg }}
                        >
                          {meta.icon}
                        </span>
                        <span
                          className="text-xs font-black uppercase tracking-widest"
                          style={{ color: meta.color }}
                        >
                          {getStatLabel(key)}
                        </span>
                        <span className="text-gray-700 text-xs ml-0.5">?</span>
                      </div>
                    </Tooltip>
                    {hasBonus && (
                      <AnimatedValue
                        value={bonusText}
                        className="text-xs font-bold tabular-nums"
                        style={{ color: '#22c55e' }}
                      />
                    )}
                  </div>

                  {/* Main value */}
                  <AnimatedValue
                    value={formatValue(key, total)}
                    className="text-2xl font-black tabular-nums leading-none"
                    style={{ color: '#f1f5f9' }}
                  />

                  {/* Base (only shown when bonus exists) */}
                  {hasBonus && (
                    <p className="text-xs tabular-nums" style={{ color: '#4b5563' }}>
                      Base: {formatValue(key, base)}
                    </p>
                  )}

                  {/* Progress bar */}
                  <div
                    className="h-0.5 w-full rounded-full mt-auto overflow-hidden"
                    style={{ backgroundColor: '#1e2d47' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${hasBonus ? barPct : 25}%`,
                        background: hasBonus
                          ? `linear-gradient(90deg, ${meta.color}, ${meta.color}88)`
                          : '#1e2d47',
                        boxShadow: hasBonus ? `0 0 6px ${meta.color}60` : 'none',
                      }}
                    />
                  </div>
                </div>
              )
            })}

            {rowIdx === 0 && <GoldDivider />}
          </Fragment>
        ))}
      </div>

      {/* Active bonuses summary */}
      {STAT_ORDER.some(k => finalStats.bonuses[k] > 0) && (
        <div
          className="mt-4 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3"
          style={{ backgroundColor: '#22c55e0a', border: '1px solid #22c55e25' }}
        >
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm">✨</span>
            <span className="text-xs text-gray-400 font-semibold">Bonuses Active</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {STAT_ORDER.filter(k => finalStats.bonuses[k] > 0).map(k => (
              <span
                key={k}
                className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-full"
                style={{ color: '#22c55e', backgroundColor: '#22c55e15', border: '1px solid #22c55e30' }}
              >
                {getStatLabel(k)}: {formatBonus(k, finalStats.bonuses[k])}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
