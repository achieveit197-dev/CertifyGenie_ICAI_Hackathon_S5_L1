export interface PageInfo {
  page_index: number
  width_pt: number
  height_pt: number
}

/** A drawn redaction box stored in PDF points (top-left origin) */
export interface SelectionBox {
  id: string
  page_index: number
  x: number
  y: number
  width: number
  height: number
}

/** Payload sent to backend — coordinates in PDF points */
export interface RedactionPayload {
  page_index: number
  x0: number
  y0: number
  x1: number
  y1: number
}

export type DrawMode = 'idle' | 'drawing' | 'selected' | 'dragging' | 'resizing'

export type ResizeHandle =
  | 'nw' | 'n' | 'ne'
  | 'w'          | 'e'
  | 'sw' | 's' | 'se'

export interface DrawingState {
  mode: DrawMode
  activeBoxId: string | null
  previewBox: SelectionBox | null
  startCoord: { x: number; y: number } | null
  dragOffset: { x: number; y: number } | null
  resizeHandle: ResizeHandle | null
  resizeOrigin: SelectionBox | null
}
