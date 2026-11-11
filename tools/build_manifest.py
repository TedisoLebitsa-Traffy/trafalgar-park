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
        if not os.path.isdir(d) or cat.startswith(".") or cat.upper().startswith("PLACEHOLDER"):
            continue
        files = []
        for f in sorted(os.listdir(d), key=str.lower):
            if os.path.splitext(f)[1].lower() in EXT and os.path.isfile(os.path.join(d, f)):
                a = answer_from(f)
                if a:
                    files.append({"file": f, "answer": a})
        manifest[cat] = files
        total += len(files)
    # Illustrated quiz sheets are kept outside the answer-named photo folders.
    # Only the host loads this manifest; the audience receives one cropped Blob.
    extra = os.path.join(ROOT, "data", "picture_illustrations.json")
    if os.path.isfile(extra):
        with open(extra, encoding="utf-8") as fh:
            categories = json.load(fh)
        for cat, clues in categories.items():
            for clue in clues:
                atlas = clue.get("atlas", "")
                if os.path.basename(atlas) != atlas or not atlas.endswith(".png"):
                    raise ValueError("Invalid atlas filename: " + atlas)
                if not os.path.isfile(os.path.join(ROOT, "assets", "clue-atlases", atlas)):
                    raise ValueError("Missing atlas: " + atlas)
                if type(clue.get("cell")) is not int or not 0 <= clue["cell"] < 6 or not clue.get("answer"):
                    raise ValueError("Invalid illustration clue in " + cat)
            manifest.setdefault(cat, []).extend(clues)
            total += len(clues)
    questions = os.path.join(ROOT, "data", "picture_questions.json")
    if os.path.isfile(questions):
        with open(questions, encoding="utf-8") as fh:
            banks = json.load(fh)
        for cat, clues in banks.items():
            for clue in clues:
                if not clue.get("id") or not clue.get("answer") or not clue.get("question") or not clue.get("source"):
                    raise ValueError("Incomplete picture question in " + cat)
                asset = clue.get("media") or "assets/clue-atlases/" + clue.get("atlas", "")
                absolute = os.path.abspath(os.path.join(ROOT, asset))
                if not absolute.startswith(os.path.join(ROOT, "assets") + os.sep) or not os.path.isfile(absolute):
                    raise ValueError("Invalid question image: " + asset)
            manifest.setdefault(cat, []).extend(clues)
            total += len(clues)
    hints = os.path.join(ROOT, "data", "picture_photo_hints.json")
    if os.path.isfile(hints):
        with open(hints, encoding="utf-8") as fh:
            hints = json.load(fh)
        for cat, clues in manifest.items():
            for clue in clues:
                if clue.get("file") and cat + "/" + clue["file"] in hints:
                    clue.update(hints[cat + "/" + clue["file"]])
    out = os.path.join(PICS, "manifest.json")
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2, ensure_ascii=False)
    print("Wrote %s" % os.path.relpath(out, ROOT))
    for cat, files in manifest.items():
        print("  %-30s %3d picture%s%s" % (cat, len(files), "" if len(files) == 1 else "s", "" if files else "   (empty - greyed out in admin)"))
    print("Total pictures: %d" % total)


if __name__ == "__main__":
    sys.exit(main())
