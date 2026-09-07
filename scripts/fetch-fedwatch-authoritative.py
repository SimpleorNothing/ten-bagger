#!/usr/bin/env python3
"""Authoritative FedWatch updater.

Priority is CME official EOD API -> Investing.com displayed Fed Rate Monitor ->
pyfedwatch only if neither verified source is usable. The actual source Updated
stamp is kept separate from the automation check time.
"""
from __future__ import annotations

import importlib.util
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEGACY = ROOT / "scripts" / "fetch-fedwatch.py"
OUT = ROOT / "fedwatch.json"
PULSE = ROOT / "pulse.json"
CHANGELOG = ROOT / "changelog.js"

spec = importlib.util.spec_from_file_location("fedwatch_legacy", LEGACY)
fw = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fw)


def source_age_days(source_date: str) -> int:
    d = datetime.strptime(source_date, "%Y-%m-%d").date()
    return (datetime.now(timezone.utc).date() - d).days


def kst_now() -> str:
    from datetime import timedelta
    return (datetime.now(timezone.utc) + timedelta(hours=9)).strftime("%Y-%m-%dT%H:%M:%S+09:00")


def fetch_investing_summary():
    """Read only the current-probability summary before Investing's repeated table.

    Investing renders each target-rate probability twice: once in the summary and
    again in a table that also includes previous-day/week columns. Parsing the full
    block can therefore double-count or cross-pair percentages. Stop at `Target Rate`.
    """
    req = fw.Request(fw.INVESTING_URL, headers={"User-Agent": fw.UA, "Accept-Language": "en-US,en;q=0.9"})
    with fw.urlopen(req, timeout=30) as r:
        html = r.read().decode("utf-8", "ignore")
    text = fw.BeautifulSoup(html, "html.parser").get_text(" ", strip=True)
    marker = re.search(r"Dec\s+09,\s*2026", text, re.I)
    if not marker:
        raise RuntimeError("December 9 2026 block not found")
    chunk = text[marker.start():marker.start() + 3000]
    summary = chunk.split("Target Rate", 1)[0]
    rows = [(m.group(1), m.group(2), m.group(3)) for m in re.finditer(
        r"(\d\.\d{2})\s*-\s*(\d\.\d{2})\s+(\d{1,3}(?:\.\d+)?)%", summary
    )]
    ranges = fw.norm_ranges(rows)
    um = re.search(r"Updated:\s*([A-Z][a-z]{2}\s+\d{1,2},\s*2026\s+\d{2}:\d{2}[AP]M\s+EDT)", chunk)
    updated = um.group(1) if um else None
    if not updated:
        raise RuntimeError("Investing.com Updated timestamp unavailable")
    try:
        source_date = datetime.strptime(updated, "%b %d, %Y %I:%M%p EDT").date().isoformat()
    except Exception as e:
        raise RuntimeError(f"Investing.com Updated timestamp parse failed: {updated}") from e
    pm = re.search(r"Future Price:\s*(\d+\.\d+)", summary)
    return ranges, source_date, {
        "updated": updated,
        "futurePrice": pm.group(1) if pm else None,
        "basis": "CME Group 30-Day Fed Fund futures",
        "parser": "summary-before-Target-Rate",
    }


def save_verified(doc, source, source_url, ranges, source_date, meta, priority):
    checked = fw.now_iso()
    today = fw.today_iso()
    source_updated = (meta or {}).get("updated") or source_date
    future_price_raw = (meta or {}).get("futurePrice")
    future_price = float(future_price_raw) if future_price_raw not in (None, "") else None
    expected = round(sum(((x["low"] + x["high"]) / 2) * x["probability"] / 100 for x in ranges), 4)
    checks = [x for x in doc.get("checks", []) if x.get("date") != today]
    checks.append({
        "date": today, "checkedAt": checked, "status": f"확인됨({priority}순위)",
        "source": source, "sourceDate": source_date, "sourceUpdatedAt": source_updated,
        "reason": f"{source} 검증값 사용. 실제 원문 Updated={source_updated}; 자동화 실행일과 원문 기준시각을 분리 기록.",
        "inputs": meta or {},
    })
    hist = [x for x in doc.get("history", []) if (x.get("sourceDate") or x.get("date")) != source_date]
    entry = {
        "date": source_date, "sourceDate": source_date, "checkedAt": checked,
        "expectedRate": expected, "ranges": ranges, "source": source,
        "sourceUpdatedAt": source_updated, "inputs": meta or {},
    }
    if future_price is not None:
        entry["futurePrice"] = future_price
    hist.append(entry)
    hist.sort(key=lambda x: (x.get("sourceDate") or x.get("date") or ""))
    doc.update({
        "meeting": "2026-12 FOMC", "source": source, "sourceUrl": source_url,
        "primarySourceUrl": "https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html",
        "apiInfoUrl": "https://www.cmegroup.com/market-data/market-data-api/fedwatch-api.html",
        "asOf": source_date, "sourceUpdatedAt": source_updated, "checkedAt": checked,
        "status": f"확인됨({priority}순위)", "statusReason": checks[-1]["reason"],
        "history": hist[-370:], "checks": checks[-370:],
    })
    if future_price is not None:
        doc["futurePrice"] = future_price
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return doc


