#!/usr/bin/env python3
import json
import os
import requests
from datetime import datetime, timezone

KOIOS_BASE = "https://api.koios.rest/api/v1"
POOL_ID = "pool16tcjctesjnks0p8sfrlf8f3d3vrp2fdn2msy80sgg3cdjtayu3z"  # dein Pool

def post(endpoint, payload):
    url = f"{KOIOS_BASE}/{endpoint}"
    resp = requests.post(url, json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()

def main():
    # 1. pool_info
    pool_info_list = post("pool_info", {"_pool_bech32": [POOL_ID]})
    pool_info = pool_info_list[0] if pool_info_list else {}

    # 2. pool_delegators
    delegators = post("pool_delegators", {"_pool_bech32": [POOL_ID]})

    # 3. pool_history (alle, wir schneiden später im Frontend auf letzte 10)
    history = post("pool_history", {"_pool_bech32": [POOL_ID], "_epoch_no": None})

    data = {
        "poolInfo": pool_info,
        "delegators": delegators,
        "history": history,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

    os.makedirs("data", exist_ok=True)
    with open("data/pool.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
