/**
 * CertificatePreviewPanel — Live HTML certificate preview.
 * Updates in real-time from editor state. Table rows change per selected NW method.
 */
import type { ExtractedData, CertificateType, CertificateEditorState } from '../types'
import { MethodBadge } from './MethodBadge'

function formatINR(value: number | null | undefined): string {
  if (value == null) return '—'
  const abs = Math.abs(value)
  const s = Math.round(abs).toString()
  let formatted = ''
  if (s.length <= 3) {
    formatted = s
  } else {
    formatted = s.slice(-3)
    let remaining = s.slice(0, -3)
    while (remaining.length > 2) {
      formatted = remaining.slice(-2) + ',' + formatted
      remaining = remaining.slice(0, -2)
    }
    if (remaining) formatted = remaining + ',' + formatted
  }
  return `₹${value < 0 ? '-' : ''}${formatted}`
}

function getVal(fieldKey: string, data: ExtractedData, editorState: CertificateEditorState): number | null {
  if (editorState.rowValues[fieldKey] != null) return editorState.rowValues[fieldKey]
  const field = data[fieldKey as keyof ExtractedData]
  if (field && typeof field === 'object' && 'value' in field) return (field as { value: number | null }).value
  return null
}

function getLabel(fieldKey: string, defaultLabel: string, editorState: CertificateEditorState): string {
  return editorState.rowLabels[fieldKey] || defaultLabel
}

interface Props {
  certType: CertificateType
  data: ExtractedData
  editorState: CertificateEditorState
}

const TD = 'border border-gray-300 px-3 py-2 text-sm'

// ── Method-aware row builder ──────────────────────────────────────────────────
type RowDef = {
  key: string
  label: string
  val: number | null
  paren?: boolean
  bold?: boolean
  green?: boolean
}

