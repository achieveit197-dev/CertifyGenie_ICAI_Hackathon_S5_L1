import type { ResizeHandle, SelectionBox } from '../../types/redaction'

interface Props {
  box: SelectionBox
  isSelected: boolean
  isPreview?: boolean
  previewMode: boolean
  zoom: number
}

const HANDLES: { h: ResizeHandle; style: React.CSSProperties }[] = [
  { h: 'nw', style: { top: -5,  left: -5 } },
  { h: 'n',  style: { top: -5,  left: '50%', transform: 'translateX(-50%)' } },
  { h: 'ne', style: { top: -5,  right: -5 } },
  { h: 'e',  style: { top: '50%', right: -5, transform: 'translateY(-50%)' } },
  { h: 'se', style: { bottom: -5, right: -5 } },
  { h: 's',  style: { bottom: -5, left: '50%', transform: 'translateX(-50%)' } },
  { h: 'sw', style: { bottom: -5, left: -5 } },
  { h: 'w',  style: { top: '50%', left: -5,  transform: 'translateY(-50%)' } },
]

export default function SelectionBoxComponent({ box, isSelected, isPreview = false, previewMode, zoom }: Props) {
  const bgClass = isPreview
    ? 'bg-red-400/20 border-red-400 border-dashed'
    : previewMode
    ? 'bg-red-500/35 border-red-500'
    : 'bg-black/75 border-white/30'

  // Box is stored in PDF points — scale to CSS px for rendering
  return (
    <div
      style={{
        position: 'absolute',
        left:   box.x * zoom,
        top:    box.y * zoom,
        width:  Math.max(box.width  * zoom, 1),
        height: Math.max(box.height * zoom, 1),
        pointerEvents: 'none',
      }}
      className={`border-2 ${bgClass} rounded-sm`}
    >
      {isSelected && !isPreview && HANDLES.map(({ h, style }) => (
        <div
          key={h}
          style={{
            position: 'absolute',
            width: 10, height: 10,
            background: 'white',
            border: '1.5px solid #1E3A5F',
            borderRadius: 2,
            pointerEvents: 'none',
            ...style,
          }}
        />
      ))}
    </div>
  )
}
