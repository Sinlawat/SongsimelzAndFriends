export interface Character {
  id: string
  name: string
  class: string
  element: string
  image_url: string | null
  base_hp: number
  base_attack: number
  base_defense: number
  base_speed: number
  base_crit_rate: number
  base_crit_damage: number
  created_at: string
}

export interface Item {
  id: string
  name: string
  slot_type: 'weapon' | 'armor' | 'accessory' | 'gem'
  grade: 'normal' | 'rare' | 'epic' | 'legendary'
  image_url: string | null
  description: string | null
  created_at: string
}

export interface ItemStatBonus {
  id: string
  item_id: string
  stat_name: 'hp' | 'attack' | 'defense' | 'speed' | 'crit_rate' | 'crit_damage'
  bonus_type: 'flat' | 'percent'
  value: number
}

export interface Build {
  id: string
  build_name: string
  character_id: string | null
  weapon_id: string | null
  armor_id: string | null
  accessory_id: string | null
  gem_id: string | null
  created_at: string
}

export interface ItemWithBonuses extends Item {
  bonuses: ItemStatBonus[]
}

export interface CharacterStats {
  hp: number
  attack: number
  defense: number
  speed: number
  crit_rate: number
  crit_damage: number
}

// Supabase typed DB helper (expand as needed)
export type Database = {
  public: {
    Tables: {
      characters: { Row: Character; Insert: Omit<Character, 'id' | 'created_at'>; Update: Partial<Character> }
      items: { Row: Item; Insert: Omit<Item, 'id' | 'created_at'>; Update: Partial<Item> }
      item_stat_bonuses: { Row: ItemStatBonus; Insert: Omit<ItemStatBonus, 'id'>; Update: Partial<ItemStatBonus> }
      builds: { Row: Build; Insert: Omit<Build, 'id' | 'created_at'>; Update: Partial<Build> }
    }
  }
}
