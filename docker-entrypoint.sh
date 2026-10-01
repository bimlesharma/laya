#!/bin/sh
set -eu

# Named volumes are root-owned on first create; ensure the non-root user can write HF cache.
mkdir -p "${HF_HOME:-/home/laya/.cache/huggingface}"
chown -R laya:laya "${HF_HOME:-/home/laya/.cache/huggingface}" /home/laya/.cache 2>/dev/null || true

exec runuser -u laya -- "$@"