function buildNWRows(methodId: string, data: ExtractedData, editorState: CertificateEditorState): RowDef[] {
  const sc  = getVal('share_capital',       data, editorState)
  const rs  = getVal('reserves_surplus',    data, editorState)
  const al  = getVal('accumulated_losses',  data, editorState)
  const ta  = getVal('total_assets',        data, editorState)
  const tl  = getVal('total_liabilities',   data, editorState)
  const ia  = getVal('intangible_assets',   data, editorState)
  const gw  = getVal('goodwill',            data, editorState)
  const rr  = getVal('revaluation_reserve', data, editorState)
  const de  = getVal('deferred_expenditure',data, editorState)
  const nw  = getVal('net_worth',           data, editorState)

  const bv  = sc != null && rs != null ? sc + (rs ?? 0) - (al ?? 0) : null
  const tnw = bv != null ? bv - (ia ?? 0) - (gw ?? 0) : null

  switch (methodId) {
    case 'nav':
      return [
        { key: 'total_assets',      label: 'Total Assets (A)',           val: ta },
        { key: 'total_liabilities', label: 'Less: Total Liabilities (B)', val: tl, paren: true },
        { key: 'net_worth',         label: 'Net Worth / NAV (A − B)',     val: nw, bold: true, green: true },
      ]

    case 'tangible_nw':
      return [
        { key: 'share_capital',     label: 'Share Capital (A)',                 val: sc },
        { key: 'reserves_surplus',  label: 'Add: Reserves & Surplus (B)',       val: rs },
        { key: 'accumulated_losses',label: 'Less: Accumulated Losses (C)',      val: al, paren: true },
        { key: '_bv',               label: 'Book Value Net Worth (D = A+B−C)',  val: bv, bold: true },
        { key: 'intangible_assets', label: 'Less: Intangible Assets (E)',       val: ia, paren: true },
        { key: 'goodwill',          label: 'Less: Goodwill (F)',                val: gw, paren: true },
        { key: 'net_worth',         label: 'Tangible Net Worth (D − E − F)',    val: nw, bold: true, green: true },
      ]

    case 'adjusted_tbv':
      return [
        { key: 'share_capital',       label: 'Share Capital (A)',                   val: sc },
        { key: 'reserves_surplus',    label: 'Add: Reserves & Surplus (B)',         val: rs },
        { key: 'accumulated_losses',  label: 'Less: Accumulated Losses (C)',        val: al, paren: true },
        { key: '_bv',                 label: 'Book Value Net Worth (D = A+B−C)',    val: bv, bold: true },
        { key: 'intangible_assets',   label: 'Less: Intangible Assets (E)',         val: ia, paren: true },
        { key: 'goodwill',            label: 'Less: Goodwill (F)',                  val: gw, paren: true },
        { key: '_tnw',                label: 'Tangible Net Worth (G = D−E−F)',      val: tnw, bold: true },
        { key: 'revaluation_reserve', label: 'Less: Revaluation Reserve (H)',       val: rr, paren: true },
        { key: 'net_worth',           label: 'Adjusted TBV (G − H)',               val: nw, bold: true, green: true },
      ]

    case 'companies_act':
      return [
        { key: 'share_capital',        label: 'Paid-up Share Capital (A)',              val: sc },
        { key: 'reserves_surplus',     label: 'Add: Free Reserves & Surplus (B)',       val: rs },
        { key: 'accumulated_losses',   label: 'Less: Accumulated Losses / Deficit (C)', val: al, paren: true },
        { key: 'deferred_expenditure', label: 'Less: Deferred Expenditure (D)',         val: de, paren: true },
        { key: 'net_worth',            label: 'Net Worth [Sec. 2(57)] (A+B−C−D)',      val: nw, bold: true, green: true },
      ]

    default: // book_value, sebi_lodr, or empty
      return [
        { key: 'share_capital',      label: 'Share Capital (A)',            val: sc },
        { key: 'reserves_surplus',   label: 'Add: Reserves & Surplus (B)', val: rs },
        { key: 'accumulated_losses', label: 'Less: Accumulated Losses (C)', val: al, paren: true },
        { key: 'net_worth',          label: 'Net Worth (A + B − C)',        val: nw, bold: true, green: true },
      ]
  }
}

