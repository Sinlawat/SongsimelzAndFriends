import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import type { Knight, GVGDefense, GVGCounter, SlotAssignment, Equipment, EquipmentSlotType, CounterKnightItem, Pet } from '../types/index'
import { ELEMENT_COLORS, ELEMENT_ICONS, FORMATIONS } from '../types/index'
import KnightSelectModal from '../components/gvg/KnightSelectModal'
import KnightAvatar from '../components/gvg/KnightAvatar'
import FormationBoard from '../components/gvg/FormationBoard'
import KnightEquipmentSlots from '../components/gvg/KnightEquipmentSlots'
import ContributeModal from '../components/gvg/ContributeModal'
import { useAuth } from '../contexts/AuthContext'
import { useAdmin } from '../hooks/useAdmin'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalSlot = 'leader' | 'knight2' | 'knight3'
type Knight3State = Knight | 'ANY' | null

interface SearchResult {
  defense: GVGDefense
  counters: GVGCounter[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}


// ─── Knight Selector Button ───────────────────────────────────────────────────

interface SelectorButtonProps {
  label: string
  knight: Knight | 'ANY' | null
  onClick: () => void
  isAnyDefault?: boolean
}

function KnightSelectorButton({ label, knight, onClick, isAnyDefault }: SelectorButtonProps) {
  const isAny     = knight === 'ANY' || (knight === null && isAnyDefault)
  const isKnight  = knight !== null && knight !== 'ANY'
  const color     = isKnight ? ELEMENT_COLORS[(knight as Knight).element] : null

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#f59e0b' }}>
        {label}
      </span>
      <button
        onClick={onClick}
        className="flex items-center gap-3 w-full rounded-lg transition-all duration-150"
        style={{
          backgroundColor: '#1f2937',
          border: `1px solid ${isKnight ? (color + '70') : '#374151'}`,
          height: '52px',
          padding: '0.5rem 1rem',
          boxShadow: isKnight ? `0 0 10px ${color}18` : 'none',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = isKnight ? (color! + 'aa') : '#f59e0b55' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = isKnight ? (color! + '70') : '#374151' }}
      >
        {/* Left avatar or placeholder */}
        {isKnight ? (
          <KnightAvatar knight={knight as Knight} size={36} />
        ) : (
          <div
            className="rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ width: 36, height: 36, backgroundColor: '#374151', border: '1px solid #4b5563' }}
          >
            <span style={{ color: '#6b7280', fontSize: '16px' }}>👤</span>
          </div>
        )}

        {/* Middle text */}
        <div className="flex-1 text-left min-w-0">
          {isKnight ? (
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm truncate" style={{ color: '#e2e8f0' }}>
                {(knight as Knight).name}
              </span>
              <img
                src={ELEMENT_ICONS[(knight as Knight).element]}
                alt={(knight as Knight).element}
                style={{ width: '16px', height: '16px', objectFit: 'contain', verticalAlign: 'middle', flexShrink: 0 }}
              />
            </div>
          ) : isAny ? (
            <span className="italic text-sm" style={{ color: '#6b7280' }}>* ANY knight *</span>
          ) : (
            <span className="italic text-sm" style={{ color: '#6b7280' }}>* Select a knight *</span>
          )}
        </div>

        {/* Right arrow */}
        <span style={{ color: '#6b7280', fontSize: '12px', flexShrink: 0 }}>▼</span>
      </button>
    </div>
  )
}

// ─── Counter Card ─────────────────────────────────────────────────────────────

