# BirKare Portainer stack: Cloud SQL Auth Proxy + automatic Prisma migration.
# Set the variables in Portainer before deploying this stack.
name: birkare-production

x-backend-environment: &backend-environment
  NODE_ENV: ${NODE_ENV:-production}
  APP_NAME: BirKare AI
  APP_SLUG: birkare-ai
  API_HOST: 0.0.0.0
  API_PORT: '4000'
  LOG_LEVEL: ${LOG_LEVEL:-info}
  CORS_ORIGINS: ${CORS_ORIGINS:?Set allowed HTTPS origins}
  TRUST_PROXY: ${TRUST_PROXY:-false}
  DATABASE_PROVIDER: prisma
  DATABASE_URL: "postgresql://${DB_USER:?Set Cloud SQL DB user}:${DB_PASSWORD:?Set Cloud SQL DB password}@cloudsql-proxy:5432/${DB_NAME:?Set Cloud SQL DB name}?schema=public&sslmode=disable"
  QUEUE_DRIVER: bullmq
  REDIS_URL: redis://:${REDIS_PASSWORD:?Set Redis password}@redis:6379/0
  ENABLE_INLINE_WORKER: 'false'
  GENERATION_WORKER_CONCURRENCY: ${GENERATION_WORKER_CONCURRENCY:-2}
  OPENAI_MAX_JOBS_PER_WINDOW: ${OPENAI_MAX_JOBS_PER_WINDOW:-10}
  OPENAI_RATE_WINDOW_MS: ${OPENAI_RATE_WINDOW_MS:-60000}
  AI_PROVIDER: openai
  OPENAI_API_KEY: ${OPENAI_API_KEY:?Set OpenAI key}
  OPENAI_TEXT_MODEL: ${OPENAI_TEXT_MODEL:-gpt-4.1-mini}
  OPENAI_IMAGE_MODEL: ${OPENAI_IMAGE_MODEL:-gpt-image-1-mini}
  OPENAI_MODERATION_MODEL: ${OPENAI_MODERATION_MODEL:-omni-moderation-latest}
  DISABLE_ALL_GENERATION: ${DISABLE_ALL_GENERATION:-true}
  STORAGE_DRIVER: local
  LOCAL_STORAGE_PATH: /srv/app/.local-storage
  ALLOW_LOCAL_STORAGE: 'true'
  JWT_ISSUER: ${JWT_ISSUER:?Set public HTTPS API URL}
  JWT_USER_AUDIENCE: birkare-mobile
  JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET:?Set JWT secret}
  JWT_ACCESS_TTL_SECONDS: ${JWT_ACCESS_TTL_SECONDS:-900}
  REFRESH_TOKEN_TTL_DAYS: ${REFRESH_TOKEN_TTL_DAYS:-30}
  PASSWORD_PEPPER: ${PASSWORD_PEPPER:?Set password pepper}
  AUTH_DEV_MODE: 'false'
  GOOGLE_IOS_CLIENT_ID: ${GOOGLE_IOS_CLIENT_ID:-}
  GOOGLE_WEB_CLIENT_ID: ${GOOGLE_WEB_CLIENT_ID:-}
  GOOGLE_ANDROID_CLIENT_ID: ${GOOGLE_ANDROID_CLIENT_ID:-}
  APPLE_BUNDLE_ID: com.birkareai.mobile

x-backend-runtime: &backend-runtime
  platform: linux/amd64
  restart: unless-stopped
  init: true
  read_only: true
  tmpfs: ['/tmp:rw,noexec,nosuid,size=64m']
  cap_drop: ['ALL']
  security_opt: ['no-new-privileges:true']
  environment: *backend-environment
  volumes:
    - birkare-storage:/srv/app/.local-storage
  depends_on:
    cloudsql-proxy:
      condition: service_started
    migrate:
      condition: service_completed_successfully
    redis:
      condition: service_healthy