export function CertificatePreviewPanel({ certType, data, editorState }: Props) {
  // All values come from editorState (which was initialised from extracted + ca)
  const company = editorState.companyName || data.company_name || 'The Client'
  const fy = editorState.financialYear || data.financial_year || 'FY 2024-25'
  const certDate = editorState.certDate || new Date().toLocaleDateString('en-IN')
  const certNum = editorState.customCertNumber || '[ Auto-generated on finalise ]'

  const caName = editorState.caName || '[CA Name]'
  const caFirm = editorState.caFirmName || '[Firm Name]'
  const caMembershipNo = editorState.caMembershipNo || '[M. No.]'
  const caAddress = editorState.caAddress || '[Address]'

  const turnover = getVal('turnover', data, editorState)
  const netProfit = getVal('net_profit', data, editorState)
  const narrative = editorState.narrative

  const CERT_TITLES: Record<CertificateType, string> = {
    net_worth: 'NET WORTH CERTIFICATE',
    turnover: 'TURNOVER CERTIFICATE',
    working_capital: 'WORKING CAPITAL CERTIFICATE',
  }

  const nwRows = buildNWRows(editorState.nwMethodId || '', data, editorState)

  const renderNetWorth = () => (
    <>
      <p className="text-sm leading-relaxed mb-4 text-gray-800"
        dangerouslySetInnerHTML={{ __html: narrative.replace(/\n/g, '<br/>') }} />

      <table className="w-full border-collapse mb-4">
        <thead>
          <tr className="bg-[#1E3A5F] text-white">
            <th className="px-3 py-2 text-left text-sm font-semibold">Particulars</th>
            <th className="px-3 py-2 text-right text-sm font-semibold">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {nwRows.map(({ key, label, val, paren, bold, green }, i) => (
            <tr key={key} className={green ? 'bg-[#EAF6EF] border-t-2 border-[#1E3A5F]' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className={`${TD} ${bold ? 'font-bold' : ''}`}>
                {key.startsWith('_') ? label : getLabel(key, label, editorState)}
              </td>
              <td className={`${TD} text-right font-mono ${bold ? 'font-bold' : ''}`}>
                {val != null ? (paren && val > 0 ? `(${formatINR(val)})` : formatINR(val)) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-sm leading-relaxed text-gray-800 mb-2">
        The above Net Worth has been computed on the basis of the audited Balance Sheet
        as at the end of the above-mentioned financial year. This certificate is issued
        at the request of the client for the purpose mentioned by them.
      </p>

      {editorState.nwMethodLabel && (
        <p className="text-xs text-gray-500 italic mb-2 flex items-center gap-2">
          Net Worth computed as per: <MethodBadge label={editorState.nwMethodLabel} small />
        </p>
      )}

    </>
  )

  const renderTurnover = () => (
    <>
      <p className="text-sm leading-relaxed mb-4 text-gray-800"
        dangerouslySetInnerHTML={{ __html: narrative.replace(/\n/g, '<br/>') }} />
      <table className="w-full border-collapse mb-4">
        <thead>
          <tr className="bg-[#1E3A5F] text-white">
            <th className="px-3 py-2 text-left text-sm font-semibold">Particulars</th>
            <th className="px-3 py-2 text-right text-sm font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-white">
            <td className={TD}>{getLabel('turnover', 'Annual Turnover', editorState)}</td>
            <td className={`${TD} text-right font-mono`}>{formatINR(turnover)}</td>
          </tr>
          <tr className="bg-gray-50">
            <td className={TD}>{getLabel('net_profit', 'Net Profit / (Loss)', editorState)}</td>
            <td className={`${TD} text-right font-mono`}>{formatINR(netProfit)}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-sm leading-relaxed text-gray-800 mb-2">
        The above turnover figure is based on the audited financial statements.
        This certificate is issued at the specific request of the client.
      </p>

    </>
  )

  const renderWorkingCapital = () => {
    const ca  = getVal('current_assets',     data, editorState)
    const cl  = getVal('current_liabilities', data, editorState)
    const wc  = getVal('working_capital',    data, editorState) ?? (ca != null && cl != null ? ca - cl : null)
    const purpose = editorState.wcPurpose?.trim()

    const wcRows = [
      { key: 'current_assets',      label: getLabel('current_assets',      'Current Assets (A)',              editorState), val: ca },
      { key: 'current_liabilities', label: getLabel('current_liabilities', 'Less: Current Liabilities (B)',   editorState), val: cl, paren: true },
      { key: 'working_capital',     label: getLabel('working_capital',     'Working Capital (A \u2212 B)',    editorState), val: wc, bold: true, green: true },
    ]

    return (
      <>
        <p className="text-sm leading-relaxed mb-4 text-gray-800"
          dangerouslySetInnerHTML={{ __html: narrative.replace(/\n/g, '<br/>') }} />
        <table className="w-full border-collapse mb-4">
          <thead>
            <tr className="bg-[#1E3A5F] text-white">
              <th className="px-3 py-2 text-left text-sm font-semibold">Particulars</th>
              <th className="px-3 py-2 text-right text-sm font-semibold">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {wcRows.map(({ key, label, val, paren, bold, green }, i) => (
              <tr key={key} className={green ? 'bg-[#EAF6EF] border-t-2 border-[#1E3A5F]' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className={`${TD} ${bold ? 'font-bold' : ''}`}>{label}</td>
                <td className={`${TD} text-right font-mono ${bold ? 'font-bold' : ''}`}>
                  {val != null ? (paren && val > 0 ? `(${formatINR(val)})` : formatINR(val)) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-sm leading-relaxed text-gray-800 mb-2">
          The above Working Capital has been computed on the basis of the audited Balance Sheet
          as at the end of the above-mentioned financial year. This certificate is issued
          {purpose
            ? <> at the specific request of the client for the purpose of: <strong>{purpose}</strong>.</>
            : ' at the specific request of the client.'
          }
        </p>
      </>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Preview label */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100"
        style={{ background: 'linear-gradient(to right, #fafafa, #f4f6fb)' }}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <span className="text-[10px] text-gray-400 font-medium ml-1">LIVE PREVIEW</span>
        </div>
        <span className="text-[10px] text-gray-400">Updates as you edit</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div style={{ fontFamily: 'Times New Roman, Georgia, serif' }}>
          {/* Letterhead */}
          <div className="text-white py-2 px-4"
            style={{ background: 'linear-gradient(135deg, #0e1e32 0%, #1e3a5f 100%)' }}>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">CA</div>
              <div>
                <p className="font-bold text-sm tracking-wider text-white/90 leading-tight">{caFirm.toUpperCase()}</p>
                <p className="text-[9px] text-blue-200/70 tracking-widest leading-tight">CHARTERED ACCOUNTANTS &nbsp;|&nbsp; {caName} &nbsp;|&nbsp; M.No: {caMembershipNo}</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-4">
            {/* Cert number + date row */}
            <div className="flex justify-between items-center mb-3 text-xs text-gray-500">
              <span>Cert No: <span className="font-mono text-gray-700">{certNum}</span></span>
              <span>Date: {certDate}</span>
            </div>

            {/* Certificate title */}
            <h2 className="text-center font-bold text-[#1E3A5F] text-sm mb-1 uppercase tracking-widest">
              {CERT_TITLES[certType]}
            </h2>
            <div className="border-b-2 border-[#1E3A5F] mb-4" />

            {/* Company + FY */}
            <div className="mb-4 text-sm bg-[#F4F6FB] border border-[#CCCCCC] rounded px-3 py-2 space-y-1">
              <div className="flex gap-2 items-baseline">
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide w-28 shrink-0">Client / Company</span>
                <span className="font-semibold text-gray-800">{company}</span>
              </div>
              <div className="flex gap-2 items-baseline">
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide w-28 shrink-0">Financial Year</span>
                <span className="font-semibold text-gray-800">{fy}</span>
              </div>
            </div>

            {/* Certificate body */}
            {certType === 'net_worth' && renderNetWorth()}
            {certType === 'turnover' && renderTurnover()}
            {certType === 'working_capital' && renderWorkingCapital()}

            {/* Additional notes */}
            {editorState.additionalNotes.trim() && (
              <div className="mb-4 space-y-1">
                {editorState.additionalNotes.split('\n').filter(l => l.trim()).map((line, i) => (
                  <p key={i} className="text-sm text-gray-800 leading-relaxed">{line}</p>
                ))}
              </div>
            )}

            {/* Signature block */}
            <div className="mt-6">
              <p className="text-sm font-semibold text-gray-800">For {caFirm}</p>
              <p className="text-sm text-gray-600">Chartered Accountants</p>
              <div className="h-10 border-b border-dashed border-gray-400 w-44 my-3" />
              <p className="text-base font-bold text-gray-900">{caName}</p>
              <p className="text-xs text-gray-500">Membership No: {caMembershipNo}</p>
              <p className="text-xs text-gray-500">{caAddress}</p>
              <p className="text-xs text-gray-500 mt-1">Date: {certDate}</p>
              {editorState.udin && (
                <p className="text-sm font-bold text-gray-800 mt-2">
                  UDIN: {editorState.udin}
                </p>
              )}
            </div>

            {/* Minimal footer — no AI trail */}
            <div className="mt-5 pt-2 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-400">
                Generated by Certify Genie | Cert No: {certNum}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
