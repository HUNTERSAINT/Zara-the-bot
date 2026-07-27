/**
 * Simple structured logger utility
 * Timestamps every log line and prefixes with level.
 */

const levels = { info: '✅', warn: '⚠️ ', error: '❌', debug: '🔍' };

function format(level, ...args) {
  const ts = new Date().toISOString();
  const icon = levels[level] || '  ';
  return `[${ts}] ${icon} ${args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : a)).join(' ')}`;
}

const logger = {
  info:  (...args) => console.log(format('info',  ...args)),
  warn:  (...args) => console.warn(format('warn',  ...args)),
  error: (...args) => console.error(format('error', ...args)),
  debug: (...args) => { if (process.env.DEBUG) console.log(format('debug', ...args)); },
};

module.exports = logger;