services:
  cloudsql-proxy:
    image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.14.1
    platform: linux/amd64
    restart: unless-stopped
    command:
      - --address=0.0.0.0
      - --port=5432
      - --structured-logs
      - --health-check
      - --credentials-file=/run/secrets/cloudsql-service-account
      - ${CLOUD_SQL_INSTANCE_CONNECTION_NAME:?Set Cloud SQL instance connection name}
    secrets: [cloudsql-service-account]
    expose: ['5432']

  redis:
    image: redis:7.4-alpine
    restart: unless-stopped
    environment:
      REDIS_PASSWORD: ${REDIS_PASSWORD:?Set Redis password}
    entrypoint: ['/bin/sh', '-ec']
    command:
      - |
        case "$$REDIS_PASSWORD" in ''|*[!a-zA-Z0-9_-]*) exit 1 ;; esac
        [ "$${#REDIS_PASSWORD}" -ge 32 ] || exit 1
        umask 077
        printf 'bind 0.0.0.0\nprotected-mode yes\nport 6379\nappendonly yes\nappendfsync everysec\nmaxmemory-policy noeviction\nrequirepass %s\n' "$$REDIS_PASSWORD" > /data/redis-runtime.conf
        chown redis:redis /data/redis-runtime.conf
        exec /usr/local/bin/docker-entrypoint.sh redis-server /data/redis-runtime.conf
    volumes: [redis-data:/data]
    healthcheck:
      test: ['CMD-SHELL', 'REDISCLI_AUTH="$$REDIS_PASSWORD" redis-cli ping | grep -qx PONG']
      interval: 10s
      timeout: 3s
      retries: 10

  migrate:
    image: ghcr.io/ranvals-software/birkare-api:${IMAGE_TAG:?Set release tag}
    platform: linux/amd64
    restart: 'no'
    init: true
    read_only: true
    tmpfs: ['/tmp:rw,noexec,nosuid,size=64m']
    cap_drop: ['ALL']
    security_opt: ['no-new-privileges:true']
    depends_on:
      cloudsql-proxy:
        condition: service_started
    environment:
      NODE_ENV: production
      DATABASE_URL: "postgresql://${DB_USER:?Set Cloud SQL DB user}:${DB_PASSWORD:?Set Cloud SQL DB password}@cloudsql-proxy:5432/${DB_NAME:?Set Cloud SQL DB name}?schema=public&sslmode=disable"
    command: [node, /srv/app/packages/database/node_modules/prisma/build/index.js, migrate, deploy, --schema, /srv/app/packages/database/prisma/schema.prisma]

  api:
    <<: *backend-runtime
    image: ghcr.io/ranvals-software/birkare-api:${IMAGE_TAG:?Set release tag}
    environment:
      <<: *backend-environment
      MAIL_DRIVER: ${MAIL_DRIVER:-disabled}
      SMTP_HOST: ${SMTP_HOST:-smtp.gmail.com}
      SMTP_PORT: ${SMTP_PORT:-587}
      SMTP_SECURE: ${SMTP_SECURE:-false}
      SMTP_USER: ${SMTP_USER:-}
      SMTP_PASSWORD: ${SMTP_PASSWORD:-}
      MAIL_FROM_EMAIL: ${MAIL_FROM_EMAIL:-}
      MAIL_FROM_NAME: ${MAIL_FROM_NAME:-BirKare AI}
      MAIL_APP_SCHEME: ${MAIL_APP_SCHEME:-birkareai}
      SUPPORT_EMAIL: ${SUPPORT_EMAIL:-birkareal@ranvals.com}
    ports: ['${API_BIND_ADDRESS:-127.0.0.1}:${API_PUBLISHED_PORT:-4000}:4000']
    stop_grace_period: 30s

  worker:
    <<: *backend-runtime
    image: ghcr.io/ranvals-software/birkare-worker:${IMAGE_TAG:?Set release tag}
    stop_grace_period: 240s

volumes:
  redis-data:
  birkare-storage:

secrets:
  cloudsql-service-account:
    file: ${CLOUD_SQL_CREDENTIALS_FILE:?Set path to Cloud SQL service-account JSON}