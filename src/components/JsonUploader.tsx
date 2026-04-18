import { useRef, useState } from 'react'
import type { ParsedEquipmentItem, RawEquipmentItem } from '../types/index'
import { parseEquipmentItem } from '../types/index'

interface Props {
  onImport: (items: ParsedEquipmentItem[]) => void
}

export default function JsonUploader({ onImport }: Props) {
  const [isDragging,   setIsDragging]   = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [fileName,     setFileName]     = useState<string | null>(null)
  const [itemCount,    setItemCount]    = useState<number | null>(null)
  const [parsedItems,  setParsedItems]  = useState<ParsedEquipmentItem[]>([])

  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setIsDragging(false)

    if (!file.name.endsWith('.json')) {
      setError('กรุณาเลือกไฟล์ .json เท่านั้น')
      return
    }

    try {
      const text = await file.text()
      const raw: RawEquipmentItem[] = JSON.parse(text)

      if (!Array.isArray(raw)) {
        setError('ไฟล์ JSON ต้องเป็น array ของอุปกรณ์')
        return
      }

      const parsed = raw.map(parseEquipmentItem)
      setFileName(file.name)
      setItemCount(parsed.length)
      setParsedItems(parsed)
    } catch {
      setError('ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบ format')
    }
  }

  function reset() {
    setFileName(null)
    setItemCount(null)
    setParsedItems([])
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const hasFile = fileName !== null && itemCount !== null

  return (
    <div style={{
      background: '#111827',
      border: '1px solid #1e293b',
      borderRadius: '12px',
      padding: '20px',
    }}>
      {/* Title */}
      <p style={{
        fontSize: '13px',
        fontWeight: 'bold',
        color: '#f59e0b',
        margin: '0 0 12px',
      }}>
        📂 นำเข้าอุปกรณ์จากไฟล์ JSON
      </p>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => {
          e.preventDefault()
          handleFile(e.dataTransfer.files?.[0])
        }}
        onClick={() => !hasFile && inputRef.current?.click()}
        style={{
          background: isDragging ? '#1e3a5f' : '#0f172a',
          border: error
            ? '2px solid #ef4444'
            : isDragging
            ? '2px solid #f59e0b'
            : '2px dashed #374151',
          borderRadius: '10px',
          padding: '24px',
          textAlign: 'center',
          cursor: hasFile ? 'default' : 'pointer',
          transition: 'all 0.15s',
        }}
      >
        {hasFile ? (
          /* ── Success state ── */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '32px', lineHeight: 1 }}>✅</span>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>
              {fileName}
            </span>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              {itemCount} รายการอุปกรณ์
            </span>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                onClick={e => { e.stopPropagation(); onImport(parsedItems) }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)',
                  color: '#0a0c14',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s',
                  boxShadow: '0 4px 12px rgba(245,158,11,0.25)',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 18px rgba(245,158,11,0.45)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(245,158,11,0.25)' }}
              >
                ใช้ข้อมูลนี้
              </button>

              <button
                onClick={e => { e.stopPropagation(); reset() }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  background: 'transparent',
                  color: '#9ca3af',
                  border: '1px solid #374151',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#6b7280'; e.currentTarget.style.color = '#e2e8f0' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.color = '#9ca3af' }}
              >
                เลือกไฟล์ใหม่
              </button>
            </div>
          </div>
        ) : (
          /* ── Drop zone content ── */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', pointerEvents: 'none' }}>
            <span style={{ fontSize: '36px', lineHeight: 1 }}>📄</span>
            <span style={{ fontSize: '13px', color: '#9ca3af' }}>
              วาง JSON file ที่นี่ หรือคลิกเพื่อเลือกไฟล์
            </span>
            <span style={{ fontSize: '11px', color: '#4b5563' }}>
              รองรับไฟล์ .json เท่านั้น
            </span>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p style={{
          fontSize: '12px',
          color: '#ef4444',
          margin: '8px 0 0',
        }}>
          ⚠ {error}
        </p>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}
