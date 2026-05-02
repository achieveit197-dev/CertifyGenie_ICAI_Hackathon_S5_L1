import { useCallback, useEffect, useRef, useState } from 'react'
import type { DrawingState, ResizeHandle, SelectionBox } from '../types/redaction'
import { normalizeRect } from '../utils/redactionCoordinates'

export const MIN_BOX_PTS = 5
const HANDLE_HIT_PX = 14

const ALL_HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

function handleCenterPx(box: SelectionBox, h: ResizeHandle, zoom: number): { x: number; y: number } {
  const x = box.x * zoom, y = box.y * zoom, w = box.width * zoom, ht = box.height * zoom
  switch (h) {
    case 'nw': return { x,       y }
    case 'n':  return { x: x+w/2, y }
    case 'ne': return { x: x+w,   y }
    case 'e':  return { x: x+w,   y: y+ht/2 }
    case 'se': return { x: x+w,   y: y+ht }
    case 's':  return { x: x+w/2, y: y+ht }
    case 'sw': return { x,        y: y+ht }
    case 'w':  return { x,        y: y+ht/2 }
  }
}

type HitResult =
  | { type: 'handle'; boxId: string; handle: ResizeHandle }
  | { type: 'box';    boxId: string }
  | { type: 'empty' }

function hitTest(px: number, py: number, boxes: SelectionBox[], activeBoxId: string | null, zoom: number): HitResult {
  if (activeBoxId) {
    const ab = boxes.find(b => b.id === activeBoxId)
    if (ab) {
      for (const h of ALL_HANDLES) {
        const c = handleCenterPx(ab, h, zoom)
        if (Math.abs(px - c.x) <= HANDLE_HIT_PX && Math.abs(py - c.y) <= HANDLE_HIT_PX)
          return { type: 'handle', boxId: activeBoxId, handle: h }
      }
    }
  }
  for (let i = boxes.length - 1; i >= 0; i--) {
    const b = boxes[i]
    const bx = b.x*zoom, by = b.y*zoom, bw = b.width*zoom, bh = b.height*zoom
    if (px >= bx && px <= bx+bw && py >= by && py <= by+bh)
      return { type: 'box', boxId: b.id }
  }
  return { type: 'empty' }
}

function applyResize(origin: SelectionBox, handle: ResizeHandle, cx: number, cy: number): SelectionBox {
  const r = origin.x + origin.width, b = origin.y + origin.height
  const nb = (x1: number, y1: number, x2: number, y2: number): SelectionBox =>
    ({ ...origin, ...normalizeRect(x1, y1, x2, y2) })
  switch (handle) {
    case 'nw': return nb(cx, cy, r, b)
    case 'n':  return nb(origin.x, cy, r, b)
    case 'ne': return nb(origin.x, cy, cx, b)
    case 'e':  return nb(origin.x, origin.y, cx, b)
    case 'se': return nb(origin.x, origin.y, cx, cy)
    case 's':  return nb(origin.x, origin.y, r, cy)
    case 'sw': return nb(cx, origin.y, r, cy)
    case 'w':  return nb(cx, origin.y, r, b)
  }
}

const initialState: DrawingState = {
  mode: 'idle', activeBoxId: null, previewBox: null,
  startCoord: null, dragOffset: null, resizeHandle: null, resizeOrigin: null,
}

