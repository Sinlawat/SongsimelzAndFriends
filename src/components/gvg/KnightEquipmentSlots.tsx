import { useState } from 'react'
import type { Knight, EquipmentSlotType, Equipment } from '../../types/index'
import { ELEMENT_COLORS, EQUIPMENT_SLOTS } from '../../types/index'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  knight?: Knight
  items: Record<EquipmentSlotType, Equipment | null>
  onSlotClick: (slotType: EquipmentSlotType) => void
  readonly?: boolean
  imagesLoading?: boolean
}

// ─── Slot icons ───────────────────────────────────────────────────────────────

const SLOT_ICON: Record<string, string> = {
  weapon: '⚔️',
  armor:  '🛡️',
  ring:   '💍',
}

const SET_COLORS = ['#f59e0b', '#3b82f6', '#a855f7', '#22c55e', '#ef4444', '#06b6d4']

function getSetColor(setName: string): string {
  const hash = setName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return SET_COLORS[hash % SET_COLORS.length]
}

// ─── Single slot button ───────────────────────────────────────────────────────

function SlotButton({
  slotType,
  equipment,
  onClick,
  readonly,
  imagesLoading,
}: {
  slotType: EquipmentSlotType
  equipment: Equipment | null
  onClick: () => void
  readonly: boolean
  imagesLoading?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const slotMeta  = EQUIPMENT_SLOTS.find(s => s.type === slotType)!
  const equipType = slotMeta.equipType
  const icon      = SLOT_ICON[equipType]
  const hasEquip  = equipment !== null

  const title = hasEquip
    ? `${equipment!.name}${equipment!.set_name ? ` (${equipment!.set_name})` : ''}`
    : slotMeta.label

  return (
    <div
      onClick={() => !readonly && onClick()}
      onMouseEnter={() => !readonly && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title}
      style={{
        width: 'clamp(40px,8vw,56px)',
        height: 'clamp(40px,8vw,56px)',
        borderRadius: '10px',
        position: 'relative',
        cursor: readonly ? 'default' : 'pointer',
        overflow: 'hidden',
        transition: 'border-color 0.15s, background 0.15s',
        flexShrink: 0,
        ...(hasEquip ? {
          border: '2px solid #f59e0b44',
          background: '#1e3a5f',
        } : {
          border: `2px dashed ${hovered ? '#f59e0b' : '#2d4a7a'}`,
          background: hovered ? '#1e2d4a' : '#1a2744',
        }),
      }}
    >
      {hasEquip ? (
        <>
          {/* Equipment image, loading spinner, or set-color placeholder */}
          {equipment!.image_url ? (
            <img
              src={equipment!.image_url}
              alt={equipment!.name}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          ) : imagesLoading ? (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: '16px', height: '16px', borderRadius: '50%',
                border: '2px solid #37414166', borderTopColor: '#f59e0b',
                animation: 'spin 0.7s linear infinite',
              }} />
            </div>
          ) : equipment!.set_name ? (
            /* Set-color placeholder: hashed color per set */
            (() => {
              const color = getSetColor(equipment!.set_name!)
              return (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: color + '22',
                  border: `2px solid ${color}`,
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                }}>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color, lineHeight: 1 }}>
                    {equipment!.set_name!.charAt(0).toUpperCase()}
                  </span>
                  {equipment!.id.startsWith('imported-') && (
                    <span style={{ fontSize: '7px', color: '#6b7280' }}>
                      #{equipment!.id.split('-')[1]}
                    </span>
                  )}
                </div>
              )
            })()
          ) : (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '2px', padding: '2px',
            }}>
              <span style={{ fontSize: '20px', lineHeight: 1 }}>{icon}</span>
            </div>
          )}

          {/* Remove X — edit mode only */}
          {!readonly && (
            <button
              onClick={e => { e.stopPropagation(); onClick() }}
              style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: '#ef4444',
                border: '1.5px solid #0f172a',
                color: '#fff',
                fontSize: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                padding: 0,
                zIndex: 2,
              }}
            >
              ✕
            </button>
          )}
        </>
      ) : (
        /* Empty slot */
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
        }}>
          <span style={{ fontSize: '20px', lineHeight: 1, opacity: 0.5 }}>{icon}</span>
          <span style={{ fontSize: '7px', color: '#374151', textAlign: 'center' }}>
            {slotMeta.label}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function KnightEquipmentSlots({
  knight,
  items,
  onSlotClick,
  readonly = false,
  imagesLoading = false,
}: Props) {
  const elementColor = knight ? (ELEMENT_COLORS[knight.element] ?? '#6b7280') : '#6b7280'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
      {/*
        Grid layout:
          col 1 (68px) — portrait (spans 2 rows)
          col 2 (56px) — weapon1 / weapon2
          col 3 (56px) — armor1 / armor2
          col 4 (56px) — ring (spans 2 rows, centered)
      */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'clamp(52px,9vw,68px) clamp(40px,8vw,56px) clamp(40px,8vw,56px) clamp(40px,8vw,56px)',
        gridTemplateRows: 'clamp(40px,8vw,56px) clamp(40px,8vw,56px)',
        gap: '6px',
        alignItems: 'center',
      }}>
        {/* Knight portrait — col 1, rows 1-2 */}
        <div style={{
          gridColumn: 1,
          gridRow: '1 / 3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            width: 'clamp(44px,9vw,60px)',
            height: 'clamp(44px,9vw,60px)',
            borderRadius: '50%',
            overflow: 'hidden',
            border: `2px solid ${elementColor}`,
            flexShrink: 0,
          }}>
            {knight?.image_url ? (
              <img
                src={knight.image_url}
                alt={knight.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                background: elementColor + '33',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 'bold',
                color: elementColor,
              }}>
                {knight ? knight.name.charAt(0).toUpperCase() : '?'}
              </div>
            )}
          </div>
        </div>

        {/* weapon1 — col 2, row 1 */}
        <div style={{ gridColumn: 2, gridRow: 1 }}>
          <SlotButton slotType="weapon1" equipment={items.weapon1} onClick={() => onSlotClick('weapon1')} readonly={readonly} imagesLoading={imagesLoading} />
        </div>

        {/* weapon2 — col 2, row 2 */}
        <div style={{ gridColumn: 2, gridRow: 2 }}>
          <SlotButton slotType="weapon2" equipment={items.weapon2} onClick={() => onSlotClick('weapon2')} readonly={readonly} imagesLoading={imagesLoading} />
        </div>

        {/* armor1 — col 3, row 1 */}
        <div style={{ gridColumn: 3, gridRow: 1 }}>
          <SlotButton slotType="armor1" equipment={items.armor1} onClick={() => onSlotClick('armor1')} readonly={readonly} imagesLoading={imagesLoading} />
        </div>

        {/* armor2 — col 3, row 2 */}
        <div style={{ gridColumn: 3, gridRow: 2 }}>
          <SlotButton slotType="armor2" equipment={items.armor2} onClick={() => onSlotClick('armor2')} readonly={readonly} imagesLoading={imagesLoading} />
        </div>

        {/* ring — col 4, rows 1-2, vertically centered */}
        <div style={{
          gridColumn: 4,
          gridRow: '1 / 3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <SlotButton slotType="ring" equipment={items.ring} onClick={() => onSlotClick('ring')} readonly={readonly} imagesLoading={imagesLoading} />
        </div>
      </div>


    </div>
  )
}
