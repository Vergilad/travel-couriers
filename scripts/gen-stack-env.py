#!/usr/bin/env python3
"""
Generate infra/supabase/.env for the Peregri self-hosted Supabase stack.

Windows-safe port of the upstream utils/generate-keys.sh (openssl CLI steps
reimplemented with the Python stdlib). Writes secrets DIRECTLY to the .env file
and prints only key NAMES — secret values never reach stdout, logs, or chat.

Usage:
    python scripts/gen-stack-env.py            # generate (fails if .env exists)
    python scripts/gen-stack-env.py --force    # overwrite an existing .env

Legacy HS256 key scheme (JWT_SECRET + ANON_KEY/SERVICE_ROLE_KEY signed JWTs) is
used — the new asymmetric/oppaque keys are left empty; supabase-js and
supabase-py work unchanged with the legacy keys.
"""

import base64
import hashlib
import hmac
import json
import re
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
STACK_DIR = REPO_ROOT / "infra" / "supabase"
ENV_PATH = STACK_DIR / ".env"
EXAMPLE_PATH = STACK_DIR / ".env.example"


def b64(n: int) -> str:
    """openssl rand -base64 N equivalent."""
    import secrets

    return base64.b64encode(secrets.token_bytes(n)).decode()


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def hs256_jwt(secret: str, payload: dict) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    h = b64url(json.dumps(header, separators=(",", ":")).encode())
    p = b64url(json.dumps(payload, separators=(",", ":")).encode())
    sig = hmac.new(secret.encode(), f"{h}.{p}".encode(), hashlib.sha256).digest()
    return f"{h}.{p}.{b64url(sig)}"


def gen_all() -> dict:
    import secrets

    now = int(time.time())
    exp = now + 5 * 3600 * 24 * 365  # 5 years, same as upstream script
    jwt_secret = b64(30)
    return {
        "JWT_SECRET": jwt_secret,
        "ANON_KEY": hs256_jwt(
            jwt_secret,
            {"role": "anon", "iss": "supabase", "iat": now, "exp": exp},
        ),
        "SERVICE_ROLE_KEY": hs256_jwt(
            jwt_secret,
            {"role": "service_role", "iss": "supabase", "iat": now, "exp": exp},
        ),
        "SECRET_KEY_BASE": b64(48),
        "REALTIME_DB_ENC_KEY": secrets.token_hex(8),
        "VAULT_ENC_KEY": secrets.token_hex(16),
        "PG_META_CRYPTO_KEY": b64(24),
        "LOGFLARE_PUBLIC_ACCESS_TOKEN": b64(24),
        "LOGFLARE_PRIVATE_ACCESS_TOKEN": b64(24),
        "S3_PROTOCOL_ACCESS_KEY_ID": secrets.token_hex(16),
        "S3_PROTOCOL_ACCESS_KEY_SECRET": secrets.token_hex(32),
        "MINIO_ROOT_PASSWORD": secrets.token_hex(16),
        "POSTGRES_PASSWORD": secrets.token_hex(16),
        "DASHBOARD_PASSWORD": secrets.token_hex(16),
    }


