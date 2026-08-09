from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

pat = re.compile(r'\n?<!-- ZERO_BASE_INVESTMENT_SCORE_V2 -->\n<script>.*?</script>\n?', re.S)
matches = list(pat.finditer(s))
if not matches:
    raise SystemExit('ZERO_BASE_INVESTMENT_SCORE_V2 block not found')

block = matches[-1].group(0).strip('\n')
s = pat.sub('\n', s)
pos = s.rfind('</body>')
if pos < 0:
    raise SystemExit('final body close not found')

s = s[:pos].rstrip() + '\n' + block + '\n' + s[pos:]
p.write_text(s, encoding='utf-8')
