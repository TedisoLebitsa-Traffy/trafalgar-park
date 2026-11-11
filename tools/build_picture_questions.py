#!/usr/bin/env python3
"""Compile curated picture-question banks using the committed visual asset index.

Edit tools/src/picture_*.txt. Rows: answer|question|visual reference|source (optional).
@ = person photograph, $ = subject photograph, # = existing illustrated clue,
^ = original prop/board diagram. Source may be a full URL or a Wikipedia title.
This builder is offline; it never silently substitutes an unrelated picture.
"""
import hashlib
import json
from pathlib import Path
import re
import urllib.parse

ROOT = Path(__file__).resolve().parents[1]

def source_url(text):
    return text if text.startswith('https://') else 'https://en.wikipedia.org/wiki/' + urllib.parse.quote(text.replace(' ', '_'), safe='()')

def main():
    index = json.loads((ROOT / 'assets/clue-photos/index.json').read_text(encoding='utf-8'))
    result = {}
    for file in sorted((ROOT / 'tools/src').glob('picture_*.txt')):
        category = None
        for number, raw in enumerate(file.read_text(encoding='utf-8').splitlines(), 1):
            row = raw.strip()
            if not row:
                continue
            if row.startswith('[') and row.endswith(']'):
                category = row[1:-1]
                result.setdefault(category, [])
                continue
            parts = row.split('|')
            if not category or len(parts) not in (3, 4):
                raise ValueError(f'{file.name}:{number}: expected answer|question|visual|source')
            answer, question, visual = parts[:3]
            if visual not in index:
                raise ValueError(f'{file.name}:{number}: unresolved visual {visual}')
            ref = index[visual]
            if ref.get('media'):
                path = ROOT / ref['media']
            else:
                path = ROOT / 'assets/clue-atlases' / ref['atlas']
            if not path.is_file():
                raise ValueError(f'{file.name}:{number}: missing {path}')
            source = parts[3] if len(parts) == 4 else visual[1:] if visual.startswith('@') else answer.split(' / ')[0]
            if category == 'Pixar Characters' and len(parts) == 3:
                for word, page in [('Inside Out','Inside Out (2015 film)'), ('Monsters, Inc.','Monsters, Inc.'), ('Ratatouille','Ratatouille (film)'), ('Coco','Coco (2017 film)'), ('The Incredibles','The Incredibles'), ('Brave','Brave (2012 film)'), ('Soul','Soul (2020 film)'), ('Luca','Luca (2021 film)')]:
                    if word.lower() in question.lower(): source = page; break
                if re.search(r'\bin Up\b', question): source = 'Up (2009 film)'
            identity = '\0'.join((category, answer.casefold(), question.casefold()))
            result[category].append(dict(ref, id='q-' + hashlib.sha1(identity.encode()).hexdigest()[:16], answer=answer, question=question, source=source_url(source)))
    for category, rows in result.items():
        ids = [r['id'] for r in rows]
        if len(ids) != len(set(ids)):
            raise ValueError('Duplicate question in ' + category)
    (ROOT / 'data/picture_questions.json').write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'Compiled {sum(map(len,result.values()))} picture questions across {len(result)} banks')

if __name__ == '__main__':
    main()
