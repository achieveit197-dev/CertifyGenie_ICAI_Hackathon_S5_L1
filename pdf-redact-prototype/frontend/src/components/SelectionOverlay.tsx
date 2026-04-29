import type { DrawingState, SelectionBox } from '../types'
import SelectionBoxComponent from './SelectionBox'

interface Props {
  pageIndex: number
  cssWidth: number
  cssHeight: number
  boxes: SelectionBox[]
  drawingState: DrawingState
  previewMode: boolean
  zoom: number
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void
}

export default function SelectionOverlay({
  pageIndex,
  cssWidth,
  cssHeight,
  boxes,
  drawingState,
  previewMode,
  zoom,
  onMouseDown,
}: Props) {
  const { mode, activeBoxId, previewBox } = drawingState

  const cursor =
    mode === 'drawing'   ? 'crosshair' :
    mode === 'dragging'  ? 'grabbing'  :
    mode === 'resizing'  ? 'nwse-resize' :
    mode === 'selected'  ? 'default'   : 'crosshair'

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        top: 0, left: 0,
        width: cssWidth,
        height: cssHeight,
        cursor,
        userSelect: 'none',
        zIndex: 2,
      }}
    >
      {boxes.map(box => (
        <SelectionBoxComponent
          key={box.id}
          box={box}
          isSelected={activeBoxId === box.id}
          previewMode={previewMode}
          zoom={zoom}
        />
      ))}

      {previewBox && previewBox.page_index === pageIndex && (
        <SelectionBoxComponent
          box={previewBox}
          isSelected={false}
          isPreview
          previewMode={false}
          zoom={zoom}
        />
      )}
    </div>
  )
}
