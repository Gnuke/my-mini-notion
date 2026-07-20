#!/usr/bin/env node
// PreToolUse 훅: .env 파일(.env, .env.local, .env.production 등)에 대한
// 읽기/수정/삭제를 차단한다. .env.example / .env.sample / .env.template은 허용.

let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const toolName = input.tool_name || '';
  const ti = input.tool_input || {};

  const ALLOWED = /^\.env\.(example|sample|template)$/i;
  const ENV_FILE = /^\.env(\..+)?$/i;

  const isProtectedPath = (p) => {
    if (!p || typeof p !== 'string') return false;
    const base = p.replace(/[\\/]+$/, '').split(/[\\/]/).pop();
    return ENV_FILE.test(base) && !ALLOWED.test(base);
  };

  let target = '';

  // 파일 경로를 직접 받는 도구들 (Read/Edit/Write/NotebookEdit/Grep 등)
  for (const p of [ti.file_path, ti.notebook_path, ti.path, ti.glob]) {
    if (isProtectedPath(p)) {
      target = p;
      break;
    }
  }

  // 셸 명령 안에서 .env 파일을 참조하는 경우 (cat .env, rm .env.local 등)
  if (!target && (toolName === 'Bash' || toolName === 'PowerShell')) {
    const cmd = String(ti.command || '');
    const re = /(^|[\s'"=/\\(])\.env(\.[\w.-]+)?(?=$|[\s'"):;|&<>])/g;
    let m;
    while ((m = re.exec(cmd)) !== null) {
      const token = '.env' + (m[2] || '');
      if (!ALLOWED.test(token)) {
        target = token;
        break;
      }
    }
  }

  if (target) {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: `.env 보호 훅: "${target}"에 대한 접근(읽기/수정/삭제)이 차단되었습니다. .env* 파일은 건드릴 수 없으며, .env.example만 수정할 수 있습니다.`,
        },
      })
    );
  }
  process.exit(0);
});
