#!/usr/bin/env python3
"""Download every flag in data/flags.js ONCE from flagcdn.com into assets/flags/.
After this the app needs no internet at runtime.   Usage: python tools/fetch_flags.py"""
import os, re, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, "data", "flags.js"), encoding="utf-8").read()
codes = re.findall(r'\["[^"]+","([a-z]{2})"', src)
out = os.path.join(ROOT, "assets", "flags")
os.makedirs(out, exist_ok=True)
ok = fail = 0
for c in codes:
    dest = os.path.join(out, c + ".svg")
    if os.path.exists(dest) and os.path.getsize(dest) > 100:
        ok += 1
        continue
    try:
        req = urllib.request.Request("https://flagcdn.com/%s.svg" % c, headers={"User-Agent": "TrafalgarPark-flag-fetch/1.0"})
        data = urllib.request.urlopen(req, timeout=30).read()
        open(dest, "wb").write(data)
        ok += 1
        time.sleep(0.05)
    except Exception as e:
        fail += 1
        print("FAILED", c, e)
print("flags ok: %d  failed: %d  (of %d)" % (ok, fail, len(codes)))
sys.exit(1 if fail else 0)
