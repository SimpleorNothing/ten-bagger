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

replacement = r''' w.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+name+(vc?' · value chain':' · 종목 정보')+'</title><style>'+styles+'\n'+extra+'</style></head><body>'+body+'</body></html>');'''

old = s[start:end]
if "'+body+'\n" not in old and "'+body+'\r\n" not in old and "'+body+'\n\n" not in old:
    print('document.write block did not contain the known broken literal newline, replacing defensively anyway')

s = s[:start] + replacement + s[end:]
p.write_text(s, encoding='utf-8')
print('repaired vcOpenTab document.write runtime string')
