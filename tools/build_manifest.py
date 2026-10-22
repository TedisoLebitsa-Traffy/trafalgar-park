#!/usr/bin/env python3
"""Scan assets/pictures/<Category>/<Answer>.<ext> and write assets/pictures/manifest.json

    category folder name  ->  category shown in the Picture Game
    file name (no ext)    ->  the ANSWER shown only on the admin page

Usage:  python tools/build_manifest.py        (run again whenever you add / rename / remove pictures)
Then in admin.html press "Re-scan picture folders" (or just reload the admin page).
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PICS = os.path.join(ROOT, "assets", "pictures")
EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".bmp", ".svg"}


def answer_from(name):
    base = os.path.splitext(name)[0]
    base = base.replace("_", " ")
    base = re.sub(r"\s*\(\d+\)\s*$", "", base)   # "Eiffel Tower (2).jpg" -> "Eiffel Tower"
    base = re.sub(r"\s+", " ", base).strip()
    return base


def main():
    if not os.path.isdir(PICS):
        os.makedirs(PICS)
    manifest = {}
    total = 0
    for cat in sorted(os.listdir(PICS), key=str.lower):
        d = os.path.join(PICS, cat)
        if not os.path.isdir(d) or cat.startswith("."):
            continue
        files = []
        for f in sorted(os.listdir(d), key=str.lower):
            if os.path.splitext(f)[1].lower() in EXT and os.path.isfile(os.path.join(d, f)):
                a = answer_from(f)
                if a:
                    files.append({"file": f, "answer": a})
        manifest[cat] = files
        total += len(files)
    out = os.path.join(PICS, "manifest.json")
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2, ensure_ascii=False)
    print("Wrote %s" % os.path.relpath(out, ROOT))
    for cat, files in manifest.items():
        print("  %-30s %3d picture%s%s" % (cat, len(files), "" if len(files) == 1 else "s", "" if files else "   (empty - greyed out in admin)"))
    print("Total pictures: %d" % total)


if __name__ == "__main__":
    sys.exit(main())
