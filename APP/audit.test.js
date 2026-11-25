import assert from 'node:assert/strict'
import test from 'node:test'
import { audit, detect, marks } from './audit.js'
import { SCENARIOS } from './data.js'

test('guided scenario examples pass the required checklist without critical misses', () => {
  for (const scenario of SCENARIOS) {
    const result = audit(scenario.guided, scenario)
    assert.equal(result.critical, false, scenario.id)
    assert.equal(result.accuracy, 100, scenario.id)
  }
})

test('unsafe enalapril advice is detected and caps the overall score', () => {
  const scenario = SCENARIOS.find((item) => item.id === 'adv')
  const result = audit(scenario.generic, scenario)

  assert.equal(result.critical, true)
  assert.ok(result.unsafe.includes('Recommends ACE inhibitor in pregnancy'))
  assert.ok(result.overall < 50)
  assert.ok(result.bad.length > 0)
})

test('recommendations for unavailable imaging resources lower resource awareness', () => {
  const scenario = SCENARIOS.find((item) => item.id === 'abd')
  const result = audit(scenario.generic, scenario)

  assert.deepEqual(result.unavail, ['CT', 'ultrasound'])
  assert.equal(result.resource, 20)
})

test('scenario detection selects the strongest keyword match', () => {
  const scenario = detect('Baby is 6 days old and not feeding; neonatal emergency', SCENARIOS)
  assert.equal(scenario.id, 'neo')
})

test('unsafe phrases are returned as separate marked and plain-text parts', () => {
  assert.deepEqual(marks('Give enalapril now.', ['enalapril']), [
    'Give ',
    { bad: 'enalapril' },
    ' now.',
  ])
})
