import fs from 'node:fs';

const js = fs.readFileSync('journal.js', 'utf8');
const worker = fs.readFileSync('worker-core.js', 'utf8');
const ops = fs.readFileSync('OPS.md', 'utf8');

const checks = [
  [js.includes("dataset.v='journal'"), '07 투자일지 탭 마운트'],
  [js.includes("var brief=nav.querySelector('[data-v=\"brief\"]')"), '브리핑 앞 배치'],
  [js.includes('EPS 선행지표'), 'EPS 선행지표 입력'],
  [js.includes('투자 논리 무효화 조건'), '무효화 조건 입력'],
  [js.includes('가설 점수') && js.includes('타이밍 점수') && js.includes('비중 점수'), '3축 사후평가'],
  [js.includes('r.returnPct-r.benchmarkPct'), '초과수익 계산'],
  [js.includes("API='/api/investment-journal'"), '저장 API 연결'],
  [worker.includes('const JOURNAL_KEY = "investment-journal.json";'), 'R2 저장 키'],
  [worker.includes('url.pathname === "/api/investment-journal"'), '인증 API 라우트'],
  [worker.includes('<script src="/journal.js?v=20260905-01" defer>'), 'HTML 모듈 주입'],
  [ops.includes('종목보다 포트폴리오 구조를 먼저 본다.'), '구조 우선 운영 규율'],
  [ops.includes('승자 보유와 비중 축소를 동시에 운용한다.'), '승자 관리 운영 규율'],
];

for (const [ok, label] of checks) {
  if (!ok) throw new Error(`투자일지 회귀: ${label}`);
}
console.log(`투자일지 정적 회귀 ${checks.length}/${checks.length} 통과`);
