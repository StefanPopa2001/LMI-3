"use client"
import React, { useState } from 'react'
import { sendTestEmail } from '../services/emailService'

/*
  FA & FO Playground Page
  (Fuck Around & Find Out) – internal test ground.
  Use this page to spike UI components, quick API probes, theming experiments, etc.
  IMPORTANT: Do not rely on persistent state here; treat as ephemeral.
*/

interface LogEntry { ts: number; message: string }

export default function FAFOView() {
  const [counter, setCounter] = useState(0)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [expr, setExpr] = useState('1 + 2 * 3')
  const [result, setResult] = useState<string>('')

  // Email form state
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('Test from FA & FO')
  const [emailBody, setEmailBody] = useState('Hello from the experimental playground!')
  const [emailSending, setEmailSending] = useState(false)
  const [emailResponse, setEmailResponse] = useState<any>(null)

  const addLog = (message: string) => setLogs(l => [{ ts: Date.now(), message }, ...l].slice(0, 50))

  const evaluate = () => {
    try {
      // Extremely unsafe on purpose for a sandbox; DON'T promote to prod features
      // eslint-disable-next-line no-eval
      const r = eval(expr)
      setResult(String(r))
      addLog(`Evaluated: ${expr} => ${r}`)
    } catch (e: any) {
      setResult(e.message)
      addLog(`Error: ${e.message}`)
    }
  }

  const sendEmail = async () => {
    setEmailSending(true)
    setEmailResponse(null)
    try {
      const res = await sendTestEmail({ to: emailTo, subject: emailSubject, text: emailBody })
      setEmailResponse(res)
      if (res.error) addLog(`Email error: ${res.error}`); else addLog(`Email sent id=${res.id}`)
    } catch (e: any) {
      setEmailResponse({ error: e.message })
      addLog(`Email exception: ${e.message}`)
    } finally {
      setEmailSending(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom right, var(--color-bg-secondary), var(--color-bg-primary))' }}>
      <div className="max-w-7xl mx-auto px-6 py-8 pt-24 space-y-10">
        <header>
          <h1 className="text-5xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>FA & FO Playground</h1>
          <p className="opacity-80" style={{ color: 'var(--color-text-secondary)' }}>Spike ideas, prototype quickly, then move stable concepts into real modules.</p>
        </header>

        {/* Email Sender */}
        <section className="p-6 rounded-xl border space-y-4" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Send Test Email</h2>
          <div className="grid gap-4 max-w-2xl">
            <input
              className="px-4 py-2 rounded bg-transparent border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              placeholder="Recipient (to)"
              value={emailTo}
              onChange={e => setEmailTo(e.target.value)}
              type="email"
            />
            <input
              className="px-4 py-2 rounded bg-transparent border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              placeholder="Subject"
              value={emailSubject}
              onChange={e => setEmailSubject(e.target.value)}
            />
            <textarea
              className="px-4 py-2 rounded bg-transparent border h-40 resize-vertical"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              placeholder="Body"
              value={emailBody}
              onChange={e => setEmailBody(e.target.value)}
            />
            <div className="flex gap-3 items-center">
              <button
                disabled={emailSending || !emailTo}
                onClick={sendEmail}
                className={`px-6 py-2 rounded text-white ${emailSending ? 'bg-gray-500' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {emailSending ? 'Sending...' : 'Send Email'}
              </button>
              {emailResponse && (
                <span className="text-sm" style={{ color: emailResponse.error ? 'var(--color-accentuation-red)' : 'var(--color-accentuation-green)' }}>
                  {emailResponse.error ? `Error: ${emailResponse.error}` : `Sent: ${emailResponse.id || 'ok'}`}
                  {emailResponse.previewUrl && (
                    <>
                      {' '}- <a className="underline" href={emailResponse.previewUrl} target="_blank" rel="noreferrer">Preview</a>
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
          <p className="text-xs opacity-60" style={{ color: 'var(--color-text-secondary)' }}>
            If no SMTP env vars configured, an ephemeral Ethereal test account is used and a preview URL is returned.
          </p>
        </section>

        {/* Counter Sandbox */}
        <section className="p-6 rounded-xl border" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Quick Counter</h2>
          <div className="flex items-center gap-4">
            <button className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white" onClick={() => { setCounter(c => c - 1); addLog('counter--') }}>-</button>
            <span className="text-3xl font-mono" style={{ color: 'var(--color-accentuation-cyan)' }}>{counter}</span>
            <button className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white" onClick={() => { setCounter(c => c + 1); addLog('counter++') }}>+</button>
            <button className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700 text-white" onClick={() => { setCounter(0); addLog('counter reset') }}>reset</button>
          </div>
        </section>

        {/* Expression Evaluator */}
        <section className="p-6 rounded-xl border space-y-4" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Expression Evaluator (unsafe)</h2>
          <div className="flex flex-col gap-3 max-w-xl">
            <input
              className="px-4 py-2 rounded bg-transparent border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              value={expr}
              onChange={e => setExpr(e.target.value)}
              placeholder="Enter JS expression"
            />
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white" onClick={evaluate}>Eval</button>
              <button className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700 text-white" onClick={() => { setExpr(''); setResult(''); addLog('cleared expression') }}>Clear</button>
            </div>
            <div className="text-sm font-mono p-2 rounded bg-black/30" style={{ color: 'var(--color-text-primary)' }}>Result: {result || '—'}</div>
          </div>
        </section>

        {/* Log Area */}
        <section className="p-6 rounded-xl border" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Recent Actions</h2>
            <ul className="space-y-1 max-h-64 overflow-auto text-sm font-mono">
              {logs.map(l => (
                <li key={l.ts} className="opacity-90" style={{ color: 'var(--color-text-secondary)' }}>{new Date(l.ts).toLocaleTimeString()} — {l.message}</li>
              ))}
              {logs.length === 0 && <li className="opacity-50" style={{ color: 'var(--color-text-secondary)' }}>No logs yet. Try the counter or evaluator.</li>}
            </ul>
        </section>
      </div>
    </div>
  )
}
