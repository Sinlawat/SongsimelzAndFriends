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

// ─── Equipment (GVG) Types ────────────────────────────────────────────────────

export type EquipmentSlotType = 'weapon1' | 'weapon2' | 'armor1' | 'armor2' | 'ring'

export interface Equipment {
  id: string
  name: string
  slot_type: 'weapon' | 'armor' | 'ring'
  set_name?: string
  image_url?: string
  description?: string
}

export interface CounterKnightItem {
  id?: string
  counter_id?: string
  knight_id: string
  slot_type: EquipmentSlotType
  equipment_id: string | null
  equipment?: Equipment | null
}

export const EQUIPMENT_SLOTS: {
  type: EquipmentSlotType
  label: string
  equipType: 'weapon' | 'armor' | 'ring'
  position: 'top-left' | 'bottom-left' | 'top-right' | 'bottom-right' | 'center-right'
}[] = [
  { type: 'weapon1', label: 'อาวุธ 1', equipType: 'weapon', position: 'top-left'     },
  { type: 'weapon2', label: 'อาวุธ 2', equipType: 'weapon', position: 'bottom-left'  },
  { type: 'armor1',  label: 'เกราะ 1', equipType: 'armor',  position: 'top-right'    },
  { type: 'armor2',  label: 'เกราะ 2', equipType: 'armor',  position: 'bottom-right' },
  { type: 'ring',    label: 'แหวน',    equipType: 'ring',   position: 'center-right' },
]

// ─── GVG Types ────────────────────────────────────────────────────────────────

export type KnightElement = 'magic' | 'physical' | 'tank' | 'support' | 'balance'

export interface KnightStats {
  id: string
  knight_id: string
  base_hp: number
  base_attack_physical: number
  base_attack_magic: number
  base_defense: number
  base_speed: number
  base_crit_rate: number
  base_crit_damage: number
  base_resistance: number
  base_effective_hit_rate: number
  base_block_rate: number
  base_weakness: number
  base_damage_taken_reduction: number
}

export interface Knight {
  id: string
  name: string
  element: string
  class: string
  grade?: string
  image_url?: string
  img_skill_1?: string
  img_skill_2?: string
  knight_stats?: KnightStats | KnightStats[] | null
}

export function getKnightStats(knight: Knight): KnightStats | null {
  if (!knight.knight_stats) return null
  if (Array.isArray(knight.knight_stats)) {
    return knight.knight_stats[0] ?? null
  }
  return knight.knight_stats
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

export interface Pet {
  id: string
  name: string
  image_url?: string
  description?: string
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
  recommended_stats?: Record<string, Record<string, number>> | null
  pet_ids?: (string | null)[]
  pets?: (Pet | null)[]
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

export const ELEMENT_ICONS: Record<string, string> = {
  magic:    'https://qaqmzgrggdmxqcqudiko.supabase.co/storage/v1/object/public/element-icons/magic_icon.webp',
  physical: 'https://qaqmzgrggdmxqcqudiko.supabase.co/storage/v1/object/public/element-icons/physical_icon.webp',
  tank:     'https://qaqmzgrggdmxqcqudiko.supabase.co/storage/v1/object/public/element-icons/tank_icon2.webp',
  support:  'https://qaqmzgrggdmxqcqudiko.supabase.co/storage/v1/object/public/element-icons/support_icon.webp',
  balance:  'https://qaqmzgrggdmxqcqudiko.supabase.co/storage/v1/object/public/element-icons/balance_icon2.webp',
}

// ─── Transcend Types ─────────────────────────────────────────────────────────

export interface TranscendBonus {
  id: string
  knight_id?: string
  transcend_level: number
  stat_name: string
  value: number
  is_percent: boolean
}

export const TRANSCEND_STAT_MAP: Record<string, string[]> = {
  all_attack:             ['base_attack_physical', 'base_attack_magic'],
  physical_attack:        ['base_attack_physical'],
  magic_attack:           ['base_attack_magic'],
  defense:                ['base_defense'],
  hp:                     ['base_hp'],
  crit_rate:              ['base_crit_rate'],
  crit_damage:            ['base_crit_damage'],
  resistance:             ['base_resistance'],
  effective_hit_rate:     ['base_effective_hit_rate'],
  block_rate:             ['base_block_rate'],
  weakness:               ['base_weakness'],
  damage_taken_reduction: ['base_damage_taken_reduction'],
  speed:                  ['base_speed'],
}

// ─── Stat Calculator Types ────────────────────────────────────────────────────

export interface FinalStats {
  hp: number
  attack_physical: number
  attack_magic: number
  defense: number
  speed: number
  crit_rate: number
  crit_damage: number
  bonuses: {
    hp: number
    attack_physical: number
    attack_magic: number
    defense: number
    speed: number
    crit_rate: number
    crit_damage: number
  }
}
