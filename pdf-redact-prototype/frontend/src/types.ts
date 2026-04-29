export interface PageInfo {
  page_index: number
  width_pt: number
  height_pt: number
}

export interface UploadResponse {
  file_id: string
  page_count: number
  pages: PageInfo[]
}

/** A drawn redaction box in canvas CSS-pixel coordinates */
export interface SelectionBox {
  id: string
  page_index: number
  x: number       // px from left edge of canvas
  y: number       // px from top edge of canvas
  width: number   // px
  height: number  // px
}

/** Payload sent to backend — coordinates in PDF points (top-left origin) */
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

export type AppPhase = 'upload' | 'editing' | 'redacting' | 'done'