export function useSelectionBoxes(zoom: number) {
  const [boxes, setBoxes]               = useState<SelectionBox[]>([])
  const [drawingState, setDrawingState] = useState<DrawingState>(initialState)
  const undoStack   = useRef<SelectionBox[][]>([])
  const overlayEl   = useRef<HTMLDivElement | null>(null)

  const boxesRef       = useRef(boxes)
  const activeBoxIdRef = useRef<string | null>(null)
  const modeRef        = useRef(drawingState.mode)
  const zoomRef        = useRef(zoom)
  useEffect(() => { boxesRef.current       = boxes },                    [boxes])
  useEffect(() => { activeBoxIdRef.current = drawingState.activeBoxId }, [drawingState.activeBoxId])
  useEffect(() => { modeRef.current        = drawingState.mode },        [drawingState.mode])
  useEffect(() => { zoomRef.current        = zoom },                     [zoom])

  const pushUndo = useCallback((prev: SelectionBox[]) => {
    undoStack.current = [...undoStack.current.slice(-30), prev]
  }, [])

  function overlayCoords(e: MouseEvent): { x: number; y: number } | null {
    const el = overlayEl.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  useEffect(() => {
    const isActive = (m: string) => m === 'drawing' || m === 'dragging' || m === 'resizing'
    if (!isActive(drawingState.mode)) return

    const onMove = (e: MouseEvent) => {
      const c = overlayCoords(e)
      if (!c) return
      const z = zoomRef.current
      const ptX = c.x / z, ptY = c.y / z

      setDrawingState(prev => {
        if (prev.mode === 'drawing' && prev.startCoord && prev.previewBox) {
          return { ...prev, previewBox: { ...prev.previewBox, ...normalizeRect(prev.startCoord.x, prev.startCoord.y, ptX, ptY) } }
        }
        if (prev.mode === 'dragging' && prev.activeBoxId && prev.dragOffset) {
          setBoxes(bs => bs.map(b => b.id === prev.activeBoxId
            ? { ...b, x: ptX - prev.dragOffset!.x, y: ptY - prev.dragOffset!.y } : b))
        }
        if (prev.mode === 'resizing' && prev.activeBoxId && prev.resizeHandle && prev.resizeOrigin) {
          setBoxes(bs => bs.map(b => b.id !== prev.activeBoxId ? b : applyResize(prev.resizeOrigin!, prev.resizeHandle!, ptX, ptY)))
        }
        return prev
      })
    }

    const onUp = () => {
      setDrawingState(prev => {
        if (prev.mode === 'dragging' || prev.mode === 'resizing')
          return { ...prev, mode: 'selected', dragOffset: null, resizeHandle: null, resizeOrigin: null }
        if (prev.mode === 'drawing') {
          if (prev.previewBox && prev.previewBox.width >= MIN_BOX_PTS && prev.previewBox.height >= MIN_BOX_PTS)
            setBoxes(b => { pushUndo(b); return [...b, prev.previewBox!] })
          return { ...initialState }
        }
        return prev
      })
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [drawingState.mode, pushUndo])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawingState(initialState)
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeBoxIdRef.current) {
        setBoxes(prev => { pushUndo(prev); return prev.filter(b => b.id !== activeBoxIdRef.current) })
        setDrawingState(initialState)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (undoStack.current.length > 0) {
          const prev = undoStack.current[undoStack.current.length - 1]
          undoStack.current = undoStack.current.slice(0, -1)
          setBoxes(prev)
          setDrawingState(initialState)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pushUndo])

  const onOverlayMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
      if (e.button !== 0) return
      e.preventDefault()
      overlayEl.current = e.currentTarget

      const rect = e.currentTarget.getBoundingClientRect()
      const cssPx  = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      const pdfPts = { x: cssPx.x / zoom, y: cssPx.y / zoom }

      const currentBoxes    = boxesRef.current
      const currentActiveId = activeBoxIdRef.current
      const hit = hitTest(cssPx.x, cssPx.y, currentBoxes, currentActiveId, zoom)

      if (hit.type === 'handle') {
        const box = currentBoxes.find(b => b.id === hit.boxId)!
        pushUndo(currentBoxes)
        setDrawingState({ ...initialState, mode: 'resizing', activeBoxId: hit.boxId, resizeHandle: hit.handle, resizeOrigin: { ...box } })
      } else if (hit.type === 'box') {
        const box = currentBoxes.find(b => b.id === hit.boxId)!
        setDrawingState({ ...initialState, mode: 'dragging', activeBoxId: hit.boxId, dragOffset: { x: pdfPts.x - box.x, y: pdfPts.y - box.y } })
      } else {
        if (currentActiveId) {
          setDrawingState(initialState)
        } else {
          setDrawingState({ ...initialState, mode: 'drawing', startCoord: pdfPts, previewBox: { id: crypto.randomUUID(), page_index: pageIndex, x: pdfPts.x, y: pdfPts.y, width: 0, height: 0 } })
        }
      }
    },
    [zoom, pushUndo],
  )

  const undo = useCallback(() => {
    if (undoStack.current.length > 0) {
      const prev = undoStack.current[undoStack.current.length - 1]
      undoStack.current = undoStack.current.slice(0, -1)
      setBoxes(prev)
      setDrawingState(initialState)
    }
  }, [])

  const clearAll = useCallback(() => {
    pushUndo(boxes)
    setBoxes([])
    setDrawingState(initialState)
  }, [boxes, pushUndo])

  const getBoxesForPage = useCallback(
    (pageIndex: number) => boxes.filter(b => b.page_index === pageIndex),
    [boxes],
  )

  return { boxes, drawingState, onOverlayMouseDown, undo, clearAll, getBoxesForPage }
}
