from pathlib import Path

p = Path('scripts/apply_zero_base_investment_score.py')
s = p.read_text(encoding='utf-8')

def ensure_replace(old: str, new: str, label: str):
    global s
    if old in s:
        s = s.replace(old, new, 1)
    elif new not in s:
        raise SystemExit(f'{label} block not found')

old_val = """   const val=weighted([\n     [scoreRange(G.pct,-10,60),60],\n     [scoreRange(garp,0,2),40]\n   ]);"""
new_val = """   const val=weighted([\n     [scoreRange(G.pct,-10,60),45],\n     [scoreRange(garp,0,2),35],\n     [scoreRange(tp.c30,-5,10),20]\n   ]);"""
ensure_replace(old_val, new_val, 'valuation')

old_penalty = """   if(G.g==='spent')penalty+=6;else if(G.flagged||G.g==='flagged')penalty+=3;\n   if(fy1.up30!=null||fy1.dn30!=null){const u=fy1.up30||0,d=fy1.dn30||0;if(d>u)penalty+=clamp((d-u)/Math.max(1,u+d)*4,0,4);}\n   penalty=clamp(penalty,0,20);"""
new_penalty = """   if(G.g==='spent')penalty+=6;else if(G.flagged||G.g==='flagged')penalty+=3;\n   if(G.stage==='과열')penalty+=8;\n   if(G.pct!=null&&G.pct>60&&tp.c30!=null&&tp.c30<=0){\n     penalty+=clamp(((G.pct-60)/60*5)+((-tp.c30)/5*2),0,7);\n   }\n   if(fy1.up30!=null||fy1.dn30!=null){const u=fy1.up30||0,d=fy1.dn30||0;if(d>u)penalty+=clamp((d-u)/Math.max(1,u+d)*4,0,4);}\n   penalty=clamp(penalty,0,20);"""
ensure_replace(old_penalty, new_penalty, 'penalty')

old_note = """   note.innerHTML='<b>투자매력도(제로베이스)</b> · 오늘 전량 현금화 후 다시 산다는 가정으로 보유수량·평단·과거수익률은 점수에서 제외. <b>3개월 실적모멘텀 30% + 6개월 EPS 성장·가시성 25% + 밸류에이션 20% + 실적촉매 15% + 컨센서스 품질 10%</b>에서 무효화 리스크를 최대 20점 감점. 미확인 값은 50점으로 채우지 않고 가중치에서 제외하며 데이터 커버리지 55% 미만은 점수를 내지 않음. 보유 종목의 재매수 순위는 <b>보유 #1, #2…</b>로 표시하고 비보유 추적종목은 후보로 표시. 실제 비중결정은 이 순위 이후 기존 테마 중복·집중도를 별도 적용.';"""
new_note = """   note.innerHTML='<b>투자매력도(제로베이스)</b> · 오늘 전량 현금화 후 다시 산다는 가정으로 보유수량·평단·과거수익률은 점수에서 제외. <b>3개월 실적모멘텀 30% + 6개월 EPS 성장·가시성 25% + 밸류에이션 20% + 실적촉매 15% + 컨센서스 품질 10%</b>. 밸류에이션은 목표가 여력 45% + EPS성장 대비 FY+1 P/E 35% + 목표가 30일 리비전 20%로 구성해 큰 목표가 괴리 하나가 점수를 지배하지 않게 함. 무효화 리스크는 최대 20점 감점하며 <b>과열 단계는 -8점</b>, 목표가 여력이 60%를 넘는데 목표가가 정체·하향이면 최대 -7점을 추가 감점. 미확인 값은 50점으로 채우지 않고 가중치에서 제외하며 데이터 커버리지 55% 미만은 점수를 내지 않음. 보유 종목의 재매수 순위는 <b>보유 #1, #2…</b>로 표시하고 비보유 추적종목은 후보로 표시. 실제 비중결정은 이 순위 이후 기존 테마 중복·집중도를 별도 적용.';"""
ensure_replace(old_note, new_note, 'note')

old_inject = """if '</body>' not in s:\n    raise SystemExit('body close not found')\ns = s.replace('</body>', script + '\\n</body>', 1)"""
new_inject = """pos = s.rfind('</body>')\nif pos < 0:\n    raise SystemExit('body close not found')\ns = s[:pos] + script + '\\n' + s[pos:]"""
ensure_replace(old_inject, new_inject, 'final-body injection')

p.write_text(s, encoding='utf-8')
