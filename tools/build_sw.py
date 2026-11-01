#!/usr/bin/env python3
"""Write precache.json (every file the game needs offline) and stamp sw.js with a new version.
Run this after you change any file, before you push to GitHub:   python tools/build_sw.py"""
import hashlib, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {".git", "tests", "tools", "__pycache__", "node_modules", ".claude"}
SKIP_FILES = {"precache.json", "start-lan.bat", "README.md", "serve.py", ".gitignore", ".nojekyll"}
files, h = [], hashlib.sha1()
for base, dirs, names in os.walk(ROOT):
    dirs[:] = sorted(d for d in dirs if d not in SKIP_DIRS)
    for n in sorted(names):
        if n in SKIP_FILES or n.endswith((".txt", ".md", ".pyc")) and "assets" not in base:
            continue
        if n == "DROP YOUR PICTURES HERE.txt" or n == "READ ME.txt":
            continue
        p = os.path.join(base, n)
        rel = os.path.relpath(p, ROOT).replace(os.sep, "/")
        if rel == "sw.js":
            continue
        files.append(rel)
        h.update(rel.encode())
        h.update(open(p, "rb").read())
files.append("./")
ver = "tp-" + h.hexdigest()[:10]
json.dump({"version": ver, "files": files}, open(os.path.join(ROOT, "precache.json"), "w"), indent=0)
sw = open(os.path.join(ROOT, "sw.js"), encoding="utf-8").read()
sw = re.sub(r"/\*V\*/'[^']*'/\*V\*/", "/*V*/'%s'/*V*/" % ver, sw)
open(os.path.join(ROOT, "sw.js"), "w", encoding="utf-8").write(sw)
print("service worker %s - %d files for offline use" % (ver, len(files)))
