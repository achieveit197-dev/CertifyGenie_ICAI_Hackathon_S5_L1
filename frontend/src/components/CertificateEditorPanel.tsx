/**
 * CertificateEditorPanel — Left panel in Preview & Edit step.
 * All certificate fields are editable except the title.
 */
import { Edit3, Building2, User, Hash, MapPin, Calendar, AlignLeft, StickyNote, Shield, Layers, Lock, Eye, EyeOff, Target } from 'lucide-react'
import { useState } from 'react'
import type { ExtractedData, CertificateType, CertificateEditorState } from '../types'

function formatINR(value: number | null | undefined): string {
  if (value == null) return ''
  return Math.round(value).toString()
}

interface RowConfig {
  key: string
  defaultLabel: string
  showFor: CertificateType[]
}

const ROWS: RowConfig[] = [
  { key: 'share_capital',      defaultLabel: 'Share Capital (A)',            showFor: ['net_worth'] },
  { key: 'reserves_surplus',   defaultLabel: 'Add: Reserves & Surplus (B)',  showFor: ['net_worth'] },
  { key: 'accumulated_losses', defaultLabel: 'Less: Accumulated Losses (C)', showFor: ['net_worth'] },
  { key: 'net_worth',          defaultLabel: 'Net Worth (A + B − C)',        showFor: ['net_worth'] },
  { key: 'turnover',           defaultLabel: 'Annual Turnover',              showFor: ['turnover'] },
  { key: 'net_profit',         defaultLabel: 'Net Profit / (Loss)',          showFor: ['turnover'] },
  { key: 'current_assets',     defaultLabel: 'Current Assets (A)',           showFor: ['working_capital'] },
  { key: 'current_liabilities',defaultLabel: 'Less: Current Liabilities (B)',showFor: ['working_capital'] },
  { key: 'working_capital',    defaultLabel: 'Working Capital (A − B)',      showFor: ['working_capital'] },
]

function getExtractedValue(key: string, data: ExtractedData): number | null {
  const field = data[key as keyof ExtractedData]
  if (field && typeof field === 'object' && 'value' in field) return (field as { value: number | null }).value
  return null
}

// ── Reusable input components ──────────────────────────────────────────────

function InputField({
  label, icon, value, onChange, placeholder, mono = false,
}: {
  label: string; icon: React.ReactNode; value: string
  onChange: (v: string) => void; placeholder: string; mono?: boolean
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`input-field pl-9 ${mono ? 'font-mono' : ''}`}
        />
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden shadow-card">
      <div className="bg-navy-900 px-4 py-2.5">
        <h4 className="text-[10px] font-bold text-white/70 uppercase tracking-widest">{title}</h4>
      </div>
      <div className="p-4 space-y-3 bg-white">{children}</div>
    </div>
  )
}

interface Props {
  certType: CertificateType
  data: ExtractedData
  editorState: CertificateEditorState
  onChange: (patch: Partial<CertificateEditorState>) => void
}

