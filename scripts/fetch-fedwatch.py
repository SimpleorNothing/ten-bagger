#!/usr/bin/env python3
"""Daily December-2026 FedWatch snapshot using ARahimiQuant/pyfedwatch.

Methodology: pyfedwatch 1.2.0 (CME FedWatch methodology implementation)
FOMC calendar: Federal Reserve official calendar via pyfedwatch.datareader.get_fomc_data_fed
Fed Funds target range: FRED DFEDTARL / DFEDTARU CSV
Fed Funds futures prices: Yahoo Finance public chart feed for CME Globex ZQ contracts

If any required input cannot be verified, no probability is fabricated and today's
check is recorded as '확인 필요'.
"""
import json
import re
from datetime import datetime, timezone, timedelta
from urllib.parse import quote
from urllib.request import Request, urlopen

import pandas as pd
from pyfedwatch.datareader import get_fomc_data_fed
from pyfedwatch.fedwatch import FedWatch

OUT = "fedwatch.json"
TARGET_MEETING = "2026-12-09"
METHODOLOGY_URL = "https://github.com/ARahimiQuant/pyfedwatch"
FED_CAL_URL = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"
FRED_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id={}"
YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{}?period1={}&period2={}&interval=1d&events=history"
UA = "Mozilla/5.0 (compatible; AlphaMap-FedWatch/1.0)"


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def today_iso():
    return datetime.now(timezone.utc).date().isoformat()


def load_doc():
    try:
        with open(OUT, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"meeting": "2026-12 FOMC", "history": []}


def save_doc(doc):
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")


def record_check(doc, status, reason=None, input_meta=None):
    today = today_iso()
    checked = now_iso()
    checks = [x for x in doc.get("checks", []) if x.get("date") != today]
    item = {"date": today, "checkedAt": checked, "status": status}
    if reason:
        item["reason"] = reason
    if input_meta:
        item["inputs"] = input_meta
    checks.append(item)
    doc.update({
        "meeting": "2026-12 FOMC",
        "source": "PyFedWatch methodology",
        "methodology": "ARahimiQuant/pyfedwatch 1.2.0",
        "methodologyUrl": METHODOLOGY_URL,
        "fomcCalendarUrl": FED_CAL_URL,
        "checkedAt": checked,
        "status": status,
        "checks": checks[-370:],
    })
    if reason:
        doc["statusReason"] = reason
    else:
        doc.pop("statusReason", None)
    return doc


def fetch_json(url):
    req = Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def globex_to_yahoo(symbol):
    # pyfedwatch requests symbols like ZQU26. Yahoo commonly exposes CME contracts as ZQU26.CBT.
    if not re.fullmatch(r"ZQ[FGHJKMNQUVXZ]\d{2}", symbol):
        raise ValueError(f"unexpected Fed Funds future symbol: {symbol}")
    return symbol + ".CBT"


def read_yahoo_price_history(symbol):
    yahoo_symbol = globex_to_yahoo(symbol)
    end = datetime.now(timezone.utc) + timedelta(days=1)
    start = end - timedelta(days=420)
    url = YAHOO_CHART.format(quote(yahoo_symbol, safe=""), int(start.timestamp()), int(end.timestamp()))
    j = fetch_json(url)
    result = ((j.get("chart") or {}).get("result") or [None])[0]
    if not result:
        err = (j.get("chart") or {}).get("error")
        raise RuntimeError(f"Yahoo price unavailable for {yahoo_symbol}: {err}")
    ts = result.get("timestamp") or []
    close = ((((result.get("indicators") or {}).get("quote") or [{}])[0]).get("close") or [])
    rows = []
    for t, c in zip(ts, close):
        if c is None:
            continue
        rows.append((datetime.fromtimestamp(t, timezone.utc).date().isoformat(), float(c)))
    if not rows:
        raise RuntimeError(f"no close data for {yahoo_symbol}")
    df = pd.DataFrame(rows, columns=["Date", "Close"])
    df["Date"] = pd.to_datetime(df["Date"])
    df.set_index("Date", inplace=True)
    df.index.name = "Date"
    return df


