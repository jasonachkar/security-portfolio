#!/usr/bin/env bash
set -euo pipefail

docker compose -f infra/local/docker-compose.yml up --build -d
