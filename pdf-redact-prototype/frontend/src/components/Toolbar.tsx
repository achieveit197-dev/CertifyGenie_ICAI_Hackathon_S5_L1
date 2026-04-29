import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Minus,
  Plus,
  Shield,
  Trash2,
  Undo2,
} from 'lucide-react'

interface Props {
  pageCount: number
  currentPage: number
  onPageChange: (index: number) => void
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  previewMode: boolean
  onTogglePreview: () => void
  stripMetadata: boolean
  onToggleStripMetadata: () => void
  boxCount: number
  onUndo: () => void
  onClearAll: () => void
  onRedact: () => void
  isProcessing: boolean
}

export default function Toolbar({
  pageCount,
  currentPage,
  onPageChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  previewMode,
  onTogglePreview,
  stripMetadata,
  onToggleStripMetadata,
  boxCount,
  onUndo,
  onClearAll,
  onRedact,
  isProcessing,
}: Props) {
  const btn = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed'
  const iconBtn = 'w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <header className="flex items-center gap-3 px-4 py-2 bg-white border-b border-navy-100 shadow-sm flex-wrap">
      {/* Brand */}
      <div className="flex items-center gap-2 mr-2">
        <Shield className="w-5 h-5 text-navy-700" />
        <span className="font-bold text-navy-700 text-sm tracking-tight">PDF Redact</span>
      </div>

      <div className="w-px h-6 bg-navy-100" />

      {/* Page navigation */}
      <div className="flex items-center gap-1">
        <button
          className={`${iconBtn} hover:bg-navy-100 text-navy-600`}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm text-navy-600 font-medium min-w-[72px] text-center">
          {currentPage + 1} / {pageCount}
        </span>
        <button
          className={`${iconBtn} hover:bg-navy-100 text-navy-600`}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= pageCount - 1}
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-6 bg-navy-100" />

      {/* Zoom */}
      <div className="flex items-center gap-1">
        <button
          className={`${iconBtn} hover:bg-navy-100 text-navy-600`}
          onClick={onZoomOut}
          disabled={zoom <= 0.4}
          title="Zoom out  (−)"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={onZoomReset}
          className="text-xs font-mono text-navy-600 min-w-[44px] text-center hover:text-navy-800 transition-colors"
          title="Reset zoom"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          className={`${iconBtn} hover:bg-navy-100 text-navy-600`}
          onClick={onZoomIn}
          disabled={zoom >= 3}
          title="Zoom in  (+)"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-6 bg-navy-100" />

      {/* Undo / Clear */}
      <button
        className={`${iconBtn} hover:bg-navy-100 text-navy-600`}
        onClick={onUndo}
        title="Undo  (Ctrl+Z)"
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        className={`${iconBtn} hover:bg-red-50 text-red-400 hover:text-red-600`}
        onClick={onClearAll}
        disabled={boxCount === 0}
        title="Clear all boxes"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-navy-100" />

      {/* Preview toggle */}
      <button
        onClick={onTogglePreview}
        className={`${btn} ${previewMode ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-navy-50 text-navy-600 hover:bg-navy-100'}`}
        title="Toggle preview mode — shows redacted areas in red"
      >
        {previewMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        <span className="hidden sm:inline">{previewMode ? 'Preview on' : 'Preview'}</span>
      </button>

      {/* Strip metadata toggle */}
      <label className="flex items-center gap-1.5 cursor-pointer select-none text-sm text-navy-500 hover:text-navy-700 transition-colors" title="Remove author, title, and XMP metadata from output PDF">
        <input
          type="checkbox"
          checked={stripMetadata}
          onChange={onToggleStripMetadata}
          className="accent-navy-700 w-3.5 h-3.5"
        />
        <span className="hidden sm:inline">Strip metadata</span>
      </label>

      <div className="flex-1" />

      {/* Redact button */}
      <button
        onClick={onRedact}
        disabled={boxCount === 0 || isProcessing}
        className={`${btn} bg-navy-700 text-white hover:bg-navy-600 shadow-glow disabled:shadow-none`}
        title={boxCount === 0 ? 'Draw at least one selection box first' : 'Apply redactions and download'}
      >
        {isProcessing ? (
          <>
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Redacting…
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Redact &amp; Download
            {boxCount > 0 && (
              <span className="ml-1 bg-accent text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                {boxCount}
              </span>
            )}
          </>
        )}
      </button>
    </header>
  )
}