def latest_fred(series_id):
    url = FRED_URL.format(series_id)
    req = Request(url, headers={"User-Agent": UA})
    with urlopen(req, timeout=30) as r:
        df = pd.read_csv(r)
    df["DATE"] = pd.to_datetime(df["DATE"])
    df[series_id] = pd.to_numeric(df[series_id], errors="coerce")
    df = df.dropna(subset=[series_id])
    if df.empty:
        raise RuntimeError(f"FRED {series_id} unavailable")
    row = df.iloc[-1]
    return float(row[series_id]), row["DATE"].date().isoformat()


def normalize_ranges(row):
    ranges = []
    for label, value in row.items():
        p = float(value) * 100.0
        if p < -1e-9:
            continue
        m = re.fullmatch(r"(-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)", str(label))
        if not m:
            continue
        low, high = float(m.group(1)), float(m.group(2))
        ranges.append({
            "label": f"{low:.2f}%–{high:.2f}%",
            "low": low,
            "high": high,
            "probability": round(max(0.0, p), 1),
        })
    ranges.sort(key=lambda x: x["low"])
    total = sum(x["probability"] for x in ranges)
    if len(ranges) < 2 or not (98.0 <= total <= 102.0):
        raise RuntimeError(f"probability validation failed: n={len(ranges)} total={total:.2f}")
    return ranges


def main():
    doc = load_doc()
    try:
        # Official Fed calendar through pyfedwatch helper.
        fomc_dates = get_fomc_data_fed()
        if TARGET_MEETING not in set(map(str, fomc_dates.index)):
            raise RuntimeError(f"Federal Reserve calendar missing {TARGET_MEETING}")

        ll, ll_date = latest_fred("DFEDTARL")
        ul, ul_date = latest_fred("DFEDTARU")
        if ll_date != ul_date:
            raise RuntimeError(f"FRED target-range dates differ: {ll_date} vs {ul_date}")

        watch_date = today_iso()
        # Three meetings remain from mid-August 2026 (Sep/Oct/Dec); request four to be robust.
        fw = FedWatch(
            watch_date=watch_date,
            fomc_dates=fomc_dates,
            num_upcoming=4,
            user_func=read_yahoo_price_history,
        )
        expectations = fw.generate_hike_info(rate_cols=True, watch_rate_range=(ll, ul))

        # MultiIndex: (WatchDate, FOMCDate)
        target_key = None
        for idx in expectations.index:
            if isinstance(idx, tuple) and str(idx[-1]) == TARGET_MEETING:
                target_key = idx
                break
            if str(idx) == TARGET_MEETING:
                target_key = idx
                break
        if target_key is None:
            raise RuntimeError(f"pyfedwatch output missing {TARGET_MEETING}")

        ranges = normalize_ranges(expectations.loc[target_key])
        expected = sum(((x["low"] + x["high"]) / 2.0) * x["probability"] / 100.0 for x in ranges)
        contract_symbols = list(fw.fomc_data.contract_list)
        input_meta = {
            "watchDate": watch_date,
            "targetRateRange": [ll, ul],
            "targetRateAsOf": ll_date,
            "futuresSource": "Yahoo Finance public chart feed (CME Globex ZQ contracts)",
            "futuresSymbols": contract_symbols,
            "fomcCalendarSource": "Federal Reserve official calendar",
            "methodology": "pyfedwatch 1.2.0",
        }

        today = today_iso()
        hist = [x for x in doc.get("history", []) if x.get("date") != today]
        hist.append({
            "date": today,
            "expectedRate": round(expected, 4),
            "ranges": ranges,
            "inputs": input_meta,
        })
        doc["history"] = hist[-370:]
        doc["asOf"] = now_iso()
        record_check(doc, "확인", input_meta=input_meta)
        save_doc(doc)
        print(f"PyFedWatch Dec-2026: {len(ranges)} ranges, expected {expected:.2f}%")
    except Exception as e:
        reason = f"PyFedWatch 계산 입력 검증 실패 ({type(e).__name__}: {e}). 이전 확률을 최신값처럼 사용하지 않음."
        record_check(doc, "확인 필요", reason)
        save_doc(doc)
        print(reason)


if __name__ == "__main__":
    main()
