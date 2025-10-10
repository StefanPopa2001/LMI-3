const winston = require('winston');
const path = require('path');

function createLogger(logBase, backendLogDir) {
  const backendLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [
      new winston.transports.File({ filename: path.join(backendLogDir, 'error.log'), level: 'error' }),
      new winston.transports.File({ filename: path.join(backendLogDir, 'general.log') })
    ]
  });

  if (process.env.NODE_ENV !== 'production') {
    backendLogger.add(new winston.transports.Console({ format: winston.format.simple() }));
  }

  // Wrap console.* to also log
  const origConsoleError = console.error;
  console.error = (...args) => { backendLogger.error(args.map(a=> (a instanceof Error ? a.stack : a)).join(' ')); origConsoleError(...args); };
  const origConsoleLog = console.log;
  console.log = (...args) => { backendLogger.info(args.join(' ')); origConsoleLog(...args); };

  return backendLogger;
}

module.exports = { createLogger };