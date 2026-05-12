let passed = 0
let failed = 0
let suiteName = ''

function createSuite(name) {
  suiteName = name
  passed = 0
  failed = 0
  console.log(`\n========== ${name} ==========`)
}

function assertEqual(actual, expected, msg) {
  const ok = actual === expected
  if (ok) {
    passed++
    console.log(`  ✓ ${msg}`)
  } else {
    failed++
    console.log(`  ✗ ${msg}`)
    console.log(`    Expected: ${JSON.stringify(expected)}`)
    console.log(`    Actual:   ${JSON.stringify(actual)}`)
  }
}

function assertTrue(value, msg) {
  assertEqual(Boolean(value), true, msg)
}

function assertFalse(value, msg) {
  assertEqual(Boolean(value), false, msg)
}

function assertNotNull(value, msg) {
  const ok = value !== null && value !== undefined
  if (ok) {
    passed++
    console.log(`  ✓ ${msg}`)
  } else {
    failed++
    console.log(`  ✗ ${msg} (got null/undefined)`)
  }
}

function assertArrayLength(arr, expected, msg) {
  assertEqual(arr ? arr.length : 0, expected, msg)
}

function assertThrows(fn, msg) {
  let threw = false
  try {
    fn()
  } catch (e) {
    threw = true
  }
  assertTrue(threw, msg)
}

function getResults() {
  const total = passed + failed
  console.log(`\n========== Results: ${suiteName} ==========`)
  console.log(`  Passed: ${passed}/${total}`)
  if (failed > 0) {
    console.log(`  Failed: ${failed}/${total}`)
  }
  return { suiteName, passed, failed, total }
}

module.exports = {
  createSuite,
  assertEqual,
  assertTrue,
  assertFalse,
  assertNotNull,
  assertArrayLength,
  assertThrows,
  getResults
}