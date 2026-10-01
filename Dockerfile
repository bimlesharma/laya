# CPU-only Laya HTTP server (laya-serve).
# Pins match upstream Docker quickstart torch version and current PyPI laya.

FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    HF_HOME=/home/laya/.cache/huggingface \
    HOME=/home/laya

ARG TORCH_VERSION=2.14.0
ARG LAYA_VERSION=0.3.22

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1000 laya \
    && useradd --system --uid 1000 --gid laya --create-home --home-dir /home/laya laya \
    && mkdir -p /home/laya/.cache/huggingface \
    && chown -R laya:laya /home/laya

# Install CPU PyTorch first, then laya[serve], so pip does not pull a CUDA wheel.
RUN pip install --upgrade pip \
    && pip install "torch==${TORCH_VERSION}" --index-url https://download.pytorch.org/whl/cpu \
    && pip install "laya[serve]==${LAYA_VERSION}"

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

WORKDIR /home/laya

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=600s --retries=5 \
    CMD curl -fsS http://127.0.0.1:8000/health || exit 1

# Entrypoint runs as root to fix volume ownership, then drops to user laya.
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["laya-serve"]
