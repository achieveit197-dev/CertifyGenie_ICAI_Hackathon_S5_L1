/**
 * History — Shows all certificates generated in this browser session.
 * State stored in localStorage; re-download links may expire after 24h.
 */
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Download, Clock, Building2, FileText, Trash2 } from 'lucide-react'
import type { HistoryEntry } from '../types'
import { loadHistory, clearHistory } from '../api/client'

const CERT_TYPE_LABELS: Record<string, string> = {
  net_worth: 'Net Worth Certificate',
  turnover:  'Turnover Certificate',
}

export default function History() {
  const navigate = useNavigate()
  const entries: HistoryEntry[] = loadHistory()

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Nav */}
      <div className="text-white px-6 py-3.5 flex items-center justify-between border-b border-white/5"
        style={{ background: 'linear-gradient(to right, #0a1628, #0e1e32)' }}>
        <button onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-white/50 hover:text-white/90 transition-colors text-sm font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Home
        </button>
        <span className="font-bold text-base tracking-tight">Certificate History</span>
        <button
          onClick={() => { clearHistory(); window.location.reload() }}
          className="flex items-center gap-1.5 text-white/40 hover:text-red-400 transition-colors text-sm font-medium"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear All
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-navy-900">Generated Certificates</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Stored in your browser · Download links valid for 24 hours after generation
          </p>
        </div>

        {entries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-400 text-base">No certificates yet</p>
            <p className="text-sm text-gray-400 mt-1">Certificates you generate will appear here</p>
            <button onClick={() => navigate('/generate')} className="btn-primary text-sm mt-6">
              Generate Certificate
            </button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {[...entries].reverse().map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-card p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-navy-50 border border-navy-100 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-navy-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-navy-900 text-sm">
                          {CERT_TYPE_LABELS[entry.cert_type] ?? entry.cert_type}
                        </span>
                        {entry.method_label && (
                          <span className="text-[10px] font-bold text-navy-600 bg-navy-50 border border-navy-100 px-2 py-0.5 rounded-full">
                            {entry.method_label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {entry.company || '—'}
                        </span>
                        <span>{entry.financial_year || '—'}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {entry.generated_at}
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-gray-400 mt-1">{entry.cert_number}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <a href={entry.pdf_url} download
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl
                        bg-navy-900 text-white hover:bg-navy-800 transition-colors">
                      <Download className="w-3.5 h-3.5" /> PDF
                    </a>
                    <a href={entry.docx_url} download
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl
                        border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                      <Download className="w-3.5 h-3.5" /> DOCX
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
