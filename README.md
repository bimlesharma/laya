# Self-hosted Laya API

Docker Compose stack that runs official Convai [Laya](https://github.com/NandhaKishorM/laya) (`laya-serve`) on a CPU VPS behind Caddy HTTPS, with a shared team bearer API key.

```text
Internet  --HTTPS + Bearer-->  Caddy:443  -->  laya-serve:8000  -->  HF cache volume
```

## What you get

| Piece | Detail |
|---|---|
| API | `POST /v1/systemone` (Jev / TypeSafe compatible) |
| Auth | `Authorization: Bearer <LAYA_API_KEY>` |
| TLS | Caddy + Let's Encrypt for `DOMAIN` |
| Model | Preloads `multilingual` (best CPU latency on a 4-core host) |
| Clients | [`examples/python/client.py`](examples/python/client.py), [`examples/typescript/client.ts`](examples/typescript/client.ts) |

Fine-tuning is not required for multipurpose triage / routing / scoring.

## Requirements

- AMD64 Linux VPS with Docker Engine + Compose v2
- ~4 CPU cores, ≥8 GB RAM free for the model (15 GB total is comfortable)
- Public DNS A/AAAA for your hostname pointing at the VPS
- Ports **80** and **443** open to the internet (ACME + HTTPS)

## Local smoke test (this machine)

Skip Caddy/HTTPS and publish `laya` on localhost:

```bash
cp .env.example .env
# set LAYA_API_KEY (required)

docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build laya
curl -fsS http://127.0.0.1:8000/health
```

[`docker-compose.local.yml`](docker-compose.local.yml) maps port `8000` and disables Caddy. Production VPS deploy uses the main compose file only (Caddy on 80/443).

## Deploy

```bash
git clone <this-repo> laya && cd laya
cp .env.example .env
```

Edit `.env`:

1. Set `DOMAIN` to your hostname (e.g. `laya.yourcompany.com`).
2. Set `LAYA_API_KEY` to a long random secret:

```bash
openssl rand -hex 32
```

Point DNS at the VPS, then:

```bash
docker compose up -d --build
```

First boot downloads the multilingual checkpoint into the `laya-hf-cache` volume (~650 MB). The healthcheck `start_period` is 600s so Compose waits for download + load before starting Caddy.

### Smoke tests

```bash
# Health (no auth)
curl -fsS "https://$DOMAIN/health"

# Decision (auth required)
curl -fsS "https://$DOMAIN/v1/systemone" \
  -H "Authorization: Bearer $LAYA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "state": "We were billed twice. Refund or we cancel.",
    "questions": {
      "dept": {
        "type": "choice",
        "instructions": "Which team?",
        "criteria": {"billing": "refunds", "tech": "bugs", "other": "else"}
      }
    }
  }'
```

Share `https://$DOMAIN` and the API key with the team via a password manager.

## Team clients

### Python (stdlib only)

```bash
export LAYA_BASE_URL="https://laya.yourcompany.com"
export LAYA_API_KEY="your-shared-key"
python3 examples/python/client.py
```

### TypeScript (Node 18+)

```bash
export LAYA_BASE_URL="https://laya.yourcompany.com"
export LAYA_API_KEY="your-shared-key"
npx --yes tsx examples/typescript/client.ts
```

You can also point the TypeSafe SDK at this server:

```bash
export TYPESAFE_BASE_URL="https://laya.yourcompany.com"
export TYPESAFE_API_KEY="your-shared-key"
```

## CPU tuning (4-core / 15 GB)

Defaults in `.env.example` match this profile:

| Variable | Default | Notes |
|---|---|---|
| `LAYA_DEVICE` | `cpu` | No GPU on this VPS |
| `LAYA_THREADS` | `4` | Keep ≤ physical cores |
| `LAYA_PRELOAD` | `1` | Load checkpoint at startup |
| `LAYA_MODELS` | `multilingual` | ~193 ms/question on similar EPYC CPUs; English checkpoints are slower on CPU |

To also preload English later (uses more RAM):

```env
LAYA_MODELS=english,multilingual
```

Do **not** publish port 8000 on the host. Only Caddy is internet-facing.

## Operations

```bash
docker compose logs -f laya
docker compose logs -f caddy
docker compose ps
docker compose pull caddy && docker compose up -d --build
```

Rotate the team key by changing `LAYA_API_KEY` in `.env` and running `docker compose up -d laya`.

## Security checklist

- [ ] `.env` is not committed (see `.gitignore`)
- [ ] `LAYA_API_KEY` is long and random
- [ ] DNS points only at this VPS before `compose up`
- [ ] Firewall allows 80/443 only (SSH as you already manage it)
- [ ] Key shared only with trusted teammates

## License

This deploy scaffold is for your team. Laya itself is Apache-2.0 by Convai Innovations — see [PyPI laya](https://pypi.org/project/laya/) and [Hugging Face weights](https://huggingface.co/convaiinnovations/laya).
