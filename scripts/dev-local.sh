#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.local.yml"
APP_URL="${PAX_LOCAL_URL:-http://localhost:3001}"
ACTION="start"
OPEN_BROWSER=true
ENABLE_REMINDERS=false

usage() {
  cat <<'EOF'
Usage: bash scripts/dev-local.sh [command] [options]

Commands:
  start       Start the local stack and open the app (default)
  stop        Stop the stack without deleting data
  restart     Restart the stack without deleting data
  status      Show container status and app health
  logs        Follow application and infrastructure logs

Options:
  --no-open       Do not open the browser after startup
  --reminders     Start the optional reminder scheduler
  -h, --help      Show this help

Examples:
  pnpm dev:docker
  pnpm dev:docker -- --no-open
  pnpm dev:docker -- --reminders
  bash scripts/dev-local.sh restart
EOF
}

for argument in "$@"; do
  case "$argument" in
    start|stop|restart|status|logs)
      ACTION="$argument"
      ;;
    --)
      ;;
    --no-open)
      OPEN_BROWSER=false
      ;;
    --reminders)
      ENABLE_REMINDERS=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown argument: %s\n\n' "$argument" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker CLI was not found. Install and start OrbStack first." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Start OrbStack and try again." >&2
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Missing Compose file: $COMPOSE_FILE" >&2
  exit 1
fi

compose=(docker compose -f "$COMPOSE_FILE")

if [[ "$ENABLE_REMINDERS" == true ]]; then
  compose+=(--profile reminders)
fi

show_status() {
  "${compose[@]}" ps
  printf '\nApp health: '
  if curl --fail --silent --show-error "$APP_URL/api/health" >/dev/null 2>&1; then
    echo "healthy"
  else
    echo "not ready"
  fi
}

wait_for_app() {
  local timeout_seconds=180
  local started_at=$SECONDS
  local container_id=""
  local container_status=""
  local health_status=""

  printf 'Waiting for Pax'

  while (( SECONDS - started_at < timeout_seconds )); do
    container_id="$("${compose[@]}" ps -q workspace 2>/dev/null || true)"

    if [[ -n "$container_id" ]]; then
      container_status="$(docker inspect --format '{{.State.Status}}' "$container_id" 2>/dev/null || true)"
      health_status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$container_id" 2>/dev/null || true)"

      if [[ "$container_status" == "exited" || "$container_status" == "dead" ]]; then
        echo
        echo "The application container stopped during startup." >&2
        "${compose[@]}" logs --tail=120 workspace >&2
        return 1
      fi

      if [[ "$health_status" == "unhealthy" ]]; then
        echo
        echo "The application container became unhealthy." >&2
        "${compose[@]}" logs --tail=120 workspace >&2
        return 1
      fi
    fi

    if curl --fail --silent --show-error "$APP_URL/api/health" >/dev/null 2>&1; then
      echo " ready."
      return 0
    fi

    printf '.'
    sleep 2
  done

  echo
  echo "Pax did not become ready within ${timeout_seconds} seconds." >&2
  "${compose[@]}" logs --tail=120 workspace >&2
  return 1
}

open_app() {
  [[ "$OPEN_BROWSER" == true ]] || return 0

  if command -v open >/dev/null 2>&1; then
    open "$APP_URL"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$APP_URL" >/dev/null 2>&1 || true
  else
    echo "Open $APP_URL in your browser."
  fi
}

start_stack() {
  local context
  context="$(docker context show 2>/dev/null || echo unknown)"

  echo "Starting Pax with Docker context: $context"
  "${compose[@]}" up -d --remove-orphans
  wait_for_app
  show_status
  printf '\nPax is available at %s\n' "$APP_URL"
  echo "Follow logs with: pnpm dev:docker:logs"
  echo "Stop with:        pnpm dev:docker:down"
  open_app
}

case "$ACTION" in
  start)
    start_stack
    ;;
  stop)
    "${compose[@]}" down
    ;;
  restart)
    "${compose[@]}" down
    start_stack
    ;;
  status)
    show_status
    ;;
  logs)
    "${compose[@]}" logs --tail=150 --follow workspace postgres minio
    ;;
esac
