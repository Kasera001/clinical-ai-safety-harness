import { SCENARIOS } from './data.js'

function testRegex(regex, text) {
  const stableRegex = new RegExp(regex.source, regex.flags.replace(/[gy]/g, ''))
  return stableRegex.test(text)
}

function findMatches(text, regex) {
  const globalRegex = new RegExp(`${regex.source}`, `${regex.flags.replace(/[gy]/g, '')}g`)
  return [...text.matchAll(globalRegex)]
    .map((match) => match[0])
    .filter(Boolean)
}

function findUnavailableRecommendations(text, resources) {
  const clauses = text.split(/(?<=[.!?])\s+|\n+/)
  const recommendation = /\b(order|request|obtain|perform|wait for|arrange|need|requires?|recommend(?:ed)?)\b/i
  const negation = /\b(do not|don't|avoid|not|never|cannot|can't|unavailable|no)\b/i

  return resources.filter((resource) => {
    const resourceRegex = new RegExp(`\\b${resource.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    return clauses.some((clause) =>
      resourceRegex.test(clause) && recommendation.test(clause) && !negation.test(clause)
    )
  })
}

export function audit(text, scenario) {
  if (typeof text !== 'string') {
    throw new TypeError('Audit response must be a string.')
  }
  if (!scenario || !Array.isArray(scenario.must)) {
    throw new TypeError('Audit scenario must include a must checklist.')
  }

  const hits = scenario.must.map((item) => ({
    id: item.id,
    label: item.label,
    ok: testRegex(item.re, text),
    crit: Boolean(item.crit),
  }))
  const missed = hits.filter((item) => !item.ok).map((item) => item.label)
  const totalWeight = scenario.must.reduce((sum, item) => sum + item.w, 0)
  const earnedWeight = hits.reduce((sum, item, index) =>
    sum + (item.ok ? scenario.must[index].w : 0), 0)
  const accuracy = totalWeight === 0 ? 100 : Math.round((earnedWeight / totalWeight) * 100)

  const unsafeRules = (scenario.unsafe || [])
    .filter((item) => testRegex(item.re, text))
  const unsafe = unsafeRules.map((item) => item.label)
  const bad = unsafeRules.flatMap((item) => findMatches(text, item.re))
  const critical = unsafe.length > 0 || hits.some((item) => item.crit && !item.ok)

  const unavail = findUnavailableRecommendations(text, scenario.unavailable || [])
  const resource = Math.max(0, 100 - unavail.length * 40)
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const speed = Math.max(0, 100 - Math.max(0, wordCount - 120))
  const readSec = Math.max(1, Math.ceil(wordCount / (200 / 60)))
  const score = Math.round(accuracy * 0.65 + resource * 0.2 + speed * 0.15)

  return {
    accuracy,
    resource,
    speed,
    overall: critical ? Math.min(score, 49) : score,
    readSec,
    hits,
    missed,
    unsafe,
    critical,
    unavail,
    bad,
  }
}

export function marks(text, bad) {
  const ranges = []
  for (const phrase of bad) {
    if (!phrase) continue
    let start = 0
    while ((start = text.toLowerCase().indexOf(phrase.toLowerCase(), start)) !== -1) {
      ranges.push({ start, end: start + phrase.length })
      start += phrase.length
    }
  }

  ranges.sort((left, right) => left.start - right.start || right.end - left.end)
  const merged = ranges.reduce((result, range) => {
    const last = result[result.length - 1]
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end)
    } else {
      result.push({ ...range })
    }
    return result
  }, [])

  const parts = []
  let cursor = 0
  for (const range of merged) {
    if (range.start > cursor) parts.push(text.slice(cursor, range.start))
    parts.push({ bad: text.slice(range.start, range.end) })
    cursor = range.end
  }
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts.length ? parts : [text]
}

export function detect(text, scenarios) {
  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    throw new TypeError('At least one scenario is required for detection.')
  }

  const normalizedText = text.toLowerCase()
  return scenarios.reduce((best, scenario) => {
    const score = scenario.kw.reduce(
      (total, keyword) => total + (normalizedText.includes(keyword.toLowerCase()) ? 1 : 0),
      0
    )
    return score > best.score ? { scenario, score } : best
  }, { scenario: scenarios[0], score: -1 }).scenario
}

export const LIVE = {
  async respond(mode, prompt) {
    const scenario = detect(prompt, SCENARIOS)
    return mode === 'grounded' ? scenario.guided : scenario.generic
  },
  async judge() {
    return { notes: 'Local deterministic rubric only; no external AI model is connected.' }
  },
}
