from pathlib import Path

p = Path('aisd.js')
s = p.read_text(encoding='utf-8')
old = '''<div class="ds-vtr"><b>재판정 트리거(하나라도 점등 시 재판정):</b> ① 2026E~2028E 추정 <span class="ds-rev dn">▼하향</span> 전환(수요 둔화 경보) · ② DDR5 현물&lt;계약 롤오버(공급 과잉 신호) · ③ 가격 상승률이 리비전 속도 추월(성숙 전환)</div>'''
new = '''<div class="ds-vtr"><b>재판정 트리거(하나라도 점등 시 재판정):</b> ① 2026E~2028E 추정 <span class="ds-rev dn">▼하향</span> 전환(수요 둔화 경보) · ② DDR5 현물&lt;계약 롤오버(공급 과잉 신호) · ③ 가격 상승률이 리비전 속도 추월(성숙 전환) · ④ <b>CSP 외부 Compute 구매 축소·미갱신</b>(Google→xAI/SpaceX, Microsoft·OpenAI→CoreWeave 등) — 자체 캐파를 놀리기 전에 외부 임차를 먼저 줄일 가능성이 있어 RPO·CAPEX 하향보다 빠른 AI 수요 조기경보</div>'''
if old not in s:
    raise SystemExit('target trigger block not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')
