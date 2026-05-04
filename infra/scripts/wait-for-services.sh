#!/usr/bin/env sh
set -eu

POSTGRES_HOST="${POSTGRES_HOST:-127.0.0.1}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6379}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://127.0.0.1:9000}"
WAIT_TIMEOUT_SECONDS="${WAIT_TIMEOUT_SECONDS:-60}"
WAIT_INTERVAL_SECONDS="${WAIT_INTERVAL_SECONDS:-2}"

log() {
  printf '%s\n' "$1"
}

wait_for_tcp() {
  service_name="$1"
  host="$2"
  port="$3"
  deadline=$(( $(date +%s) + WAIT_TIMEOUT_SECONDS ))

  while [ "$(date +%s)" -le "$deadline" ]; do
    if nc -z "$host" "$port" >/dev/null 2>&1; then
      log "$service_name is ready at $host:$port"
      return 0
    fi

    sleep "$WAIT_INTERVAL_SECONDS"
  done

  log "Timed out waiting for $service_name at $host:$port"
  return 1
}

wait_for_http() {
  service_name="$1"
  url="$2"
  deadline=$(( $(date +%s) + WAIT_TIMEOUT_SECONDS ))

  while [ "$(date +%s)" -le "$deadline" ]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      log "$service_name is ready at $url"
      return 0
    fi

    sleep "$WAIT_INTERVAL_SECONDS"
  done

  log "Timed out waiting for $service_name at $url"
  return 1
}

wait_for_tcp postgres "$POSTGRES_HOST" "$POSTGRES_PORT"
wait_for_tcp redis "$REDIS_HOST" "$REDIS_PORT"
wait_for_http minio "$MINIO_ENDPOINT/minio/health/ready"
