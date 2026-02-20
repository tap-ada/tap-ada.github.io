#!/usr/bin/env python3
import json
import os
from datetime import datetime, timezone

import requests

KOIOS_BASE = "https://api.koios.rest/api/v1"
POOL_ID = "pool16tcjctesjnks0p8sfrlf8f3d3vrp2fdn2msy80sgg3cdjtayu3z"  # dein Pool

def post(endpoint, payload):
    url = f"{KOIOS_BASE}/{endpoint}"
    resp = requests.post(url, json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()

def safe_post(endpoint, payload, default):
    try:
        return post(endpoint, payload)
    except Exception as e:
        print(f"[WARN] {endpoint} failed: {e}")
        return default

def compute_avg_ros(history_entries, max_epochs=None):
    """
    history_entries: Liste der Epoch-Einträge für deinen Pool (Koios pool_history).
    max_epochs: Optional, nur die letzten N Epochen berücksichtigen.
    """
    if not history_entries:
        return None

    entries = sorted(history_entries, key=lambda x: x.get("epoch_no", 0))
    if max_epochs:
        entries = entries[-max_epochs:]

    ros_values = []
    for e in entries:
        ros = e.get("epoch_ros")
        if ros is not None:
            try:
                ros_values.append(float(ros))
            except (TypeError, ValueError):
                continue

    if not ros_values:
        return None

    avg = sum(ros_values) / len(ros_values)
    return avg

def main():
    # 1. pool_info
    pool_info_list = safe_post("pool_info", {"_pool_bech32_ids": [POOL_ID]}, [])
    pool_info = pool_info_list[0] if pool_info_list else {}

    # 2. pool_delegators
    delegators = safe_post("pool_delegators", {"_pool_bech32": [POOL_ID]}, [])

    # 3. pool_history (alle Epochs)
    history_raw = safe_post(
        "pool_history",
        {"_pool_bech32": [POOL_ID], "_epoch_no": None},
        []
    )

    # Koios liefert ein Array pro Pool, mit Feld "history"
    if history_raw and isinstance(history_raw, list):
        pool_hist = history_raw[0].get("history", [])
    else:
        pool_hist = []

    # sortiert nach epoch_no, letzte 30 Epochen für Frontend
    pool_hist_sorted = sorted(pool_hist, key=lambda x: x.get("epoch_no", 0))
    last_epochs = pool_hist_sorted[-30:]

    # Durchschnitts-ROS
    avg_ros_all = compute_avg_ros(pool_hist, max_epochs=None)
    avg_ros_30 = compute_avg_ros(pool_hist, max_epochs=30)

    stats = {
        "avg_ros_all": avg_ros_all,
        "avg_ros_last_30": avg_ros_30,
        "epochs_count": len(pool_hist),
        "epochs_last_30_count": len(last_epochs),
    }

    data = {
        "poolInfo": pool_info,
        "delegators": delegators,
        "history": last_epochs,
        "stats": stats,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

    os.makedirs("data", exist_ok=True)
    with open("data/pool.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
