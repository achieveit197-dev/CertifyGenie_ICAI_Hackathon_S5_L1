import type { RedactionPayload, SelectionBox } from '../types/redaction'

export function canvasToPdfCoords(box: SelectionBox): RedactionPayload {
  return {
    page_index: box.page_index,
    x0: box.x,
    y0: box.y,
    x1: box.x + box.width,
    y1: box.y + box.height,
  }
}

export function normalizeRect(
  x1: number, y1: number, x2: number, y2: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  }
}
