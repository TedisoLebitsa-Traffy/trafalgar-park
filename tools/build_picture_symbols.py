#!/usr/bin/env python3
"""Build simple element-symbol clues. The filename is the host's answer."""
from pathlib import Path

ELEMENTS = {
    'H': 'Hydrogen', 'He': 'Helium', 'Li': 'Lithium', 'C': 'Carbon',
    'N': 'Nitrogen', 'O': 'Oxygen', 'F': 'Fluorine', 'Ne': 'Neon',
    'Na': 'Sodium', 'Mg': 'Magnesium', 'Al': 'Aluminium', 'Si': 'Silicon',
    'P': 'Phosphorus', 'S': 'Sulfur', 'Cl': 'Chlorine', 'K': 'Potassium',
    'Ca': 'Calcium', 'Fe': 'Iron', 'Cu': 'Copper', 'Zn': 'Zinc',
    'Ag': 'Silver', 'Au': 'Gold', 'Hg': 'Mercury', 'Pb': 'Lead',
    'B': 'Boron', 'Be': 'Beryllium', 'Ar': 'Argon', 'Sn': 'Tin',
    'I': 'Iodine', 'Pt': 'Platinum',
}
OUT = Path(__file__).resolve().parents[1] / 'assets/pictures/Chemical Symbols'

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for symbol, answer in ELEMENTS.items():
        # No name or title metadata: the audience should only see the symbol.
        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
<rect width="800" height="600" fill="#f8fafc"/>
<rect x="170" y="70" width="460" height="460" rx="28" fill="#e0f2fe" stroke="#0c4a6e" stroke-width="8"/>
<text x="400" y="365" text-anchor="middle" font-family="Arial, sans-serif" font-size="220" font-weight="bold" fill="#0c4a6e">{symbol}</text>
</svg>'''
        (OUT / (answer + '.svg')).write_text(svg, encoding='utf-8')
    print(f'Built {len(ELEMENTS)} chemical symbol clues')

if __name__ == '__main__':
    main()
