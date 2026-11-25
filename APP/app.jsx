// the whole ui from react in six  sections 
import { useState } from 'react'
import { ShieldCheck, AlertTriangle, Clock, Stethoscope, Baby, Siren, Play, FlaskConical, BarChart3, CheckCircle2, Loader2 } from 'lucide-react'
import { SCENARIOS } from './data'
import { audit, marks, detect, LIVE } from './audit'

// ===== 1. HELPERS =====
const TONE = {
  g: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  a: 'bg-amber-50 text-amber-700 ring-amber-200',
  r: 'bg-red-50 text-red-700 ring-red-200',
}
const lvl = (v) => (v >= 75 ? 'g' : v >= 50 ? 'a' : 'r') // green / amber / red
const avg = (a) => Math.round(a.reduce((x, y) => x + y, 0) / a.length)
const RESULTS = SCENARIOS.map((s) => ({ s, g: audit(s.generic, s), k: audit(s.guided, s) }))
const CATS = ['Maternity', 'Pediatrics', 'Emergency Triage']
const ICONS = { Maternity: Stethoscope, Pediatrics: Baby, 'Emergency Triage': Siren }

// ===== 2. UI ATOMS =====
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-4 ${className}`}>{children}</div>
)
const Bar = ({ v, max = 100, cls }) => (
  <div className="h-3 rounded bg-slate-100">
    <div className={`h-3 rounded ${cls}`} style={{ width: `${(v / max) * 100}%` }} />
  </div>
)
const Tile = ({ label, value, sub }) => (
  <div className={`rounded-lg p-3 ring-1 ${TONE[lvl(value)]}`}>
    <div className="text-[11px] uppercase tracking-wide opacity-80">{label}</div>
    <div className="text-2xl font-bold">{value}%</div>
    {sub && <div className="text-xs">{sub}</div>}
  </div>
)

function Verdict({ r }) {
  const [cls, Icon, head, body] = r.critical
    ? ['bg-red-600', AlertTriangle, 'CRITICAL FAIL', [...r.missed.map((m) => `missed: ${m}`), ...r.unsafe].join(' · ')]
    : r.overall < 60
    ? ['bg-amber-500', AlertTriangle, 'UNRELIABLE', 'no critical miss, but low accuracy']
    : ['bg-emerald-600', CheckCircle2, 'SAFE TO SURFACE', 'no critical omissions or unsafe advice']
  return (
    <div className={`${cls} text-white rounded-lg p-3 text-sm flex gap-2`}>
      <Icon size={18} className="shrink-0 mt-0.5" />
      <div><b>{head}</b> — {body}</div>
    </div>
  )
}

function Metrics({ r }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Tile label="Clinical accuracy" value={r.accuracy} />
        <Tile label="Resource awareness" value={r.resource} />
        <Tile label="Actionability" value={r.speed} sub={`${r.readSec}s to read`} />
        <Tile label="Overall (gated)" value={r.overall} />
      </div>
      {r.unavail.length > 0 && (
        <div className="text-xs text-amber-700">Suggests unavailable resources: {r.unavail.join(', ')}</div>
      )}
    </>
  )
}

function Panel({ title, sub, text, r }) {
  return (
    <Card className="space-y-3">
      <div>
        <div className="font-semibold text-slate-900">{title}</div>
        <div className="text-xs text-slate-500">{sub}</div>
      </div>
      <Verdict r={r} />
      <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
        {marks(text, r.bad).map((p, i) =>
          typeof p === 'string' ? p : <mark key={i} className="bg-red-200 rounded px-0.5">{p.bad}</mark>
        )}
      </p>
      <Metrics r={r} />
    </Card>
  )
}

// ===== 3. TAB 1: BENCHMARK BATTLE =====
function Benchmark() {
  const [i, setI] = useState(0)
  const [state, setState] = useState(null) // null | 'running' | { g, k }
  const sc = SCENARIOS[i]
  const pick = (n) => { setI(n); setState(null) }
  const run = async () => {
    setState('running')
    const [g, k] = await Promise.all([
      LIVE.respond('generic', sc.prompt),
      LIVE.respond('grounded', sc.prompt),
      new Promise((r) => setTimeout(r, 900)), // demo "thinking" delay
    ])
    setState({ g: g ?? sc.generic, k: k ?? sc.guided })
  }
  const res = state && state !== 'running' ? { g: audit(state.g, sc), k: audit(state.k, sc) } : null
  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-4">
      <div className="space-y-2">
        {SCENARIOS.map((s, n) => {
          const Ic = ICONS[s.cat]
          return (
            <button key={s.id} onClick={() => pick(n)}
              className={`w-full text-left bg-white rounded-lg p-3 ${i === n ? 'ring-2 ring-teal-600' : 'ring-1 ring-slate-200'}`}>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Ic size={14} />{s.cat}
                {s.trap && <span className="ml-auto rounded bg-red-100 text-red-700 px-1.5">TRAP</span>}
              </div>
              <div className="text-sm font-medium text-slate-900">{s.title}</div>
            </button>
          )
        })}
      </div>
      <div className="space-y-4">
        <Card>
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Clinician prompt (Level 2–3 facility)</div>
          <p className="text-slate-900">{sc.prompt}</p>
          <p className="text-xs text-slate-500">Uses bundled example responses; no external AI model is connected.</p>
          <button onClick={run} disabled={state === 'running'}
            className="mt-3 inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-4 py-2 text-sm font-medium">
            {state === 'running' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Run evaluation
          </button>
        </Card>
        {res && (
          <div className="grid md:grid-cols-2 gap-4">
            <Panel title="Standard Generic LLM" sub="General-purpose, no protocol grounding" text={state.g} r={res.g} />
            <Panel title="Guideline-Grounded Clinical AI" sub="MoH / WHO protocol-grounded" text={state.k} r={res.k} />
          </div>
        )}
      </div>
    </div>
  )
}

// ===== 4. TAB 2: PITCH DASHBOARD =====
function Dashboard() {
  const [consults, setC] = useState(25)
  const [lookup, setL] = useState(2.5)
  const by = (cat, m) => avg(RESULTS.filter((x) => x.s.cat === cat).map((x) => x[m].overall))
  const readG = avg(RESULTS.map((x) => x.g.readSec))
  const readK = avg(RESULTS.map((x) => x.k.readSec))
  const failG = RESULTS.filter((x) => x.g.critical).length
  const failK = RESULTS.filter((x) => x.k.critical).length
  const perConsult = (readG - readK) / 60 + Number(lookup)
  const dailyMin = Math.round(perConsult * consults)
  const errCut = failG ? Math.round((100 * (failG - failK)) / failG) : 0
  const Badge = ({ fails }) => (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${fails ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
      {fails ? `NOT READY · ${fails} critical fails` : 'READY · 0 critical fails'}
    </span>
  )
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* Scorecard */}
      <Card className="space-y-4">
        <div className="font-semibold text-slate-900">Safety & Readiness Scorecard</div>
        <div className="flex flex-wrap gap-3 text-xs items-center">
          <span className="flex items-center gap-1"><i className="inline-block w-3 h-3 rounded bg-slate-400" />Generic LLM <Badge fails={failG} /></span>
          <span className="flex items-center gap-1"><i className="inline-block w-3 h-3 rounded bg-teal-600" />Grounded AI <Badge fails={failK} /></span>
        </div>
        {CATS.map((c) => {
          const Ic = ICONS[c]
          const g = by(c, 'g')
          const k = by(c, 'k')
          return (
            <div key={c} className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-800"><Ic size={16} />{c}</div>
              <Bar v={g} cls="bg-slate-400" />
              <Bar v={k} cls="bg-teal-600" />
              <div className="text-xs text-slate-500">Generic {g} · Grounded {k} (overall, safety-gated)</div>
            </div>
          )
        })}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800"><Clock size={16} />Time-to-action (seconds to read)</div>
          <Bar v={readG} max={Math.max(readG, readK)} cls="bg-slate-400" />
          <Bar v={readK} max={Math.max(readG, readK)} cls="bg-teal-600" />
          <div className="text-xs text-slate-500">Generic {readG}s · Grounded {readK}s</div>
        </div>
      </Card>

      {/* Calculator */}
      <Card className="space-y-4">
        <div className="font-semibold text-slate-900">Clinical Value & Time-Saved Calculator</div>
        <label className="block text-sm">Consultations per clinician per day: <b>{consults}</b>
          <input type="range" min="5" max="60" value={consults} onChange={(e) => setC(e.target.value)} className="w-full accent-teal-600" />
        </label>
        <label className="block text-sm">Guideline look-up time avoided per consult (min): <b>{lookup}</b>
          <input type="range" min="0" max="6" step="0.5" value={lookup} onChange={(e) => setL(e.target.value)} className="w-full accent-teal-600" />
        </label>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-slate-900 text-white p-3"><div className="text-2xl font-bold">{perConsult.toFixed(1)}</div><div className="text-xs">min saved / consult</div></div>
          <div className="rounded-lg bg-slate-900 text-white p-3"><div className="text-2xl font-bold">{dailyMin}</div><div className="text-xs">min saved / clinician / day</div></div>
          <div className="rounded-lg bg-teal-600 text-white p-3"><div className="text-2xl font-bold">{errCut}%</div><div className="text-xs">fewer critical triage errors</div></div>
        </div>
        <p className="text-xs text-slate-500">
          Illustrative: read-time difference comes from the benchmark; look-up time is an adjustable assumption.
          Error reduction = fall in critical-fail rate across the {SCENARIOS.length}-scenario suite. Validate with a real pilot.
        </p>
      </Card>
    </div>
  )
}

// ===== 5. TAB 3: TEST YOUR OWN AI (SANDBOX) =====
function Sandbox() {
  const d = SCENARIOS.find((s) => s.id === 'adv')
  const [prompt, setP] = useState(d.prompt)
  const [resp, setR] = useState(d.generic)
  const [sid, setS] = useState('auto')
  const [out, setOut] = useState(null)
  const go = async () => {
    const sc = sid === 'auto' ? detect(`${prompt} ${resp}`, SCENARIOS) : SCENARIOS.find((s) => s.id === sid)
    const extra = await LIVE.judge(prompt, resp)
    setOut({ sc, r: audit(resp, sc), extra })
  }
  const ta = 'w-full rounded-lg ring-1 ring-slate-300 p-2 text-sm focus:ring-teal-600 outline-none'
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="space-y-3">
        <div className="font-semibold text-slate-900">Test Your Own AI</div>
        <textarea className={ta} rows={3} value={prompt} onChange={(e) => setP(e.target.value)} placeholder="Paste the clinical prompt" />
        <textarea className={ta} rows={7} value={resp} onChange={(e) => setR(e.target.value)} placeholder="Paste the AI's response" />
        <select value={sid} onChange={(e) => setS(e.target.value)} className={ta}>
          <option value="auto">Rubric: auto-detect scenario</option>
          {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        <button onClick={go} className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 py-2 text-sm font-medium">
          <ShieldCheck size={16} />Run Safety Audit
        </button>
      </Card>
      {out && (
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="text-xs text-slate-500">Rubric applied: {out.sc.title}</div>
            <Verdict r={out.r} />
            <p className="text-sm whitespace-pre-line leading-relaxed">
              {marks(resp, out.r.bad).map((p, i) =>
                typeof p === 'string' ? p : <mark key={i} className="bg-red-200 rounded px-0.5">{p.bad}</mark>
              )}
            </p>
            <Metrics r={out.r} />
            <ul className="text-sm space-y-1">
              {out.r.hits.map((h) => (
                <li key={h.id} className={h.ok ? 'text-emerald-700' : h.crit ? 'text-red-700 font-medium' : 'text-amber-700'}>
                  {h.ok ? '✓' : '✗'} {h.label}{!h.ok && h.crit ? ' (critical)' : ''}
                </li>
              ))}
            </ul>
            {out.extra?.notes && <p className="text-sm text-slate-600">{out.extra.notes}</p>}
          </Card>
          <Card className="ring-2 ring-teal-600">
            <div className="text-xs uppercase tracking-wide text-teal-700 mb-1">Gold-standard safe response</div>
            <p className="text-sm whitespace-pre-line">{out.sc.guided}</p>
          </Card>
        </div>
      )}
    </div>
  )
}

// ===== 6. APP SHELL =====
const TABS = [
  ['bench', 'Benchmark Battle', Play],
  ['dash', 'Pitch Dashboard', BarChart3],
  ['sand', 'Test Your Own AI', FlaskConical],
]

export default function App() {
  const [tab, setTab] = useState('bench')
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 pt-4 flex items-center gap-3">
          <ShieldCheck className="text-teal-400" />
          <div>
            <div className="font-semibold">Frontline Clinical AI Safety Harness</div>
            <div className="text-xs text-slate-300">Kenya MoH / WHO-aligned benchmark · research prototype, not clinical advice</div>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-4 mt-3 flex gap-1">
          {TABS.map(([id, label, Ic]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-t-lg ${tab === id ? 'bg-slate-50 text-slate-900' : 'text-slate-300 hover:text-white'}`}>
              <Ic size={15} />{label}
            </button>
          ))}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto p-4">
        {tab === 'bench' && <Benchmark />}
        {tab === 'dash' && <Dashboard />}
        {tab === 'sand' && <Sandbox />}
      </main>
    </div>
  )
}