export function CertificateEditorPanel({ certType, data, editorState, onChange }: Props) {
  const rows = ROWS.filter(r => r.showFor.includes(certType))

  const set = (key: keyof CertificateEditorState) => (value: string) =>
    onChange({ [key]: value } as Partial<CertificateEditorState>)

  const setLabel = (key: string, label: string) =>
    onChange({ rowLabels: { ...editorState.rowLabels, [key]: label } })

  const setValue = (key: string, raw: string) => {
    const num = parseFloat(raw.replace(/[,\s₹]/g, ''))
    if (!isNaN(num)) {
      onChange({ rowValues: { ...editorState.rowValues, [key]: num } })
    } else if (raw === '') {
      const next = { ...editorState.rowValues }
      delete next[key]
      onChange({ rowValues: next })
    }
  }

  return (
    <div className="flex flex-col gap-4 overflow-y-auto">

      {/* ── Certificate Header ── */}
      <Section title="Certificate Header">
        <InputField
          label="Certificate Number"
          icon={<Hash className="w-3.5 h-3.5" />}
          value={editorState.customCertNumber}
          onChange={set('customCertNumber')}
          placeholder="Auto-generated if blank"
          mono
        />
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Company / Client Name"
            icon={<Building2 className="w-3.5 h-3.5" />}
            value={editorState.companyName}
            onChange={set('companyName')}
            placeholder="M/s ABC Traders Pvt Ltd"
          />
          <InputField
            label="Financial Year"
            icon={<Calendar className="w-3.5 h-3.5" />}
            value={editorState.financialYear}
            onChange={set('financialYear')}
            placeholder="2024-25"
          />
        </div>
        <InputField
          label="Certificate Date"
          icon={<Calendar className="w-3.5 h-3.5" />}
          value={editorState.certDate}
          onChange={set('certDate')}
          placeholder="DD/MM/YYYY"
        />
        <InputField
          label="UDIN"
          icon={<Shield className="w-3.5 h-3.5" />}
          value={editorState.udin}
          onChange={set('udin')}
          placeholder="e.g. 26012345AAAAAA0001"
          mono
        />
      </Section>

      {/* ── Opening Narrative ── */}
      <Section title="Opening Paragraph">
        <div className="relative">
          <AlignLeft className="absolute left-3 top-3 w-3.5 h-3.5 text-gray-400" />
          <textarea
            value={editorState.narrative}
            onChange={e => onChange({ narrative: e.target.value })}
            rows={4}
            className="input-field pl-9 resize-none leading-relaxed"
            placeholder="Enter the opening paragraph of the certificate..."
          />
        </div>
      </Section>

      {/* ── Net Worth Method (read-only, set in Step 4) ── */}
      {certType === 'net_worth' && editorState.nwMethodLabel && (
        <div className="rounded-xl border border-navy-100 bg-navy-50/50 px-4 py-3 flex items-center gap-2.5">
          <Layers className="w-3.5 h-3.5 text-navy-500 shrink-0" />
          <div>
            <p className="text-[10px] font-semibold text-navy-500 uppercase tracking-widest">Calculation Method</p>
            <p className="text-sm font-bold text-navy-800">{editorState.nwMethodLabel}</p>
          </div>
        </div>
      )}

      {/* ── Working Capital Purpose ── */}
      {certType === 'working_capital' && (
        <Section title="Certificate Purpose">
          <InputField
            label="Purpose (optional)"
            icon={<Target className="w-3.5 h-3.5" />}
            value={editorState.wcPurpose}
            onChange={set('wcPurpose')}
            placeholder="e.g. Bank Loan Assessment, Tender Submission, OD Facility"
          />
          <p className="text-[11px] text-gray-400">
            If filled, appears as: "…issued at the specific request of the client for the purpose of: <em>[your text]</em>."
          </p>
        </Section>
      )}

      {/* ── Financial Figures ── */}
      {rows.length > 0 && (
        <Section title="Financial Figures — Edit Label or Value">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                <th className="text-left pb-2 font-semibold">Row Label</th>
                <th className="text-right pb-2 font-semibold w-32">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row) => {
                const extracted = getExtractedValue(row.key, data)
                const currentLabel = editorState.rowLabels[row.key] || row.defaultLabel
                const currentValue = editorState.rowValues[row.key] != null
                  ? editorState.rowValues[row.key]
                  : extracted

                return (
                  <tr key={row.key}>
                    <td className="py-1.5 pr-2">
                      <input
                        type="text"
                        value={currentLabel}
                        onChange={e => setLabel(row.key, e.target.value)}
                        className="w-full text-xs border border-transparent rounded-lg px-2 py-1.5
                          hover:border-gray-200 focus:border-navy-400 focus:outline-none
                          focus:ring-2 focus:ring-navy-500/10 bg-transparent transition-all"
                      />
                    </td>
                    <td className="py-1.5">
                      <input
                        type="text"
                        defaultValue={formatINR(currentValue)}
                        onBlur={e => setValue(row.key, e.target.value)}
                        className="w-full text-xs text-right font-mono border border-transparent
                          rounded-lg px-2 py-1.5 hover:border-gray-200 focus:border-navy-400
                          focus:outline-none focus:ring-2 focus:ring-navy-500/10 bg-transparent transition-all"
                        placeholder="—"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-1">
            <Edit3 className="w-3 h-3" /> Click any field to edit
          </p>
        </Section>
      )}

      {/* ── Additional Notes ── */}
      <Section title="Additional Notes (before signature)">
        <div className="relative">
          <StickyNote className="absolute left-3 top-3 w-3.5 h-3.5 text-gray-400" />
          <textarea
            value={editorState.additionalNotes}
            onChange={e => onChange({ additionalNotes: e.target.value })}
            rows={3}
            className="input-field pl-9 resize-none leading-relaxed"
            placeholder="e.g. This certificate is issued for the purpose of bank loan / visa application..."
          />
        </div>
      </Section>

      {/* ── CA Details ── */}
      <Section title="CA / Firm Details">
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="CA Full Name"
            icon={<User className="w-3.5 h-3.5" />}
            value={editorState.caName}
            onChange={set('caName')}
            placeholder="CA Ramesh Kumar"
          />
          <InputField
            label="Membership No."
            icon={<Hash className="w-3.5 h-3.5" />}
            value={editorState.caMembershipNo}
            onChange={set('caMembershipNo')}
            placeholder="012345"
            mono
          />
        </div>
        <InputField
          label="Firm Name"
          icon={<Building2 className="w-3.5 h-3.5" />}
          value={editorState.caFirmName}
          onChange={set('caFirmName')}
          placeholder="Kumar & Associates"
        />
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Address</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-3.5 h-3.5 text-gray-400" />
            <textarea
              value={editorState.caAddress}
              onChange={e => onChange({ caAddress: e.target.value })}
              rows={2}
              className="input-field pl-9 resize-none"
              placeholder="Full office address..."
            />
          </div>
        </div>
      </Section>

      {/* ── PDF Password Protection ── */}
      <PdfPasswordSection editorState={editorState} onChange={onChange} />

    </div>
  )
}

function PdfPasswordSection({ editorState, onChange }: { editorState: CertificateEditorState; onChange: (patch: Partial<CertificateEditorState>) => void }) {
  const [showPwd, setShowPwd] = useState(false)
  const [pwdError, setPwdError] = useState('')

  const handlePasswordChange = (val: string) => {
    if (val && !/^[a-zA-Z0-9]*$/.test(val)) {
      setPwdError('Only letters and numbers allowed (alphanumeric)')
    } else {
      setPwdError('')
    }
    onChange({ pdfPassword: val })
  }

  return (
    <div className="rounded-xl border border-dashed border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">PDF Password Protection</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={editorState.pdfPasswordEnabled}
            onChange={e => onChange({ pdfPasswordEnabled: e.target.checked, pdfPassword: '' })}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer
            peer-checked:after:translate-x-full peer-checked:after:border-white
            after:content-[''] after:absolute after:top-[2px] after:left-[2px]
            after:bg-white after:border-gray-300 after:border after:rounded-full
            after:h-4 after:w-4 after:transition-all peer-checked:bg-navy-600" />
        </label>
      </div>

      {editorState.pdfPasswordEnabled && (
        <div>
          <p className="text-xs text-gray-500 mb-2">
            Enter an alphanumeric password. Recipients will need this to open the PDF.
          </p>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type={showPwd ? 'text' : 'password'}
              value={editorState.pdfPassword}
              onChange={e => handlePasswordChange(e.target.value)}
              placeholder="e.g. Certify2025"
              className="input-field pl-9 pr-10 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPwd(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          {pwdError && <p className="text-xs text-red-500 mt-1">{pwdError}</p>}
          {editorState.pdfPassword && !pwdError && (
            <p className="text-xs text-emerald-600 mt-1">
              Password set — share this with your client separately.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
