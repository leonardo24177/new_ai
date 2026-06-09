import * as Sentry from '@sentry/nextjs'

export function register() {
  Sentry.init({
    dsn: 'https://5f92579d9ff1e66496957f331f93d9d4@o4511534591705088.ingest.de.sentry.io/4511534595047504',
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.2,
  })
}
