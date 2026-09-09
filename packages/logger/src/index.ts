import pino, { type Logger, type LoggerOptions } from 'pino';
import type { BirKareConfig } from '@birkare/config';

const redact: LoggerOptions['redact'] = {
  paths: [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.body.password',
    'req.body.refreshToken',
    'req.body.token',
    'req.body.idToken',
    'OPENAI_API_KEY',
    'openaiApiKey',
    'config.OPENAI_API_KEY',
    'config.openaiApiKey',
    'refreshToken',
    'password',
    'token',
    'authorization',
  ],
  censor: '[REDACTED]',
};

export function createLogger(
  config: Pick<BirKareConfig, 'LOG_LEVEL' | 'NODE_ENV' | 'APP_NAME'>,
): Logger {
  return pino({
    name: config.APP_NAME,
    level: config.LOG_LEVEL,
    redact,
    base: { environment: config.NODE_ENV, service: 'api' },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
  });
}

export { type Logger };
