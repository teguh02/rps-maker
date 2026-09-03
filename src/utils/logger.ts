type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'

type LogModule = 'APP' | 'EDITOR' | 'AI' | 'EXPORT' | 'IPC' | 'FS'

interface LogEntry {
  timestamp: string
  level: LogLevel
  module: LogModule
  message: string
  data?: Record<string, unknown>
}

function getTimestamp(): string {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function formatData(data?: Record<string, unknown>): string {
  if (!data || Object.keys(data).length === 0) return ''
  return ' ' + JSON.stringify(data)
}

function log(level: LogLevel, module: LogModule, message: string, data?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: getTimestamp(),
    level,
    module,
    message,
    data,
  }

  const prefix = `[${entry.timestamp}] [${level}] [${module}]`
  const suffix = formatData(data)

  switch (level) {
    case 'ERROR':
      console.error(`${prefix} ${message}${suffix}`)
      break
    case 'WARN':
      console.warn(`${prefix} ${message}${suffix}`)
      break
    case 'DEBUG':
      console.debug(`${prefix} ${message}${suffix}`)
      break
    default:
      console.log(`${prefix} ${message}${suffix}`)
  }

  return entry
}

export const logger = {
  info: (module: LogModule, message: string, data?: Record<string, unknown>) =>
    log('INFO', module, message, data),

  warn: (module: LogModule, message: string, data?: Record<string, unknown>) =>
    log('WARN', module, message, data),

  error: (module: LogModule, message: string, data?: Record<string, unknown>) =>
    log('ERROR', module, message, data),

  debug: (module: LogModule, message: string, data?: Record<string, unknown>) =>
    log('DEBUG', module, message, data),
}

export type { LogLevel, LogModule }
