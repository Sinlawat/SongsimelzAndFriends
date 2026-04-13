import type { Character } from '../types/index'
import { getStatLabel } from '../hooks/useStatCalculator'

interface Props {
  characters: Character[]
  selectedCharacter: Character | null
  onSelectCharacter: (c: Character | null) => void
}

const ELEMENT_COLORS: Record<string, string> = {
  Fire: '#ef4444',
  Water: '#3b82f6',
  Wind: '#22c55e',
  Light: '#fde68a',
  Dark: '#a855f7',
  Earth: '#a16207',
}

const BASE_STAT_KEYS: (keyof Omit<Character, 'id' | 'name' | 'class' | 'element' | 'image_url'>)[] = [
  'base_hp',
  'base_attack',
  'base_defense',
  'base_speed',
  'base_crit_rate',
  'base_crit_damage',
]

function statKeyToLabel(key: string): string {
  return getStatLabel(key.replace('base_', ''))
}

function formatBase(key: string, value: number): string {
  if (key === 'base_crit_rate' || key === 'base_crit_damage') return `${value}%`
  return value.toLocaleString()
}

export default function CharacterPanel({ characters, selectedCharacter, onSelectCharacter }: Props) {
  return (
    <div
      className="rounded-xl border p-5 flex flex-col gap-5"
      style={{ backgroundColor: '#111827', borderColor: '#1e293b' }}
    >
      {/* Panel title */}
      <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: '#1e293b' }}>
        <span className="text-lg">🧙</span>
        <h2 className="font-bold tracking-widest uppercase text-sm" style={{ color: '#f59e0b' }}>
          Character
        </h2>
      </div>

      {/* Dropdown */}
      <div>
        <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Select Character</label>
        <select
          className="w-full rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-1 appearance-none cursor-pointer"
          style={{
            backgroundColor: '#0d1117',
            border: '1px solid #1e293b',
            color: '#e2e8f0',
          }}
          value={selectedCharacter?.id ?? ''}
          onChange={e => {
            const found = characters.find(c => c.id === e.target.value) ?? null
            onSelectCharacter(found)
          }}
        >
          <option value="">— Choose a hero —</option>
          {characters.map(c => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.class} · {c.element}
            </option>
          ))}
        </select>
      </div>

      {/* Character card */}
      {selectedCharacter ? (
        <div>
          {/* Identity */}
          <div
            className="rounded-lg p-4 mb-4 border"
            style={{ backgroundColor: '#0d1117', borderColor: '#1e293b' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-lg" style={{ color: '#f59e0b' }}>
                  {selectedCharacter.name}
                </p>
                <p className="text-sm text-gray-400">{selectedCharacter.class}</p>
              </div>
              <span
                className="text-xs font-bold px-2 py-1 rounded-full border"
                style={{
                  color: ELEMENT_COLORS[selectedCharacter.element] ?? '#9ca3af',
                  borderColor: ELEMENT_COLORS[selectedCharacter.element] ?? '#9ca3af',
                  backgroundColor: `${ELEMENT_COLORS[selectedCharacter.element] ?? '#9ca3af'}18`,
                }}
              >
                {selectedCharacter.element}
              </span>
            </div>
          </div>

          {/* Base stats grid */}
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Base Stats</p>
          <div className="grid grid-cols-2 gap-2">
            {BASE_STAT_KEYS.map(key => (
              <div
                key={key}
                className="rounded-lg px-3 py-2 border"
                style={{ backgroundColor: '#0d1117', borderColor: '#1e293b' }}
              >
                <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: '#f59e0b' }}>
                  {statKeyToLabel(key)}
                </p>
                <p className="font-semibold text-sm text-white">
                  {formatBase(key, selectedCharacter[key] as number)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="rounded-lg border border-dashed p-8 text-center"
          style={{ borderColor: '#1e293b' }}
        >
          <p className="text-gray-600 text-sm">No character selected</p>
          <p className="text-gray-700 text-xs mt-1">Choose a hero above</p>
        </div>
      )}
    </div>
  )
}
