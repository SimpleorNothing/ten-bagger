from pathlib import Path

p = Path('aisd.js')
s = p.read_text(encoding='utf-8')

repls = {
    '투자 $13B+·Azure 공급': 'Azure primary · Cloud 구매액 미공개 · 수익배분 ~2030',
    '투자 $8B+·Trainium 5GW': 'AWS $100B+ / 10년 · 최대 5GW · Amazon 투자 $8B+',
    '투자 TPU 수 GW': 'Google TPU 다년계약 · 총액 미공개',
}
for old, new in repls.items():
    if old in s:
        s = s.replace(old, new, 1)

anchor = '<div class="ds-mfn">2026-07 · 공개 보도 기준 근사치 · narrative 층(숫자 파일 무관)</div>'
if anchor not in s:
    raise SystemExit('map footer anchor not found')

block = '''<div class="ds-mnote" style="margin-top:10px">
      <b>주요 장기 Cloud 계약·Commitment</b>
      <span class="stl"><b>AWS ↔ Anthropic:</b> AWS 기술 지출 <b>$100B+ / 10년</b> · 최대 <b>5GW</b> 컴퓨팅 · Amazon의 Anthropic 누적 투자 <b>$8B+</b>.</span>
      <span class="stl"><b>AWS ↔ OpenAI:</b> 기존 <b>$38B / 7년</b> + 추가 <b>$100B / 8년</b> 공개 계약. 단순 합산 최대 <b>~$138B</b>이나 계약범위 중복 여부는 공개자료에서 확인 필요.</span>
      <span class="stl"><b>Azure ↔ OpenAI:</b> Microsoft는 primary cloud partner 관계 유지 · revenue sharing은 <b>2030년</b>까지, IP 라이선스는 <b>2032년</b>까지. Azure Cloud 구매 commitment 총액은 <b>미공개</b>.</span>
      <span class="stl"><b>Google Cloud ↔ Anthropic:</b> TPU 기반 다년 컴퓨팅 계약은 확인되나 총 구매금액·세부 기간은 <b>자료에서 확인되지 않음</b>.</span>
      <span class="stl"><b>RPO 질 점검:</b> 장기계약 금액뿐 아니라 CSP의 고객사 지분투자, 해지·감액 가능성, 고객집중도를 함께 봐야 함.</span>
    </div>
    <div class="ds-mfn">2026-08 · 공개계약/회사발표 기준 · 금액 중복 가능성은 별도 표시 · narrative 층(숫자 파일 무관)</div>'''

s = s.replace(anchor, block, 1)
p.write_text(s, encoding='utf-8')
