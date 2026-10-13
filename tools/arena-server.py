"""
FATH ARENA - local server for the booth.

- Listens on 127.0.0.1 only, so nothing is exposed on the venue network.
- Sends correct MIME types for .mjs / .wasm / .task (the Windows registry
  sometimes maps .js to text/plain, which breaks ES modules).

Usage:  python tools/arena-server.py [PORT]
"""
import functools
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.wasm': 'application/wasm',
    '.task': 'application/octet-stream',
    '.woff2': 'font/woff2',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
}


class Handler(http.server.SimpleHTTPRequestHandler):
    def guess_type(self, path):
        return TYPES.get(os.path.splitext(path)[1].lower()) or super().guess_type(path)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


class Server(http.server.ThreadingHTTPServer):
    allow_reuse_address = False  # on Windows, reuse would silently share the port with another app


if __name__ == '__main__':
    handler = functools.partial(Handler, directory=ROOT)
    try:
        server = Server(('127.0.0.1', PORT), handler)
    except OSError:
        print(f'Port {PORT} is busy - the arena server is probably already running.')
        sys.exit(0)
    print(f'FATH ARENA server: http://localhost:{PORT}/arena.html   (close this window to stop)')
    with server:
        server.serve_forever()
