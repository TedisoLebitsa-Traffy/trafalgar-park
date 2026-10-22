#!/usr/bin/env python3
"""Trafalgar Park - tiny static file server (standard library only).

Serves this folder on http://localhost:8000 and prints the two page URLs.
It ONLY serves files: no uploads, no API, no directory listings.

    python serve.py            # port 8000
    python serve.py 8123       # custom port
"""
import http.server
import mimetypes
import os
import socketserver
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
_nums = [a for a in sys.argv[1:] if a.isdigit()]
PORT = int(_nums[0]) if _nums else 8000

mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("image/avif", ".avif")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    # files only: refuse directory listings
    def list_directory(self, path):
        self.send_error(404, "No directory listing")
        return None

    def do_POST(self):
        self.send_error(405, "Read-only server")

    do_PUT = do_DELETE = do_PATCH = do_POST

    def end_headers(self):
        # always fetch fresh files so edits / new pictures show up on reload
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "--quiet" not in sys.argv:
            sys.stderr.write("  %s\n" % (fmt % args))


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    try:
        httpd = Server(("127.0.0.1", PORT), Handler)
    except OSError as e:
        print("Could not start on port %d: %s" % (PORT, e))
        print("Is another copy already running? Try:  python serve.py 8001")
        sys.exit(1)
    base = "http://localhost:%d" % PORT
    print("=" * 56)
    print("  TRAFALGAR PARK is running")
    print("  Display (capture this in TikTok LIVE Studio):")
    print("      %s/index.html" % base)
    print("  Admin (host only - NEVER capture this one):")
    print("      %s/admin.html" % base)
    print("  Press Ctrl+C to stop.")
    print("=" * 56)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
