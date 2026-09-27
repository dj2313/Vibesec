/**
 * Returns shared CSS styles for VibeSec webviews.
 * Designed to the Impeccable craft-floor spec:
 * - Charcoal/slate palette with electric blue accents (Linear/Vercel aesthetic)
 * - System font stack with JetBrains Mono for code values
 * - All interactive states: hover, focus, disabled, loading, empty
 * - Custom scrollbars, selection, carets themed from palette
 * - No gradient text, no kickers/eyebrows, no hard-offset shadows
 */
export function getBaseStyles(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg-base: #0D1117;
      --bg-surface: #161B22;
      --bg-elevated: #1C2128;
      --bg-hover: #21262D;
      --bg-input: #0D1117;

      --border: #30363D;
      --border-subtle: #21262D;

      --text-primary: #E6EDF3;
      --text-secondary: #8B949E;
      --text-muted: #484F58;
      --text-code: #79C0FF;

      --accent-blue: #2F81F7;
      --accent-blue-hover: #58A6FF;
      --accent-blue-subtle: rgba(47,129,247,0.12);
      --accent-blue-dim: rgba(47,129,247,0.06);

      --red: #F85149;
      --red-subtle: rgba(248,81,73,0.12);
      --amber: #D29922;
      --amber-subtle: rgba(210,153,34,0.12);
      --green: #3FB950;
      --green-subtle: rgba(63,185,80,0.12);
      --purple: #A371F7;
      --purple-subtle: rgba(163,113,247,0.12);

      --radius-sm: 4px;
      --radius: 6px;
      --radius-lg: 10px;

      --shadow-sm: 0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.6);
      --shadow: 0 4px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3);
      --shadow-lg: 0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4);

      --font-ui: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      --font-mono: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace;

      --transition: 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    html, body {
      height: 100%;
      background: var(--bg-base);
      color: var(--text-primary);
      font-family: var(--font-ui);
      font-size: 13px;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    /* ── Scrollbars ─────────────────────────────────────── */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

    /* ── Selection ──────────────────────────────────────── */
    ::selection { background: rgba(47,129,247,0.25); color: var(--text-primary); }

    /* ── Typography ─────────────────────────────────────── */
    h1 { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; color: var(--text-primary); }
    h2 { font-size: 14px; font-weight: 600; letter-spacing: -0.01em; color: var(--text-primary); }
    h3 { font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-secondary); }
    code, .mono { font-family: var(--font-mono); font-size: 11.5px; }

    /* ── Decision Badges ────────────────────────────────── */
    .badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px; border-radius: 3px;
      font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
      text-transform: uppercase; font-family: var(--font-mono);
      line-height: 1.6;
    }
    .badge-block { background: var(--red-subtle); color: var(--red); border: 1px solid rgba(248,81,73,0.3); }
    .badge-ask   { background: var(--amber-subtle); color: var(--amber); border: 1px solid rgba(210,153,34,0.3); }
    .badge-allow { background: var(--green-subtle); color: var(--green); border: 1px solid rgba(63,185,80,0.3); }
    .badge-info  { background: var(--accent-blue-subtle); color: var(--accent-blue-hover); border: 1px solid rgba(47,129,247,0.3); }
    .badge-critical { background: var(--red-subtle); color: var(--red); border: 1px solid rgba(248,81,73,0.3); }
    .badge-high  { background: var(--amber-subtle); color: var(--amber); border: 1px solid rgba(210,153,34,0.3); }

    /* ── Severity dot ───────────────────────────────────── */
    .dot {
      display: inline-block; width: 7px; height: 7px;
      border-radius: 50%; flex-shrink: 0;
    }
    .dot-block { background: var(--red); box-shadow: 0 0 6px rgba(248,81,73,0.6); }
    .dot-ask   { background: var(--amber); box-shadow: 0 0 6px rgba(210,153,34,0.5); }
    .dot-allow { background: var(--green); }
    .dot-live  { background: var(--green); animation: pulse-dot 2s ease-in-out infinite; }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(63,185,80,0.4); }
      50%       { opacity: 0.8; box-shadow: 0 0 0 5px rgba(63,185,80,0); }
    }

    /* ── Buttons ────────────────────────────────────────── */
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: var(--radius-sm);
      font-family: var(--font-ui); font-size: 12px; font-weight: 500;
      cursor: pointer; border: 1px solid transparent;
      transition: var(--transition); white-space: nowrap;
      text-decoration: none;
    }
    .btn-primary {
      background: var(--accent-blue); color: #fff; border-color: var(--accent-blue);
    }
    .btn-primary:hover { background: var(--accent-blue-hover); border-color: var(--accent-blue-hover); }
    .btn-ghost {
      background: transparent; color: var(--text-secondary); border-color: var(--border);
    }
    .btn-ghost:hover { background: var(--bg-hover); color: var(--text-primary); border-color: var(--text-muted); }
    .btn-danger {
      background: var(--red-subtle); color: var(--red); border-color: rgba(248,81,73,0.3);
    }
    .btn-danger:hover { background: rgba(248,81,73,0.2); }

    .btn:focus-visible { outline: 2px solid var(--accent-blue); outline-offset: 2px; }
    .btn:active { transform: scale(0.98); }

    /* ── Surface cards ──────────────────────────────────── */
    .surface {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }
    .surface-elevated {
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow-sm);
    }

    /* ── Stat tile ──────────────────────────────────────── */
    .stat-tile {
      display: flex; flex-direction: column; gap: 2px;
      padding: 12px 16px;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }
    .stat-value { font-size: 22px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.2; }
    .stat-label { font-size: 11px; font-weight: 500; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-tile.blue  .stat-value { color: var(--accent-blue-hover); }
    .stat-tile.red   .stat-value { color: var(--red); }
    .stat-tile.green .stat-value { color: var(--green); }
    .stat-tile.amber .stat-value { color: var(--amber); }

    /* ── Log rows ───────────────────────────────────────── */
    .log-row {
      display: grid;
      align-items: center;
      padding: 9px 14px;
      border-bottom: 1px solid var(--border-subtle);
      transition: background var(--transition);
      gap: 10px;
    }
    .log-row:last-child { border-bottom: none; }
    .log-row:hover { background: var(--bg-hover); }

    /* ── Input ──────────────────────────────────────────── */
    input, select {
      background: var(--bg-input); color: var(--text-primary);
      border: 1px solid var(--border); border-radius: var(--radius-sm);
      padding: 6px 10px; font-family: var(--font-ui); font-size: 12px;
      outline: none; transition: border-color var(--transition);
      caret-color: var(--accent-blue);
    }
    input:focus, select:focus { border-color: var(--accent-blue); box-shadow: 0 0 0 3px var(--accent-blue-dim); }

    /* ── Divider ────────────────────────────────────────── */
    .divider { border: none; border-top: 1px solid var(--border); margin: 0; }

    /* ── Empty state ────────────────────────────────────── */
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 10px;
      padding: 40px 20px; color: var(--text-muted); text-align: center;
    }
    .empty-state svg { opacity: 0.3; }
    .empty-state p { font-size: 12px; max-width: 200px; line-height: 1.5; }

    /* ── Tooltip (simple title) ─────────────────────────── */
    [title] { cursor: default; }

    /* ── Loading shimmer ────────────────────────────────── */
    .shimmer {
      background: linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-elevated) 50%, var(--bg-surface) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s ease-in-out infinite;
      border-radius: var(--radius-sm);
    }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

    /* ── Slide-in for new threats ───────────────────────── */
    @keyframes slide-in {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .animate-in { animation: slide-in 200ms cubic-bezier(0.4, 0, 0.2, 1) forwards; }
  `;
}
