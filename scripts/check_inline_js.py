from pathlib import Path
import re
import subprocess
import tempfile

html = Path('index.html').read_text(encoding='utf-8')
blocks = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', html, flags=re.I | re.S)
if not blocks:
    raise SystemExit('no inline script blocks found')

for i, code in enumerate(blocks, 1):
    if not code.strip():
        continue
    with tempfile.NamedTemporaryFile('w', suffix='.js', encoding='utf-8', delete=False) as f:
        f.write(code)
        name = f.name
    r = subprocess.run(['node', '--check', name], text=True, capture_output=True)
    if r.returncode != 0:
        print(f'inline script #{i} syntax error')
        print(r.stderr)
        raise SystemExit(r.returncode)
print(f'inline javascript syntax ok: {len(blocks)} blocks')
