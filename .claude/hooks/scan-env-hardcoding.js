#!/usr/bin/env node
// Stop 훅: 작업이 끝날 때 git 변경 파일에서 하드코딩된 환경설정 후보
// (URL, API 키, 토큰 등)를 탐지한다. 발견되면 Claude를 멈추지 않고
// .env.example에 정리하도록 지시한다. 동일한 발견은 캐시로 한 번만 보고.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  let input = {};
  try {
    input = JSON.parse(raw);
  } catch {}

  // 이미 이 훅 때문에 이어서 작업한 뒤의 정지라면 그대로 종료 (무한 루프 방지)
  if (input.stop_hook_active) process.exit(0);

  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();

  let files = [];
  try {
    const out = execSync('git status --porcelain -uall', {
      cwd: root,
      encoding: 'utf8',
    });
    files = out
      .split('\n')
      .filter(Boolean)
      .map((l) => l.slice(3).trim())
      .map((f) => (f.includes(' -> ') ? f.split(' -> ').pop() : f))
      .map((f) => f.replace(/^"|"$/g, ''));
  } catch {
    process.exit(0);
  }

  const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/i;
  const SKIP =
    /(^|[\\/])(node_modules|\.next|\.git|\.claude|\.agents|\.specify)([\\/]|$)|package-lock\.json/;
  files = [...new Set(files)].filter((f) => CODE_EXT.test(f) && !SKIP.test(f));

  const BENIGN_URL =
    /w3\.org|fonts\.googleapis|fonts\.gstatic|registry\.npmjs|github\.com|nextjs\.org|schemas?\./i;

  const PATTERNS = [
    {
      re: /(['"`])https?:\/\/[^'"`\s]+\1/,
      label: 'URL 리터럴',
      benign: BENIGN_URL,
    },
    {
      re: /\b(api[_-]?key|apikey|secret|token|password|passwd|client[_-]?id|client[_-]?secret|access[_-]?key)\b\s*[:=]\s*(['"`])[^'"`]{8,}\2/i,
      label: '자격증명 의심 값',
    },
    { re: /(['"`])eyJ[A-Za-z0-9_-]{20,}\./, label: 'JWT 의심 토큰' },
    { re: /(['"`])(sk|pk)[-_][A-Za-z0-9_-]{16,}\1/, label: 'API 키 의심 값' },
    { re: /\bAKIA[0-9A-Z]{16}\b/, label: 'AWS 액세스 키 의심 값' },
  ];

  const findings = [];
  for (const f of files) {
    let text;
    try {
      text = fs.readFileSync(path.join(root, f), 'utf8');
    } catch {
      continue;
    }
    text.split('\n').forEach((line, i) => {
      for (const { re, label, benign } of PATTERNS) {
        if (re.test(line) && !(benign && benign.test(line))) {
          findings.push(`${f}:${i + 1} [${label}] ${line.trim().slice(0, 120)}`);
          break;
        }
      }
    });
  }

  if (!findings.length) process.exit(0);

  // 동일한 발견 목록은 다시 보고하지 않는다
  const hash = crypto.createHash('sha1').update(findings.join('\n')).digest('hex');
  const cacheFile = path.join(root, '.claude', '.env-scan-cache');
  try {
    if (fs.readFileSync(cacheFile, 'utf8').trim() === hash) process.exit(0);
  } catch {}
  try {
    fs.writeFileSync(cacheFile, hash);
  } catch {}

  const shown = findings.slice(0, 30);
  const dropped = findings.length - shown.length;

  console.log(
    JSON.stringify({
      decision: 'block',
      reason:
        '[.env.example 동기화 훅] 변경된 파일에서 하드코딩된 환경설정 후보가 발견되었습니다:\n' +
        shown.join('\n') +
        (dropped > 0 ? `\n(외 ${dropped}건 생략)` : '') +
        '\n\n지침: 위 후보 중 실제 환경설정(서비스 URL, API 키, 토큰, 시크릿 등)에 해당하는 값만 골라 .env.example에 키 이름과 placeholder 값(실제 값 금지)으로 추가·갱신하세요. 단순 외부 링크나 문서 URL은 무시하세요. .env 파일 자체는 보호 훅으로 차단되어 있으므로 .env.example만 수정하세요. 코드 리팩터링은 사용자가 요청하지 않는 한 하지 마세요. 반영할 것이 없으면 그 이유만 짧게 언급하고 종료하세요.',
    })
  );
  process.exit(0);
});
