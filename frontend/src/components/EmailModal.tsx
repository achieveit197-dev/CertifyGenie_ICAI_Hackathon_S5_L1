/**
 * EmailModal — Compose and send a certificate email.
 * Two modes:
 *   1. "Send via Server" — calls backend SMTP (requires EMAIL_USER/EMAIL_PASSWORD in .env)
 *   2. "Open in Mail App" — mailto: fallback, CA attaches PDF manually
 */
import { useState } from 'react'
import { X, Mail, Edit3, AlertTriangle, Paperclip, Send, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CertificateType } from '../types'
import { sendCertificateEmail } from '../api/client'

interface Props {
  open: boolean
  onClose: () => void
  certId: string
  certNumber: string
  certType: CertificateType
  companyName: string
  financialYear: string
  caName: string
  caFirmName: string
  caMembershipNo: string
  caAddress: string
  nwMethodLabel?: string
  keyFigure?: { label: string; amount: string }
}

function buildDefaultBody(p: Props): string {
  const typeName = p.certType === 'net_worth' ? 'Net Worth Certificate' : 'Turnover Certificate'
  return `Dear Sir / Madam,

We are pleased to share the ${typeName} for ${p.companyName} for the financial year ${p.financialYear}.

Certificate Details:
• Certificate Number : ${p.certNumber}
• Company            : ${p.companyName}
• Financial Year     : ${p.financialYear}${p.keyFigure ? `\n• ${p.keyFigure.label.padEnd(20)}: ${p.keyFigure.amount}` : ''}${p.nwMethodLabel ? `\n• Computation Method : ${p.nwMethodLabel}` : ''}

⚠ IMPORTANT — DRAFT VERSION:
This certificate is an AI-generated DRAFT and is NOT valid for official use in its current form. The certificate MUST be manually reviewed and signed by the issuing Chartered Accountant before submission to any authority.

Next Steps:
1. Please verify all figures against your financial records.
2. The signed copy will be shared separately once the CA has physically / digitally signed the document.
3. The UDIN for this certificate must be registered on the ICAI UDIN portal (https://udin.icai.org).

Should you have any questions or require corrections, please contact us immediately.

Warm regards,
${p.caName}
${p.caFirmName}
Chartered Accountants
Membership No: ${p.caMembershipNo}
${p.caAddress}`
}

function buildDefaultSubject(p: Props): string {
  const typeName = p.certType === 'net_worth' ? 'Net Worth Certificate' : 'Turnover Certificate'
  return `[DRAFT] ${typeName} — ${p.companyName} — ${p.financialYear} | ${p.certNumber}`
}

type SendStatus = 'idle' | 'sending' | 'sent' | 'error'

export function EmailModal(props: Props) {
  const { open, onClose } = props
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState(() => buildDefaultSubject(props))
  const [body, setBody]   = useState(() => buildDefaultBody(props))
  const [emailError, setEmailError] = useState('')
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle')
  const [serverError, setServerError] = useState('')

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  const handleSendViaServer = async () => {
    if (!validateEmail(email)) { setEmailError('Please enter a valid email address.'); return }
    setEmailError('')
    setSendStatus('sending')
    setServerError('')
    try {
      await sendCertificateEmail(props.certId, {
        recipient_email: email,
        subject,
        body,
      })
      setSendStatus('sent')
    } catch (err) {
      setSendStatus('error')
      setServerError(err instanceof Error ? err.message : 'Failed to send email.')
    }
  }

  const handleClose = () => {
    setEmail('')
    setSubject(buildDefaultSubject(props))
    setBody(buildDefaultBody(props))
    setEmailError('')
    setSendStatus('idle')
    setServerError('')
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(10,22,40,0.75)', backdropFilter: 'blur(10px)' }}
          onClick={e => e.target === e.currentTarget && handleClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.22 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"
              style={{ background: 'linear-gradient(to right, #f8fafc, #f0f4fb)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-navy-50 border border-navy-100 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-navy-600" />
                </div>
                <div>
                  <h2 className="font-bold text-navy-900 text-base">Send to Client</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Certificate PDF is automatically attached and delivered</p>
                </div>
              </div>
              <button onClick={handleClose}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col">

              {/* Sent confirmation */}
              {sendStatus === 'sent' && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-6 mt-4 flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    <strong>Email sent successfully!</strong> The certificate PDF has been delivered to <strong>{email}</strong>.
                  </p>
                </motion.div>
              )}

              {/* Server error */}
              {sendStatus === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-6 mt-4 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-700 leading-relaxed">
                    <strong>Send failed:</strong> {serverError}
                    {serverError.includes('credentials') && (
                      <p className="mt-1">Add <code className="bg-red-100 px-1 rounded">EMAIL_USER</code> and <code className="bg-red-100 px-1 rounded">EMAIL_PASSWORD</code> to <code className="bg-red-100 px-1 rounded">backend/.env</code>, then restart the server.</p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* How it works notice */}
              {sendStatus === 'idle' && (
                <div className="mx-6 mt-4 flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <Send className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    The certificate PDF will be automatically attached and sent directly to the client's inbox.
                  </p>
                </div>
              )}

              {/* Draft warning */}
              <div className="mx-6 mt-3 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  The body already states this is a <strong>DRAFT</strong> — the certificate must be manually signed by {props.caName} before official use.
                </p>
              </div>

              <div className="px-6 py-4 space-y-4 flex-1">
                {/* Recipient */}
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                    Client Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setEmailError('') }}
                    placeholder="client@example.com"
                    className="input-field"
                    disabled={sendStatus === 'sending'}
                  />
                  {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                    Subject <Edit3 className="inline w-3 h-3 mb-0.5 text-gray-400" />
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="input-field font-medium"
                    disabled={sendStatus === 'sending'}
                  />
                </div>

                {/* Body */}
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                    Email Body <Edit3 className="inline w-3 h-3 mb-0.5 text-gray-400" />
                    <span className="normal-case text-gray-400 ml-1">(editable)</span>
                  </label>
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={14}
                    className="input-field font-mono text-xs resize-none leading-relaxed"
                    disabled={sendStatus === 'sending'}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
                <p className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  {sendStatus === 'sent' ? 'PDF attached and sent automatically.' : 'PDF auto-attached when sent via server'}
                </p>
                <div className="flex gap-2">
                  <button onClick={handleClose} className="btn-ghost text-sm">
                    {sendStatus === 'sent' ? 'Done' : 'Cancel'}
                  </button>
                  {sendStatus !== 'sent' && (
                    <>
                      <button
                        onClick={handleSendViaServer}
                        disabled={sendStatus === 'sending'}
                        className="btn-accent text-sm"
                      >
                        {sendStatus === 'sending' ? (
                          <><Loader className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                        ) : (
                          <><Send className="w-3.5 h-3.5" /> Send via Server</>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