# Non-secret configuration for the LOCAL phase (no domain yet).
# When the domain lands: SUPABASE_PUBLIC_URL -> https://sb.<domain>,
# API_EXTERNAL_URL -> https://sb.<domain>/auth/v1, SITE_URL -> https://app.<domain>,
# ENABLE_EMAIL_AUTOCONFIRM -> false, SMTP_ADMIN_EMAIL/SENDER -> real addresses.
CONFIG = {
    "COMPOSE_FILE": "docker-compose.yml",
    # Gateway on :8001 — FastAPI owns :8000.
    "API_GW_HTTP_PORT": "8001",
    "KONG_HTTP_PORT": "8001",
    "SUPABASE_PUBLIC_URL": "http://localhost:8001",
    "API_EXTERNAL_URL": "http://localhost:8001/auth/v1",
    "SITE_URL": "http://localhost:5000",
    "ADDITIONAL_REDIRECT_URLS": "http://localhost:5000/**,http://127.0.0.1:5000/**",
    "DASHBOARD_USERNAME": "peregri-admin",
    "STUDIO_DEFAULT_ORGANIZATION": "Peregri",
    "STUDIO_DEFAULT_PROJECT": "Peregri Local",
    "OPENAI_API_KEY": "",
    "POOLER_TENANT_ID": "peregri-local",
    # Email: Resend SMTP. Confirmation links only reach real inboxes once a
    # sending domain is verified in Resend, so until then autoconfirm stays ON
    # so signup works locally. FLIP TO FALSE BEFORE PUBLIC LAUNCH.
    "ENABLE_EMAIL_SIGNUP": "true",
    "ENABLE_EMAIL_AUTOCONFIRM": "true",
    "SMTP_HOST": "smtp.resend.com",
    "SMTP_PORT": "465",
    "SMTP_USER": "resend",
    "SMTP_PASS": "PASTE_RESEND_API_KEY_HERE",
    "SMTP_ADMIN_EMAIL": "noreply@peregri.invalid",
    "SMTP_SENDER_NAME": "Peregri",
    # No phone auth, no anonymous users.
    "ENABLE_PHONE_SIGNUP": "false",
    "ENABLE_PHONE_AUTOCONFIRM": "false",
    "ENABLE_ANONYMOUS_USERS": "false",
    "DISABLE_SIGNUP": "false",
    "JWT_EXPIRY": "3600",
    "FUNCTIONS_VERIFY_JWT": "false",
    # TLS proxy (caddy/nginx) unused — public exposure is via Cloudflare Tunnel.
    "PROXY_DOMAIN": "",
    "CERTBOT_EMAIL": "",
    # New asymmetric key scheme: unused (legacy HS256 only).
    "SUPABASE_PUBLISHABLE_KEY": "",
    "SUPABASE_SECRET_KEY": "",
    "JWT_KEYS": "",
    "JWT_JWKS": "",
    "ANON_KEY_ASYMMETRIC": "",
    "SERVICE_ROLE_KEY_ASYMMETRIC": "",
}


def main() -> int:
    force = "--force" in sys.argv
    if ENV_PATH.exists() and not force:
        print(
            f"ERROR: {ENV_PATH} already exists.\n"
            "Refusing to overwrite: regenerating would rotate JWT_SECRET and\n"
            "invalidate every existing auth token and DB key.\n"
            "Pass --force only if you know the DB is disposable."
        )
        return 1

    template = EXAMPLE_PATH.read_text(encoding="utf-8")
    values = gen_all()
    values.update(CONFIG)

    def repl(match: re.Match) -> str:
        key = match.group(1)
        if key in values:
            return f"{key}={values[key]}"
        return match.group(0)

    lines = []
    for line in template.splitlines():
        m = re.match(r"^([A-Z][A-Z0-9_]*)=", line)
        if m:
            line = repl(m)
        lines.append(line)

    banner = [
        "",
        "############################################################################",
        "# Generated by scripts/gen-stack-env.py (do not commit; contains secrets).",
        "# Local phase: no domain yet. See CONFIG in that script for the",
        "# domain-day checklist (URLs, autoconfirm, SMTP sender).",
        "############################################################################",
    ]
    ENV_PATH.write_text("\n".join(lines + banner) + "\n", encoding="utf-8")

    print(f"Wrote {ENV_PATH}")
    print("Keys set (values not printed):")
    for key in sorted(values):
        note = ""
        if values[key] == "PASTE_RESEND_API_KEY_HERE":
            note = "  <- paste your Resend API key here"
        elif values[key] == "":
            note = "  (empty, intentional)"
        print(f"  {key}{note}")
    print("\nReminders:")
    print("  - .env is gitignored (root .gitignore '.env' matches any depth).")
    print("  - ENABLE_EMAIL_AUTOCONFIRM=true until the Resend sending domain is verified.")
    print("  - Secrets exist BEFORE first 'docker compose up' (db init scripts read them).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