function CounterCard({ counter, isNewest, onOpenLogin, isAdmin, onDeleteCounter }: {
  counter: GVGCounter
  isNewest?: boolean
  onOpenLogin?: () => void
  isAdmin?: boolean
  onDeleteCounter?: (id: string, defenseId: string) => void
}) {
  const { user } = useAuth()
  const [isExpanded,      setIsExpanded]      = useState(false)
  const [userVote,        setUserVote]        = useState<'like' | 'dislike' | null>(null)
  const [likeCount,       setLikeCount]       = useState(counter.like_count ?? 0)
  const [dislikeCount,    setDislikeCount]    = useState(counter.dislike_count ?? 0)
  const [voteLoading,     setVoteLoading]     = useState(false)
  const [showComments,    setShowComments]    = useState(false)
  const [comments,        setComments]        = useState<import('../types/index').CounterComment[]>([])
  const [commentText,     setCommentText]     = useState('')
  const [commentsLoaded,  setCommentsLoaded]  = useState(false)
  const [commentLoading,  setCommentLoading]  = useState(false)
  const [knightItems,     setKnightItems]     = useState<CounterKnightItem[]>([])
  const [itemsLoaded,     setItemsLoaded]     = useState(false)
  const [counterPets,     setCounterPets]     = useState<(Pet | null)[]>([])

  useEffect(() => {
    const fetchFreshData = async () => {
      // Step 1: Get latest like/dislike counts
      const { data: freshCounter } = await supabase
        .from('gvg_counters')
        .select('like_count, dislike_count')
        .eq('id', counter.id)
        .single()

      if (freshCounter) {
        setLikeCount(freshCounter.like_count ?? 0)
        setDislikeCount(freshCounter.dislike_count ?? 0)
      }

      // Step 2: Get user's existing vote (if logged in)
      if (user) {
        const { data: voteData } = await supabase
          .from('counter_votes')
          .select('vote_type')
          .eq('counter_id', counter.id)
          .eq('user_id', user.id)
          .maybeSingle()

        setUserVote(voteData?.vote_type as 'like' | 'dislike' | null ?? null)
      } else {
        setUserVote(null)
      }
    }

    fetchFreshData()
  }, [counter.id, user])

  useEffect(() => {
    if (!isExpanded || itemsLoaded) return
    supabase
      .from('counter_knight_items')
      .select('*, equipment:equipment_id(*)')
      .eq('counter_id', counter.id)
      .then(({ data }) => {
        setKnightItems((data ?? []) as CounterKnightItem[])
        setItemsLoaded(true)
      })
  }, [isExpanded, counter.id, itemsLoaded])

  useEffect(() => {
    if (!counter.pet_ids?.[0]) return
    supabase
      .from('pets')
      .select('*')
      .eq('id', counter.pet_ids[0])
      .single()
      .then(({ data }) => setCounterPets(data ? [data] : []))
  }, [counter.id])

  async function loadComments() {
    if (commentsLoaded) return
    const { data } = await supabase
      .from('counter_comments')
      .select('*')
      .eq('counter_id', counter.id)
      .order('created_at', { ascending: true })
    setComments(data ?? [])
    setCommentsLoaded(true)
  }

  function toggleComments() {
    setShowComments(p => !p)
    if (!commentsLoaded) loadComments()
  }

  async function handleComment() {
    if (!user) { onOpenLogin?.(); return }
    if (!commentText.trim()) return
    setCommentLoading(true)
    const { data, error } = await supabase
      .from('counter_comments')
      .insert({
        counter_id: counter.id,
        user_id:    user.id,
        username:   user.email ?? 'Anonymous',
        content:    commentText.trim(),
      })
      .select()
      .single()
    if (!error && data) {
      setComments(prev => [...prev, data])
      setCommentText('')
    }
    setCommentLoading(false)
  }

  async function handleVote(type: 'like' | 'dislike') {
    if (!user) { onOpenLogin?.(); return }
    if (voteLoading) return
    setVoteLoading(true)

    try {
      // Step 1: Get FRESH counts from DB (not local state)
      const { data: fresh } = await supabase
        .from('gvg_counters')
        .select('like_count, dislike_count')
        .eq('id', counter.id)
        .single()

      let newLike    = fresh?.like_count    ?? 0
      let newDislike = fresh?.dislike_count ?? 0

      if (userVote === type) {
        // Cancel vote
        await supabase
          .from('counter_votes')
          .delete()
          .eq('counter_id', counter.id)
          .eq('user_id', user.id)

        if (type === 'like')    newLike    = Math.max(0, newLike - 1)
        if (type === 'dislike') newDislike = Math.max(0, newDislike - 1)

        setUserVote(null)

      } else {
        // Upsert vote
        await supabase
          .from('counter_votes')
          .upsert(
            { counter_id: counter.id, user_id: user.id, vote_type: type },
            { onConflict: 'counter_id,user_id' }
          )

        // If switching vote, remove old count
        if (userVote === 'like')    newLike    = Math.max(0, newLike - 1)
        if (userVote === 'dislike') newDislike = Math.max(0, newDislike - 1)

        // Add new vote count
        if (type === 'like')    newLike    = newLike + 1
        if (type === 'dislike') newDislike = newDislike + 1

        setUserVote(type)
      }

      // Step 2: Write fresh calculated counts back to DB
      await supabase
        .from('gvg_counters')
        .update({ like_count: newLike, dislike_count: newDislike })
        .eq('id', counter.id)

      // Step 3: Update local state with real values
      setLikeCount(newLike)
      setDislikeCount(newDislike)

    } catch (err) {
      console.error('Vote error:', err)
    } finally {
      setVoteLoading(false)
    }
  }

  function computedRating(): number {
    const total = likeCount + dislikeCount
    if (total === 0) return 0
    return Math.round((likeCount / total) * 5)
  }

  const formation = FORMATIONS.find(f => f.id === counter.formation_id) ?? FORMATIONS[0]

  const slots: SlotAssignment[] = [
    ...formation.frontSlots.map(n => {
      const knightId = counter.slot_positions?.[String(n)]
      const knight = [counter.leader, counter.knight2, counter.knight3]
        .find(k => k?.id === knightId) ?? null
      return {
        slotNumber: n,
        row: 'front' as const,
        knight,
        skillQueue: knight ? (counter.skill_queues?.[knight.id] ?? []) : [],
      }
    }),
    ...formation.backSlots.map(n => {
      const knightId = counter.slot_positions?.[String(n)]
      const knight = [counter.leader, counter.knight2, counter.knight3]
        .find(k => k?.id === knightId) ?? null
      return {
        slotNumber: n,
        row: 'back' as const,
        knight,
        skillQueue: knight ? (counter.skill_queues?.[knight.id] ?? []) : [],
      }
    }),
  ]

  const knightsInOrder = [counter.leader, counter.knight2, counter.knight3].filter(Boolean) as Knight[]

  return (
    <div
      style={{
        backgroundColor: '#111827',
        ...(isNewest ? {
          border: '2px solid #22c55e',
          animation: 'newCard 0.4s ease',
        } : {
          borderBottomWidth: '1px',
          borderBottomStyle: 'solid',
          borderBottomColor: '#1e2d47',
        }),
      }}
    >
      {/* ── Collapsed row (always visible) ───────────────────────────────────── */}
      <div
        onClick={() => setIsExpanded(prev => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          cursor: 'pointer',
          background: isExpanded ? '#131d2e' : '#0f172a',
          borderRadius: isExpanded ? '0' : '0',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = '#111827' }}
        onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = '#0f172a' }}
      >
        {/* Left: formation badge + knight avatars */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {knightsInOrder.map((knight, i) => (
              <KnightAvatar key={i} knight={knight} size={40} showName={false} />
            ))}

            {/* Pet image — show if counter has pet */}
            {counterPets[0] && (
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#2d1b69',
                border: '1.5px solid #a855f7',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '4px',
              }}>
                {counterPets[0].image_url ? (
                  <img
                    src={counterPets[0].image_url}
                    alt={counterPets[0].name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '20px' }}>🐾</span>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Right: username + computed rating + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#6b7280', whiteSpace: 'nowrap' }}>
              {counter.submitted_by}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px', justifyContent: 'flex-end' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <span key={star} style={{ fontSize: '13px', color: star <= computedRating() ? '#f59e0b' : '#374151', transition: 'color 0.2s' }}>★</span>
              ))}
              <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '2px' }}>
                ({likeCount + dislikeCount})
              </span>
            </div>
          </div>

          {/* Expand/collapse chevron */}
          <div style={{
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: '#4b5563',
            fontSize: '12px',
            transition: 'transform 0.2s',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>
            ▼
          </div>
        </div>
      </div>

      {/* ── Expanded detail ───────────────────────────────────────────────────── */}
      {isExpanded && (
        <div style={{ padding: '16px 24px 20px', borderTop: '1px solid #1e2d47' }}>
          {/* Formation board — readonly */}
          <FormationBoard
            formation={formation}
            slots={slots}
            selectedKnightCount={slots.filter(s => s.knight !== null).length}
            readonly
            showSkills
          />

          {/* Pet row */}
          {counterPets[0] && (
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1e2d47' }}>
              <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a855f7', margin: '0 0 10px' }}>
                🐾 สัตว์เลี้ยง
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#0f172a', border: '1px solid #2d1b69', borderRadius: '8px', padding: '6px 10px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, background: '#2d1b69', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {counterPets[0].image_url ? (
                    <img src={counterPets[0].image_url} alt={counterPets[0].name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                  ) : (
                    <span style={{ fontSize: '24px' }}>🐾</span>
                  )}
                </div>
                <span style={{ fontSize: '13px', color: '#c084fc', fontWeight: 'bold' }}>{counterPets[0].name}</span>
              </div>
            </div>
          )}

          {/* Equipment section */}
          {itemsLoaded && knightItems.length > 0 && (
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1e2d47' }}>
              <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b', margin: '0 0 12px' }}>
                🗡️ อุปกรณ์
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {[counter.leader, counter.knight2, counter.knight3]
                  .filter(Boolean)
                  .map(knight => {
                    const items: Record<EquipmentSlotType, Equipment | null> = {
                      weapon1: null, weapon2: null,
                      armor1:  null, armor2:  null, ring: null,
                    }

                    knightItems
                      .filter(ki => ki.knight_id === knight!.id)
                      .forEach(ki => {
                        items[ki.slot_type as EquipmentSlotType] = (ki.equipment as Equipment) ?? null
                      })

                    const hasAnyItem = Object.values(items).some(v => v !== null)
                    if (!hasAnyItem) return null

                    return (
                      <div key={knight!.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#9ca3af' }}>
                          {knight!.name}
                        </span>
                        <KnightEquipmentSlots
                          knight={knight!}
                          items={items}
                          onSlotClick={() => {}}
                          readonly={true}
                        />
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Recommended Stats section */}
          {counter.recommended_stats && (
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1e2d47' }}>
              <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#f59e0b', margin: '0 0 10px' }}>
                🎯 Recommended Stats
              </p>

              {[counter.leader, counter.knight2, counter.knight3]
                .filter(Boolean)
                .map(knight => {
                  const rec = counter.recommended_stats?.[knight!.id]
                  if (!rec || Object.keys(rec).length === 0) return null

                  const LABELS: Record<string, string> = {
                    base_hp:                     'HP',
                    base_attack_physical:        'ATK (Phy)',
                    base_attack_magic:           'ATK (Mag)',
                    base_defense:                'DEF',
                    base_speed:                  'SPD',
                    base_crit_rate:              'CRIT Rate',
                    base_crit_damage:            'CRIT DMG',
                    base_resistance:             'Resistance',
                    base_effective_hit_rate:     'Eff. Hit Rate',
                    base_block_rate:             'Block Rate',
                    base_weakness:               'Weakness',
                    base_damage_taken_reduction: 'DMG Reduction',
                  }
                  const PERCENT_FIELDS = [
                    'base_crit_rate', 'base_crit_damage',
                    'base_resistance', 'base_effective_hit_rate',
                  ]

                  return (
                    <div key={knight!.id} style={{
                      background: '#0f172a', border: '1px solid #1e293b',
                      borderRadius: '8px', padding: '10px 12px', marginBottom: '8px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <KnightAvatar knight={knight!} size={24} showName={false} />
                        <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 'bold' }}>
                          {knight!.name}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {Object.entries(rec).map(([key, val]) => (
                          <div key={key} style={{
                            background: '#111827', border: '1px solid #1e3a5f',
                            borderRadius: '6px', padding: '4px 10px',
                            display: 'flex', gap: '6px', alignItems: 'center',
                          }}>
                            <span style={{ fontSize: '10px', color: '#6b7280' }}>
                              {LABELS[key] ?? key}
                            </span>
                            <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 'bold' }}>
                              {val}{PERCENT_FIELDS.includes(key) ? '%' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}

          {/* Strategy section */}
          {counter.strategy && (
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1e2d47' }}>
              <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b', marginRight: '8px' }}>
                Strategy:
              </span>
              <span style={{ fontSize: '13px', color: '#d1d5db' }}>{counter.strategy}</span>
            </div>
          )}

          {/* Meta + vote row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: '#4b5563' }}>
              By: <span style={{ color: '#6b7280' }}>{counter.submitted_by}</span>
              {' · '}{formatDate(counter.created_at)}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => handleVote('like')}
                disabled={voteLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '6px 14px', borderRadius: '8px',
                  border: userVote === 'like' ? '2px solid #22c55e' : '1px solid #374151',
                  background: userVote === 'like' ? '#14532d' : '#1f2937',
                  color: userVote === 'like' ? '#86efac' : '#9ca3af',
                  cursor: voteLoading ? 'not-allowed' : 'pointer',
                  fontSize: '13px', fontWeight: 'bold',
                  transition: 'all 0.15s',
                }}
              >
                👍 {likeCount}
              </button>
              <button
                onClick={() => handleVote('dislike')}
                disabled={voteLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '6px 14px', borderRadius: '8px',
                  border: userVote === 'dislike' ? '2px solid #ef4444' : '1px solid #374151',
                  background: userVote === 'dislike' ? '#7f1d1d' : '#1f2937',
                  color: userVote === 'dislike' ? '#fca5a5' : '#9ca3af',
                  cursor: voteLoading ? 'not-allowed' : 'pointer',
                  fontSize: '13px', fontWeight: 'bold',
                  transition: 'all 0.15s',
                }}
              >
                👎 {dislikeCount}
              </button>

              {isAdmin && (
                <button
                  onClick={() => onDeleteCounter?.(counter.id, counter.defense_id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid #ef444444',
                    color: '#ef4444',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#7f1d1d'
                    e.currentTarget.style.borderColor = '#ef4444'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderColor = '#ef444444'
                  }}
                >
                  🗑️ ลบ Counter
                </button>
              )}
            </div>
          </div>

          {/* ── Comment toggle button ─────────────────────────────────────── */}
          <div style={{ marginTop: '10px' }}>
            <button
              onClick={toggleComments}
              style={{
                fontSize: '12px', fontWeight: 'bold',
                color: showComments ? '#f59e0b' : '#6b7280',
                background: 'transparent', border: 'none',
                cursor: 'pointer', padding: '4px 0',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f59e0b' }}
              onMouseLeave={e => { e.currentTarget.style.color = showComments ? '#f59e0b' : '#6b7280' }}
            >
              💬 Comment{comments.length > 0 ? ` (${comments.length})` : ''}
            </button>
          </div>

          {/* ── Comment panel ─────────────────────────────────────────────── */}
          {showComments && (
            <div style={{
              marginTop: '8px',
              background: '#0f172a',
              borderRadius: '10px',
              border: '1px solid #1e2d47',
              overflow: 'hidden',
            }}>
              {/* Comment list */}
              <div style={{ maxHeight: '260px', overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {comments.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#4b5563', textAlign: 'center', margin: 0 }}>
                    ยังไม่มี comment — เป็นคนแรกที่แสดงความคิดเห็น!
                  </p>
                ) : (
                  comments.map(c => (
                    <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#e2e8f0' }}>
                          {c.username}
                        </span>
                        <span style={{ fontSize: '10px', color: '#374151' }}>
                          {new Date(c.created_at).toLocaleDateString('th-TH')}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0, lineHeight: 1.5 }}>
                        {c.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Input row */}
              <div style={{ borderTop: '1px solid #1e2d47', padding: '10px 16px' }}>
                {user ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleComment() }}
                      placeholder="เขียน comment..."
                      style={{
                        flex: 1,
                        background: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: 'white',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#f59e0b' }}
                      onBlur={e =>  { e.currentTarget.style.borderColor = '#374151' }}
                    />
                    <button
                      onClick={handleComment}
                      disabled={commentLoading || !commentText.trim()}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        background: commentLoading || !commentText.trim() ? '#1f2937' : 'linear-gradient(135deg,#d97706,#f59e0b)',
                        color: commentLoading || !commentText.trim() ? '#4b5563' : '#000',
                        border: 'none',
                        cursor: commentLoading || !commentText.trim() ? 'not-allowed' : 'pointer',
                        flexShrink: 0,
                        transition: 'all 0.15s',
                      }}
                    >
                      {commentLoading ? '...' : 'ส่ง'}
                    </button>
                  </div>
                ) : (
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, textAlign: 'center' }}>
                    <button
                      onClick={() => onOpenLogin?.()}
                      style={{ color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', padding: 0 }}
                    >
                      เข้าสู่ระบบ
                    </button>
                    {' '}เพื่อแสดงความคิดเห็น
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Defense Group ────────────────────────────────────────────────────────────

interface DefenseGroupProps {
  result: SearchResult
  onContribute: (defenseId: string) => void
  newestCounterId: string | null
  onOpenLogin: () => void
  isAdmin: boolean
  onDeleteDefense: (id: string) => void
  onDeleteCounter: (id: string, defenseId: string) => void
}

function DefenseGroup({ result, onContribute, newestCounterId, onOpenLogin, isAdmin, onDeleteDefense, onDeleteCounter }: DefenseGroupProps) {
  const { defense, counters } = result

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid #1e2d47' }}
    >
      {/* Defense header */}
      <div style={{ backgroundColor: '#1a1a2e', borderBottom: '1px solid #f59e0b40' }}>
        <div
          className="px-6 py-3 border-b"
          style={{ borderColor: '#f59e0b30', backgroundColor: '#0d0d1a' }}
        >
          <span className="text-lg font-black tracking-widest" style={{ color: '#e2e8f0' }}>
            DEFENSE
          </span>
        </div>

        <div className="px-6 py-4 flex items-start justify-between gap-4 flex-wrap">
          {/* Defense knights */}
          <div className="flex items-end flex-wrap gap-3">
            <KnightAvatar knight={defense.leader}  size={48} showName />
            <KnightAvatar knight={defense.knight2} size={48} showName />
            {defense.knight3 && <KnightAvatar knight={defense.knight3} size={48} showName />}
          </div>

          {/* Defense metadata + admin delete */}
          <div className="flex flex-col gap-1 text-sm min-w-0">
            {defense.leader_skill && (
              <div>
                <span className="font-bold" style={{ color: '#f59e0b' }}>Leader Skill: </span>
                <span className="italic" style={{ color: '#9ca3af' }}>{defense.leader_skill}</span>
              </div>
            )}
            {isAdmin && (
              <button
                onClick={() => onDeleteDefense(defense.id)}
                style={{
                  marginTop: '4px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: 'transparent',
                  border: '1px solid #ef444444',
                  color: '#ef4444',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#7f1d1d'
                  e.currentTarget.style.borderColor = '#ef4444'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = '#ef444444'
                }}
              >
                🗑️ ลบทีม Defense
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Counters count bar */}
      <div
        className="flex items-center justify-between px-6 py-3"
        style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #1e2d47' }}
      >
        <span className="text-base font-black tracking-wider" style={{ color: '#e2e8f0' }}>
          {counters.length} COUNTER{counters.length !== 1 ? 'S' : ''}
        </span>
        <button
          onClick={() => onContribute(defense.id)}
          className="px-4 py-1.5 rounded-lg text-sm font-bold transition-all"
          style={{ backgroundColor: '#1e3a5f', color: '#3b82f6', border: '1px solid #3b82f640' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#2563eb'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#1e3a5f'; e.currentTarget.style.color = '#3b82f6' }}
        >
          + Contribute
        </button>
      </div>

      {/* Counter cards */}
      {counters.length === 0 ? (
        <div className="px-6 py-8 text-center" style={{ backgroundColor: '#111827' }}>
          <p className="text-sm" style={{ color: '#4b5563' }}>No counters submitted for this defense yet.</p>
        </div>
      ) : (
        counters.map(counter => (
          <CounterCard
            key={counter.id}
            counter={counter}
            isNewest={counter.id === newestCounterId}
            onOpenLogin={onOpenLogin}
            isAdmin={isAdmin}
            onDeleteCounter={onDeleteCounter}
          />
        ))
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface GVGPageProps {
  onOpenLogin: () => void
}

export default function GVGPage({ onOpenLogin }: GVGPageProps) {
  const { user } = useAuth()
  const { isAdmin } = useAdmin()
  const [searchParams] = useSearchParams()

  const [selectedLeader,  setSelectedLeader]  = useState<Knight | null>(null)
  const [selectedKnight2, setSelectedKnight2] = useState<Knight | null>(null)
  const [selectedKnight3, setSelectedKnight3] = useState<Knight3State>(null)
  const [openModalSlot,   setOpenModalSlot]   = useState<ModalSlot | null>(null)
  const [searchResults,   setSearchResults]   = useState<SearchResult[]>([])
  const [isSearching,     setIsSearching]     = useState(false)
  const [hasSearched,     setHasSearched]     = useState(false)
  const [showLoginWarning,   setShowLoginWarning]   = useState(false)
  const [showContributeModal, setShowContributeModal] = useState(false)
  const [contributeDefenseId, setContributeDefenseId] = useState<string | null>(null)
  const [newestCounterId,    setNewestCounterId]    = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'defense' | 'counter'
    id: string
    defenseId?: string
  } | null>(null)

  // ── Auto-load from URL ?defense_id= ────────────────────────────────────────
  useEffect(() => {
    const defenseId = searchParams.get('defense_id')
    if (!defenseId) return

    const autoLoad = async () => {
      setIsSearching(true)

      // Fetch the specific defense with knight data
      const { data: defense } = await supabase
        .from('gvg_defenses')
        .select('*')
        .eq('id', defenseId)
        .single()

      if (!defense) { setIsSearching(false); return }

      // Collect knight IDs
      const knightIds = [defense.leader_id, defense.knight2_id, defense.knight3_id].filter(Boolean)
      const { data: knightRows } = await supabase
        .from('knights')
        .select('*, img_skill_1, img_skill_2')
        .in('id', knightIds)

      const km: Record<string, Knight> = {}
      knightRows?.forEach((k: Knight) => { km[k.id] = k })

      const leader  = km[defense.leader_id]
      const knight2 = km[defense.knight2_id]
      const knight3 = defense.knight3_id ? km[defense.knight3_id] : null

      if (!leader || !knight2) { setIsSearching(false); return }

      // Set knight selectors
      setSelectedLeader(leader)
      setSelectedKnight2(knight2)
      setSelectedKnight3(knight3)

      // Fetch counters for this defense
      const { data: counters } = await supabase
        .from('gvg_counters')
        .select('*')
        .eq('defense_id', defenseId)
        .order('rating', { ascending: false })

      // Collect all counter knight IDs for batch fetch
      const allKnightIds = new Set(knightIds.map(String))
      ;(counters ?? []).forEach((c: GVGCounter) => {
        allKnightIds.add(c.leader_id)
        allKnightIds.add(c.knight2_id)
        if (c.knight3_id) allKnightIds.add(c.knight3_id)
      })

      const { data: allKnightRows } = await supabase
        .from('knights')
        .select('*, img_skill_1, img_skill_2')
        .in('id', Array.from(allKnightIds))

      allKnightRows?.forEach((k: Knight) => { km[k.id] = k })

      setSearchResults([{
        defense: {
          ...defense,
          leader,
          knight2,
          knight3: knight3 ?? undefined,
        } as GVGDefense,
        counters: (counters ?? []).map((c: GVGCounter) => ({
          ...c,
          leader:  km[c.leader_id],
          knight2: km[c.knight2_id],
          knight3: c.knight3_id ? km[c.knight3_id] : undefined,
        })),
      }])

      setHasSearched(true)
      setIsSearching(false)
    }

    autoLoad()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-hide login warning after 3 seconds
  useEffect(() => {
    if (!showLoginWarning) return
    const timer = setTimeout(() => setShowLoginWarning(false), 3000)
    return () => clearTimeout(timer)
  }, [showLoginWarning])

  function handleContributeClick(defenseId: string) {
    if (user) {
      setContributeDefenseId(defenseId)
      setShowContributeModal(true)
    } else {
      setShowLoginWarning(true)
    }
  }

  function handleContributeSuccess(newCounter: GVGCounter) {
    setSearchResults(prev =>
      prev.map(group =>
        group.defense.id === contributeDefenseId
          ? { ...group, counters: [newCounter, ...group.counters] }
          : group
      )
    )
    setNewestCounterId(newCounter.id)
    setTimeout(() => setNewestCounterId(null), 3000)
  }

  async function handleContributeForNewDefense() {
    if (!selectedLeader || !selectedKnight2) return

    const { data, error } = await supabase
      .from('gvg_defenses')
      .insert({
        leader_id:  selectedLeader.id,
        knight2_id: selectedKnight2.id,
        knight3_id: selectedKnight3 && selectedKnight3 !== 'ANY'
          ? (selectedKnight3 as Knight).id
          : null,
        leader_skill: null,
        submitted_by: null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating defense:', error)
      return
    }

    setSearchResults([{
      defense: {
        ...data,
        leader:  selectedLeader,
        knight2: selectedKnight2,
        knight3: selectedKnight3 !== 'ANY' ? (selectedKnight3 as Knight | null) ?? undefined : undefined,
      },
      counters: [],
    }])

    setContributeDefenseId(data.id)
    setShowContributeModal(true)
  }

  const canSearch = selectedLeader !== null && selectedKnight2 !== null

  // ── Knight selection handler ────────────────────────────────────────────────
  function handleKnightSelect(knight: Knight) {
    if (openModalSlot === 'leader') {
      setSelectedLeader(knight.id === 'any' ? null : knight)
    } else if (openModalSlot === 'knight2') {
      setSelectedKnight2(knight.id === 'any' ? null : knight)
    } else if (openModalSlot === 'knight3') {
      setSelectedKnight3(knight.id === 'any' ? 'ANY' : knight)
    }
    setOpenModalSlot(null)
  }

  // ── Search ──────────────────────────────────────────────────────────────────
  async function searchCounters() {
    if (!selectedLeader || !selectedKnight2) return
    setIsSearching(true)
    setHasSearched(false)

    // 1. Query matching defenses
    let defQuery = supabase
      .from('gvg_defenses')
      .select('*')
      .eq('leader_id', selectedLeader.id)
      .eq('knight2_id', selectedKnight2.id)

    if (selectedKnight3 !== null && selectedKnight3 !== 'ANY') {
      defQuery = defQuery.eq('knight3_id', selectedKnight3.id)
    }

    const { data: rawDefenses, error: defError } = await defQuery

    if (defError || !rawDefenses || rawDefenses.length === 0) {
      setSearchResults([])
      setHasSearched(true)
      setIsSearching(false)
      return
    }

    // 2. Fetch counters for each defense in parallel
    const defenseWithCounters = await Promise.all(
      rawDefenses.map(async defense => {
        const { data: counters } = await supabase
          .from('gvg_counters')
          .select('*')
          .eq('defense_id', defense.id)
          .order('rating', { ascending: false })
        return { defense, counters: counters ?? [] }
      })
    )

    // 3. Collect all knight IDs for a single batch fetch
    const knightIds = new Set<string>()
    defenseWithCounters.forEach(({ defense, counters }) => {
      knightIds.add(defense.leader_id)
      knightIds.add(defense.knight2_id)
      if (defense.knight3_id) knightIds.add(defense.knight3_id)
      counters.forEach((c: GVGCounter) => {
        knightIds.add(c.leader_id)
        knightIds.add(c.knight2_id)
        if (c.knight3_id) knightIds.add(c.knight3_id)
      })
    })

    const { data: knightRows } = await supabase
      .from('knights')
      .select('*, img_skill_1, img_skill_2')
      .in('id', Array.from(knightIds))

    const km: Record<string, Knight> = {}
    knightRows?.forEach((k: Knight) => { km[k.id] = k })

    // 4. Assemble final results with joined knight data
    const results: SearchResult[] = defenseWithCounters.map(({ defense, counters }) => ({
      defense: {
        ...defense,
        leader:  km[defense.leader_id],
        knight2: km[defense.knight2_id],
        knight3: defense.knight3_id ? km[defense.knight3_id] : undefined,
      } as GVGDefense,
      counters: counters.map((c: GVGCounter) => ({
        ...c,
        leader:  km[c.leader_id],
        knight2: km[c.knight2_id],
        knight3: c.knight3_id ? km[c.knight3_id] : undefined,
      })),
    }))

    setSearchResults(results)
    setHasSearched(true)
    setIsSearching(false)
  }

  // ── Delete handler ─────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return

    if (deleteTarget.type === 'defense') {
      const { error } = await supabase
        .from('gvg_defenses')
        .delete()
        .eq('id', deleteTarget.id)

      if (!error) {
        setSearchResults(prev =>
          prev.filter(g => g.defense.id !== deleteTarget.id)
        )
      }
    }

    if (deleteTarget.type === 'counter') {
      const { error } = await supabase
        .from('gvg_counters')
        .delete()
        .eq('id', deleteTarget.id)

      if (!error) {
        setSearchResults(prev =>
          prev.map(g => ({
            ...g,
            counters: g.counters.filter(c => c.id !== deleteTarget.id),
          }))
        )
      }
    }

    setDeleteTarget(null)
  }

  // ── Modal title ─────────────────────────────────────────────────────────────
  const modalTitle =
    openModalSlot === 'leader'  ? 'Select Knight #1' :
    openModalSlot === 'knight2' ? 'Select Knight #2' :
    'Select Knight #3'

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen pb-16 no-scrollbar"
      style={{ backgroundColor: '#0a0c14', width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}
    >
      {/* Decorative grid */}
      <div
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 px-4 py-8">
        <div className="mx-auto" style={{ maxWidth: '900px' }}>

          {/* ── Page heading ──────────────────────────────────────────────── */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(to right, transparent, #f59e0b)' }} />
              <span className="text-xs tracking-widest uppercase font-semibold" style={{ color: '#f59e0b80' }}>
                Guild vs Guild
              </span>
              <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(to left, transparent, #f59e0b)' }} />
            </div>
            <h1 className="text-2xl font-black tracking-wider" style={{ color: '#e2e8f0' }}>
              GVG Counter
            </h1>
          </div>

          {/* ── Search panel ──────────────────────────────────────────────── */}
          <div
            className="rounded-xl p-6"
            style={{ backgroundColor: '#111827', border: '1px solid #1e293b' }}
          >
            <p className="text-center text-sm mb-6" style={{ color: '#6b7280' }}>
              Select a knights (#1, #2 and #3)
            </p>

            {/* 3 knight selector columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <KnightSelectorButton
                label="Knight #1:"
                knight={selectedLeader}
                onClick={() => setOpenModalSlot('leader')}
              />
              <KnightSelectorButton
                label="Knight #2:"
                knight={selectedKnight2}
                onClick={() => setOpenModalSlot('knight2')}
              />
              <KnightSelectorButton
                label="Knight #3:"
                knight={selectedKnight3}
                onClick={() => setOpenModalSlot('knight3')}
                isAnyDefault
              />
            </div>

            {/* Search button */}
            <button
              onClick={searchCounters}
              disabled={!canSearch || isSearching}
              className="w-full h-12 rounded-lg font-black text-sm uppercase tracking-widest transition-all duration-200"
              style={{
                background: canSearch && !isSearching
                  ? 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)'
                  : '#1e293b',
                color: canSearch && !isSearching ? '#0a0c14' : '#374151',
                cursor: canSearch && !isSearching ? 'pointer' : 'not-allowed',
                boxShadow: canSearch && !isSearching ? '0 4px 20px rgba(245,158,11,0.30)' : 'none',
              }}
              onMouseEnter={e => {
                if (canSearch && !isSearching) {
                  e.currentTarget.style.boxShadow = '0 6px 28px rgba(245,158,11,0.50)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }
              }}
              onMouseLeave={e => {
                if (canSearch && !isSearching) {
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(245,158,11,0.30)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }
              }}
            >
              {isSearching ? (
                <span className="flex items-center justify-center gap-2">
                  <span
                    className="inline-block w-4 h-4 rounded-full border-2 animate-spin"
                    style={{ borderColor: '#37414166', borderTopColor: '#6b7280' }}
                  />
                  Searching...
                </span>
              ) : '🔍 Search'}
            </button>

            {/* Help links */}
            <div className="flex items-center justify-center gap-4 mt-3">
              <button className="text-xs transition-colors" style={{ color: '#374151' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#6b7280' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#374151' }}
              >
                ℹ How to use
              </button>
              <span style={{ color: '#1e293b' }}>|</span>
              <button className="text-xs transition-colors" style={{ color: '#374151' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#6b7280' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#374151' }}
              >
                ⌨ Search by typing
              </button>
            </div>

            {/* Disclaimer */}
            <p className="text-center text-xs mt-4 leading-relaxed" style={{ color: '#374151' }}>
              Counters are NOT guaranteed to work as each player has different equipment and skill levels.
              <br />
              We do our best to review each counter, but results may vary.
            </p>
          </div>

          {/* ── Results section ───────────────────────────────────────────── */}
          {hasSearched && (
            <div className="mt-8 space-y-6">
              {searchResults.length === 0 ? (
                <div style={{
                  maxWidth: '900px',
                  margin: '2rem auto',
                  background: '#111827',
                  border: '1px solid #1e293b',
                  borderRadius: '12px',
                  padding: '2rem',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
                  <p style={{ color: '#9ca3af', fontSize: '1rem', marginBottom: '0.5rem' }}>
                    ไม่พบ Counter สำหรับทีมนี้ในระบบ
                  </p>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                    คุณรู้วิธี counter ทีมนี้ไหม? ช่วยแชร์ให้คนอื่นได้รู้ด้วยนะ!
                  </p>

                  <button
                    onClick={() => {
                      if (!user) {
                        setShowLoginWarning(true)
                        setTimeout(() => setShowLoginWarning(false), 3000)
                        return
                      }
                      handleContributeForNewDefense()
                    }}
                    style={{
                      background: '#f59e0b',
                      color: '#000',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.75rem 2rem',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    + Contribute Counter
                  </button>

                  {showLoginWarning && (
                    <div style={{
                      marginTop: '1rem',
                      padding: '10px 16px',
                      background: '#7f1d1d',
                      border: '1px solid #ef4444',
                      borderRadius: '8px',
                      color: '#fca5a5',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      justifyContent: 'center',
                    }}>
                      🔒 กรุณาเข้าสู่ระบบก่อนเพื่อ Contribute Counter
                      <button
                        onClick={onOpenLogin}
                        style={{
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 12px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        เข้าสู่ระบบ
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                searchResults.map(result => (
                  <DefenseGroup
                    key={result.defense.id}
                    result={result}
                    onContribute={handleContributeClick}
                    newestCounterId={newestCounterId}
                    onOpenLogin={onOpenLogin}
                    isAdmin={isAdmin}
                    onDeleteDefense={id => setDeleteTarget({ type: 'defense', id })}
                    onDeleteCounter={(id, defenseId) => setDeleteTarget({ type: 'counter', id, defenseId })}
                  />
                ))
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Login warning toast ──────────────────────────────────────────── */}
      {showLoginWarning && (
        <div
          style={{
            position: 'fixed',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9998,
            animation: 'fadeIn 0.25s ease-out forwards',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#1a0a0a',
            border: '1px solid #ef444460',
            borderRadius: '12px',
            padding: '12px 20px',
            boxShadow: '0 8px 32px rgba(239,68,68,0.20)',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: '16px' }}>🔒</span>
          <span className="text-sm font-semibold" style={{ color: '#fca5a5' }}>
            กรุณาเข้าสู่ระบบก่อนเพิ่ม Counter
          </span>
          <button
            onClick={() => { setShowLoginWarning(false); onOpenLogin() }}
            className="px-3 py-1 rounded-lg text-xs font-black transition-all"
            style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#dc2626' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ef4444' }}
          >
            เข้าสู่ระบบ
          </button>
          <button
            onClick={() => setShowLoginWarning(false)}
            className="text-xs transition-colors"
            style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#9ca3af' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6b7280' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Contribute Modal ─────────────────────────────────────────────── */}
      {showContributeModal && contributeDefenseId && (() => {
        const def = searchResults.find(g => g.defense.id === contributeDefenseId)?.defense
        if (!def) return null
        return (
          <ContributeModal
            isOpen={showContributeModal}
            onClose={() => { setShowContributeModal(false); setContributeDefenseId(null) }}
            defenseId={contributeDefenseId}
            defenseTeam={{ leader: def.leader, knight2: def.knight2, knight3: def.knight3 }}
            onSuccess={handleContributeSuccess}
          />
        )
      })()}

      {/* ── Knight Select Modal ───────────────────────────────────────────── */}
      <KnightSelectModal
        isOpen={openModalSlot !== null}
        onClose={() => setOpenModalSlot(null)}
        onSelect={handleKnightSelect}
        title={modalTitle}
        allowAny={openModalSlot === 'knight3'}
      />

      {/* ── Confirm Delete Modal ──────────────────────────────────────────── */}
      <ConfirmDeleteModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={
          deleteTarget?.type === 'defense'
            ? 'ลบทีม Defense นี้?'
            : 'ลบ Counter นี้?'
        }
        description={
          deleteTarget?.type === 'defense'
            ? 'การลบทีม Defense จะลบ Counter ทั้งหมดที่เกี่ยวข้องด้วย และไม่สามารถกู้คืนได้'
            : 'Counter นี้จะถูกลบถาวร ไม่สามารถกู้คืนได้'
        }
      />
    </div>
  )
}