def save_unverified(doc, errors):
    today = fw.today_iso(); checked = fw.now_iso()
    checks = [x for x in doc.get("checks", []) if x.get("date") != today]
    reason = " / ".join(errors) + ". 검증 가능한 최신 확률을 확보하지 못해 이전 값을 최신값으로 승격하지 않음."
    checks.append({"date": today, "checkedAt": checked, "status": "확인 필요", "reason": reason})
    doc["checkedAt"] = checked; doc["status"] = "확인 필요"; doc["statusReason"] = reason; doc["checks"] = checks[-370:]
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return doc


def sync_pulse(doc):
    if not PULSE.exists() or not doc.get("history"):
        return
    h = doc["history"][-1]; ranges = h.get("ranges") or []
    below4 = round(sum(float(x.get("probability", 0)) for x in ranges if float(x.get("high", 99)) <= 4.0), 1)
    updated = h.get("sourceUpdatedAt") or h.get("sourceDate") or h.get("date")
    p = json.loads(PULSE.read_text(encoding="utf-8")); old = p.get("headline", "")
    replacement = f"FedWatch의 12월 3.75~4.00% 이하 확률은 {below4:.1f}%(원문 Updated {updated})"
    new = re.sub(r"FedWatch의 12월 3\.75~4\.00% 이하 확률은 [0-9.]+%(?:\([^)]*\))?", replacement, old)
    if new == old and "FedWatch" not in old:
        new = old + (" " if old else "") + replacement + "."
    p["headline"] = new; p["asOf"] = kst_now()[:16]
    p["model"] = "ChatGPT automation · official releases first · holdings 2026-09-05 · no paid external LLM API"
    PULSE.write_text(json.dumps(p, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sync_changelog(doc):
    if not CHANGELOG.exists() or not doc.get("history"):
        return
    h = doc["history"][-1]; r = h.get("ranges") or []
    if not r:
        return
    probs = "/".join(f"{float(x['probability']):.1f}" for x in r); fp = h.get("futurePrice")
    updated = h.get("sourceUpdatedAt") or h.get("sourceDate") or h.get("date")
    entry = (
        "    {d:'2026-09-07',t:'01 FedWatch 원문시각 정합성 — CME 공식 EOD 직접값 미확보 시 Investing.com 표시값을 2순위로 사용하고 실제 Updated 시각을 보존. "
        + f"12월 확률 {probs}%" + (f", 선물 {fp:.3f}" if fp is not None else "")
        + f", 원문 Updated {updated} 기준으로 fedwatch·시장맥박 동기화'" + "},\n"
    )
    text = CHANGELOG.read_text(encoding="utf-8"); marker = "  var MKT_CHANGELOG=[\n"
    if entry.strip() not in text and marker in text:
        CHANGELOG.write_text(text.replace(marker, marker + entry, 1), encoding="utf-8")


def main():
    doc = fw.load_doc(); errors = []
    sources = [
        ("CME FedWatch End-of-Day API", fw.CME_DOC, fw.fetch_cme, 1),
        ("Investing.com Fed Rate Monitor", fw.INVESTING_URL, fetch_investing_summary, 2),
        ("PyFedWatch methodology", fw.PYFEDWATCH_URL, fw.fetch_pyfedwatch, 3),
    ]
    for name, url, fn, priority in sources:
        try:
            ranges, source_date, meta = fn()
            if name == "Investing.com Fed Rate Monitor":
                age = source_age_days(source_date)
                if age < 0 or age > 3:
                    raise RuntimeError(f"Investing.com Updated date too old: {source_date} (age={age}d)")
            doc = save_verified(doc, name, url, ranges, source_date, meta, priority)
            sync_pulse(doc); sync_changelog(doc)
            print(f"FedWatch source={name} sourceDate={source_date} updated={(meta or {}).get('updated')} ranges={len(ranges)}")
            return
        except Exception as e:
            errors.append(f"{name}: {type(e).__name__}: {e}")
    save_unverified(doc, errors); print(" / ".join(errors))


if __name__ == "__main__":
    main()
