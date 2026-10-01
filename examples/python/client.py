#!/usr/bin/env python3
"""Minimal Python client for a self-hosted Laya /v1/systemone API."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

BASE_URL = os.environ.get("LAYA_BASE_URL", "https://laya.example.com").rstrip("/")
API_KEY = os.environ.get("LAYA_API_KEY", "")


def predict(state: str, questions: dict) -> dict:
    if not API_KEY:
        raise SystemExit("Set LAYA_API_KEY in the environment.")

    body = json.dumps({"state": state, "questions": questions}).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/v1/systemone",
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {exc.code}: {detail}") from exc


def main() -> None:
    state = (
        "Hi, we were billed twice for March. Please refund the duplicate today "
        "or we will cancel our plan."
    )
    questions = {
        "department": {
            "type": "choice",
            "instructions": "Which department should handle this?",
            "criteria": {
                "billing": "invoices, payments, refunds",
                "technical": "bugs, outages, system errors",
                "other": "everything else",
            },
        },
        "urgency": {
            "type": "score",
            "instructions": "How urgent is this?",
            "criteria": ["not urgent", "soon", "blocking"],
        },
        "churn_risk": {
            "type": "noul",
            "instructions": "Does the user threaten to cancel or leave?",
        },
    }

    result = predict(state, questions)
    answers = result.get("answers", {})
    print(json.dumps(result, indent=2))
    print("---")
    print("department:", answers.get("department", {}).get("choice"))
    print("urgency:", answers.get("urgency", {}).get("score"))
    print("churn_risk:", answers.get("churn_risk", {}).get("noul"))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
