import type { RedactionPayload, SelectionBox } from '../types'

/**
 * Converts a selection box to the RedactionPayload sent to the backend.
 * Boxes are stored in PDF points, so no scaling is needed here.
 */
export function canvasToPdfCoords(box: SelectionBox): RedactionPayload {
  return {
    page_index: box.page_index,
    x0: box.x,
    y0: box.y,
    x1: box.x + box.width,
    y1: box.y + box.height,
  }
}

/** Ensures width/height are positive regardless of drag direction */
export function normalizeRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  }
}

/** Returns canvas-relative coords from a mouse/pointer event on an element */
export function getCanvasCoords(
  e: React.MouseEvent<HTMLElement> | MouseEvent,
  el: HTMLElement,
): { x: number; y: number } {
  const rect = el.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
}
