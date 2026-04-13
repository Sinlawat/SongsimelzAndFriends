export interface Character {
  id: string
  name: string
  class: string
  element: string
  image_url?: string
  base_hp: number
  base_attack: number
  base_defense: number
  base_speed: number
  base_crit_rate: number
  base_crit_damage: number
}

export interface ItemStatBonus {
  id: string
  item_id: string
  stat_name: 'hp'|'attack'|'defense'|'speed'|'crit_rate'|'crit_damage'
  bonus_type: 'flat'|'percent'
  value: number
}

export interface Item {
  id: string
  name: string
  slot_type: 'weapon'|'armor'|'accessory'|'gem'
  grade: 'normal'|'rare'|'epic'|'legendary'
  image_url?: string
  description?: string
  item_stat_bonuses: ItemStatBonus[]
}

export type SlotType = 'weapon'|'armor'|'accessory'|'gem'

export interface EquippedItems {
  weapon: Item|null
  armor: Item|null
  accessory: Item|null
  gem: Item|null
}

// ─── GVG Types ────────────────────────────────────────────────────────────────

export type KnightElement = 'magic' | 'physical' | 'tank' | 'support' | 'balance'

export interface Knight {
  id: string
  name: string
  element: KnightElement
  class: string
  stars: number
  image_url?: string
  img_skill_1?: string
  img_skill_2?: string
}

export interface GVGDefense {
  id: string
  leader_id: string
  knight2_id: string
  knight3_id?: string
  leader_skill?: string
  leader: Knight
  knight2: Knight
  knight3?: Knight
}

export interface GVGCounter {
  id: string
  defense_id: string
  leader_id: string
  knight2_id: string
  knight3_id?: string
  strategy?: string
  rating: number
  rating_count: number
  submitted_by: string
  created_at: string
  formation_id: number
  slot_positions?: Record<string, string>
  skill_queues?: Record<string, SkillReservationData[]>
  like_count: number
  dislike_count: number
  userVote?: 'like' | 'dislike' | null
  comments?: CounterComment[]
  leader: Knight
  knight2: Knight
  knight3?: Knight
}

export interface CounterVote {
  id: string
  counter_id: string
  user_id: string
  vote_type: 'like' | 'dislike'
  created_at: string
}

export interface CounterComment {
  id: string
  counter_id: string
  user_id: string
  username: string
  content: string
  created_at: string
}

// ─── Formation Types ──────────────────────────────────────────────────────────

export interface Formation {
  id: 1 | 2 | 3 | 4
  name: string
  description: string
  frontCount: number
  backCount: number
  frontSlots: number[]
  backSlots: number[]
}

export const FORMATIONS: Formation[] = [
  {
    id: 1,
    name: 'Basic Formation',
    description: 'หน้า 2 | หลัง 3',
    frontCount: 2,
    backCount: 3,
    frontSlots: [1, 2],
    backSlots: [3, 4, 5],
  },
  {
    id: 2,
    name: 'Balanced Formation',
    description: 'หน้า 3 | หลัง 2',
    frontCount: 3,
    backCount: 2,
    frontSlots: [1, 2, 3],
    backSlots: [4, 5],
  },
  {
    id: 3,
    name: 'Attack Formation',
    description: 'หน้า 1 | หลัง 4',
    frontCount: 1,
    backCount: 4,
    frontSlots: [1],
    backSlots: [2, 3, 4, 5],
  },
  {
    id: 4,
    name: 'Protective Formation',
    description: 'หน้า 4 | หลัง 1',
    frontCount: 4,
    backCount: 1,
    frontSlots: [1, 2, 3, 4],
    backSlots: [5],
  },
]

export interface SkillReservationData {
  skillType: string
  globalOrder: number
}

export interface SlotAssignment {
  slotNumber: number
  row: 'front' | 'back'
  knight: Knight | null
  skillQueue: SkillReservationData[]
}

export const SKILL_OPTIONS = [
  { id: 'skill1',   label: 'Skill 1',   icon: '⚡' },
  { id: 'skill2',   label: 'Skill 2',   icon: '🔥' },
  { id: 'skill3',   label: 'Skill 3',   icon: '💧' },
  { id: 'ultimate', label: 'Ultimate',  icon: '✨' },
  { id: 'passive',  label: 'Passive',   icon: '🛡️' },
]

export const ELEMENT_COLORS: Record<string, string> = {
  magic:    '#466cd6',
  physical: '#ef4444',
  tank:     '#3e2723',
  support:  '#FFD700',
  balance:  '#6c0f71',
}

export const ELEMENT_EMOJI: Record<string, string> = {
  magic:    '✨',
  physical: '⚔️',
  tank:     '🛡️',
  support:  '💚',
  balance:  '⚖️',
}

// ─── Stat Calculator Types ────────────────────────────────────────────────────

export interface FinalStats {
  hp: number
  attack: number
  defense: number
  speed: number
  crit_rate: number
  crit_damage: number
  bonuses: {
    hp: number
    attack: number
    defense: number
    speed: number
    crit_rate: number
    crit_damage: number
  }
}
