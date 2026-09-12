from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

start_anchor = " w.document.write('<!doctype html><html lang=\"ko\""
end_anchor = "</body></html>');"
start = s.find(start_anchor)
if start < 0:
    raise SystemExit('vcOpenTab document.write start not found')
end = s.find(end_anchor, start)
if end < 0:
    raise SystemExit('vcOpenTab document.write end not found')
end += len(end_anchor)

# 팝업 HTML에는 중첩 <script>를 넣지 않는다. 바깥 inline script가 조기 종료되면
# 이후 JavaScript가 모든 메뉴의 본문 텍스트로 노출될 수 있기 때문이다.
replacement = r''' w.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+name+(vc?' · value chain':' · 종목 정보')+'</title><style>'+styles+'\n'+extra+'</style></head><body>'+body+'</body></html>');'''

old = s[start:end]
if 'oracle-release-card.js' not in old and "'+body+'\n" not in old and "'+body+'\r\n" not in old:
    print('document.write block shape changed; replacing the complete popup writer defensively')

s = s[:start] + replacement + s[end:]

fixed = s[start:start + len(replacement)]
if 'oracle-release-card.js' in fixed or '<script' in fixed or '</script>' in fixed:
    raise SystemExit('nested script remains in vcOpenTab document.write')
if "w.document.write('<!doctype html" not in fixed or "</body></html>');" not in fixed:
    raise SystemExit('vcOpenTab replacement verification failed')

p.write_text(s, encoding='utf-8')
print('repaired vcOpenTab document.write runtime string; nested script removed')
