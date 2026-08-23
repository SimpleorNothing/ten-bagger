import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRows } from './sync-holdings.mjs';

test('종목 추가로 행이 밀려도 계좌 구간과 라벨로 모든 행을 찾는다', () => {
  const grid = Array.from({ length: 140 }, () => []);
  const put = (row, col, value) => { grid[row - 1][col - 1] = value; };
  put(4,2,'개인투자');
  [['테슬라',5],['마벨',9],['마이크론',13],['루멘텀',17],['버티브',21],['블룸에너지',25],
   ['삼성전자',29],['레버리지셰어즈 메모리DRAM3배',33],['한미반도체',37],['KODEX AI반도체핵심장비',41],['나머지(현금)',45]]
    .forEach(([v,r]) => put(r,3,v));
  put(46,2,'IRP');
  [['PLUS 코스피50',47],['RISE 200채권혼합50',48],['PLUS 글로벌HBM반도체',49],['RISE 삼성전자SK하이닉스채권혼합50',50]]
    .forEach(([v,r]) => put(r,3,v));
  put(51,2,'퇴직연금');
  [['RISE 200채권혼합50',52],['KODEX 미국AI반도체TOP3플러스',56],['PLUS 글로벌HBM반도체',60],
   ['RISE 삼성전자SK하이닉스채권혼합50',64],['KODEX AI반도체핵심장비',68],['KODEX 미국AI광통신네트워크',72],
   ['KODEX AI전력핵심설비',76],['SOL 미국AI전력인프라',80],['나머지(현금)',84]]
    .forEach(([v,r]) => put(r,3,v));
  put(85,2,'합계');
  put(129,3,'코스피50');

  const rows = resolveRows(grid);
  assert.equal(rows.total, 84);
  assert.equal(rows.pEquip, 40);
  assert.equal(rows.dcEquip, 67);
  assert.equal(rows.kospi50px, 128);
});
