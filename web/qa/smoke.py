"""Maintained smoke test: serve the production bundle (web/dist), walk every
mode, fail on any console/page error, and verify the gallery story-art stage.

Run from the repo root (after building — see README):
    ./start.sh --rebuild        # needs Node 18+ once, then serves; Ctrl+C
    python3 web/qa/smoke.py     # needs: pip install playwright (+ browsers)

Exit 0 = all green. Serves web/dist on 127.0.0.1 only.
"""
import functools
import http.server
import socket
import sys
import threading
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DIST = REPO / 'web' / 'dist'
MODES = ['modes', 'chat', 'sprint', 'stories', 'drills', 'grammar', 'vocab',
         'progress', 'settings', 'help']


def main() -> int:
    if not (DIST / 'index.html').exists():
        print(f'Missing build: {DIST}/index.html — run ./start.sh --rebuild first.')
        return 2
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print('Need playwright: pip install playwright && playwright install chromium')
        return 2

    sock = socket.socket()
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
    sock.close()
    srv = http.server.ThreadingHTTPServer(
        ('127.0.0.1', port),
        functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(DIST)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    errors, failures = [], []
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 1440, 'height': 900})
        pg.on('console', lambda m: errors.append(f'console.{m.type}: {m.text[:160]}')
              if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errors.append(f'pageerror: {str(e)[:160]}'))
        pg.goto(f'http://127.0.0.1:{port}/', wait_until='networkidle')
        for m in MODES:
            try:
                pg.click(f'nav button[data-mode="{m}"]')
                pg.wait_for_selector(f'main#view[data-mode="{m}"]', timeout=8000)
            except Exception as e:
                failures.append(f'mode {m}: {str(e)[:120]}')
        # Gallery story-art stage: svg + caption + working switcher.
        try:
            pg.click('nav button[data-mode="modes"]')
            pg.wait_for_selector('[data-testid="anim-scene"] svg', timeout=8000)
            cap = pg.locator('[data-testid="anim-scene"] figcaption')
            before = cap.inner_text(timeout=5000)
            pg.click('[data-testid="anim-scene"] ~ .row button:has-text("पाऊस")')
            pg.wait_for_timeout(300)
            after = cap.inner_text()
            assert 'पाऊस' in after and after != before, f'caption stuck at {before!r}'
        except Exception as e:
            failures.append(f'art-stage: {str(e)[:120]}')
        b.close()
    srv.shutdown()

    ok = not errors and not failures
    print(f'modes: {len(MODES) - len([f for f in failures if f.startswith("mode")])}/{len(MODES)}')
    for f in failures:
        print('FAIL', f)
    for e in errors:
        print('ERR', e)
    print('SMOKE PASS' if ok else 'SMOKE FAIL')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
