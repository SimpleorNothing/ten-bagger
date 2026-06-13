// wrangler.jsonc 에 MEMO_BUCKET(R2) 바인딩을 활성화한다.
// 사용: node scripts/enable-r2.mjs [bucket_name]   (기본: ten-bagger-memo)
// 파일을 알려진 안정 구조로 결정적으로 재생성한다.
import fs from "node:fs";

const bucket = (process.argv[2] || "ten-bagger-memo").trim();
if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) {
  console.error(`enable-r2: invalid R2 bucket name: "${bucket}"`);
  process.exit(1);
}

const out = `{
  "name": "ten-bagger",
  "compatibility_date": "2026-05-22",
  "main": "worker.js",
  "assets": {
    "directory": ".",
    "binding": "ASSETS",
    // Run worker.js before serving any asset so the password gate also covers the .json data files.
    "run_worker_first": true
  },
  // 메모 저장용 R2 (DA Space 방식) — Setup MEMO R2 워크플로가 버킷을 생성/연결.
  // 비활성화하려면 아래 r2_buckets 블록을 주석 처리(메모는 localStorage 로 graceful degrade).
  "r2_buckets": [
    { "binding": "MEMO_BUCKET", "bucket_name": "${bucket}" }
  ]
}
`;

fs.writeFileSync("wrangler.jsonc", out);
console.log(`enable-r2: wrote wrangler.jsonc with MEMO_BUCKET bucket_name ${bucket}`);
