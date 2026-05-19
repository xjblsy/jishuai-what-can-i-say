const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 }
const CURRENT_LEVEL = LOG_LEVELS.DEBUG

const logs = []

function log(level, module, message, data) {
  if (level < CURRENT_LEVEL) return

  const entry = {
    time: new Date().toISOString(),
    level: Object.keys(LOG_LEVELS).find(k => LOG_LEVELS[k] === level) || 'UNKNOWN',
    module,
    message,
    data: data ? (typeof data === 'object' ? JSON.stringify(data).substring(0, 200) : String(data).substring(0, 200)) : undefined
  }

  logs.unshift(entry)
  if (logs.length > 200) logs.pop()

  if (level >= LOG_LEVELS.ERROR) {
    console.error(`[${entry.level}][${module}]`, message, data || '')
  } else if (level >= LOG_LEVELS.WARN) {
    console.warn(`[${entry.level}][${module}]`, message, data || '')
  }
}

function handleError(error, context) {
  const module = context || 'unknown'
  const msg = error && error.message ? error.message : String(error)

  log(LOG_LEVELS.ERROR, module, msg, { stack: error && error.stack ? error.stack.substring(0, 300) : undefined })

  return { message: msg, handled: true }
}

function tryCatch(fn, context) {
  return function (...args) {
    try {
      return fn.apply(this, args)
    } catch (e) {
      handleError(e, context)
      return null
    }
  }
}

function tryCatchAsync(fn, context) {
  return async function (...args) {
    try {
      return await fn.apply(this, args)
    } catch (e) {
      handleError(e, context)
      return null
    }
  }
}

function safeNavigate(url, type = 'navigateTo') {
  try {
    const pages = getCurrentPages()
    if (pages.length >= 10 && type === 'navigateTo') {
      wx.redirectTo({ url })
      return
    }

    switch (type) {
      case 'navigateTo': wx.navigateTo({ url }); break
      case 'redirectTo': wx.redirectTo({ url }); break
      case 'reLaunch': wx.reLaunch({ url }); break
      case 'switchTab': wx.switchTab({ url }); break
      case 'navigateBack': wx.navigateBack(); break
    }
  } catch (e) {
    log(LOG_LEVELS.ERROR, 'navigation', `Navigate failed: ${url}`, e.message)
  }
}

function getLogs() {
  return [...logs]
}

function clearLogs() {
  logs.length = 0
}

module.exports = {
  LOG_LEVELS,
  log,
  handleError,
  tryCatch,
  tryCatchAsync,
  safeNavigate,
  getLogs,
  clearLogs
}