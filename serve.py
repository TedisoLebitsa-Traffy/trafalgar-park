#!/usr/bin/env python3
"""Trafalgar Park - tiny server (standard library only).

Serves this folder and (optionally) relays messages between devices on your own network (LAN mode).
No internet is needed and nothing leaves your network.

    python serve.py              # this PC only:  http://localhost:8000
    python serve.py --lan        # also reachable from an iPad / phone on the same Wi-Fi (prints the addresses)
    python serve.py 8123         # custom port
"""
import http.server
import json
import mimetypes
import os
import queue
import socket
import socketserver
import sys
import threading
import urllib.parse

ROOT = os.path.dirname(os.path.abspath(__file__))
_nums = [a for a in sys.argv[1:] if a.isdigit()]
PORT = int(_nums[0]) if _nums else 8000
LAN = "--lan" in sys.argv

mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("image/avif", ".avif")
mimetypes.add_type("application/manifest+json", ".webmanifest")

# ---- LAN relay: every message POSTed to /lan/send is pushed to every other device listening on /lan/events ----
CLIENTS = {}                    # client id -> queue of JSON strings
LOCK = threading.Lock()
MAX_BODY = 8 * 1024 * 1024      # pictures travel as data: URLs


def lan_addresses():
    ips = []
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if ip not in ips and not ip.startswith("127.") and not ip.startswith("169.254."):
                ips.append(ip)
    except OSError:
        pass
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))        # no packet is sent; just asks the OS which adapter would be used
        ip = s.getsockname()[0]
        s.close()
        if ip not in ips and not ip.startswith("127."):
            ips.insert(0, ip)
    except OSError:
        pass
    return ips


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def list_directory(self, path):
        self.send_error(404, "No directory listing")
        return None

    def do_GET(self):
        p = urllib.parse.urlparse(self.path)
        if p.path.endswith("/lan/events"):
            return self.events(urllib.parse.parse_qs(p.query).get("id", ["?"])[0])
        if p.path.endswith("/lan/info"):
            body = json.dumps({"ips": lan_addresses(), "port": PORT, "lan": LAN}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        return super().do_GET()

    def events(self, cid):
        q = queue.Queue(maxsize=300)
        with LOCK:
            CLIENTS[cid] = q
        try:
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("X-Accel-Buffering", "no")
            self.end_headers()
            self.wfile.write(b": connected\n\n")
            self.wfile.flush()
            while True:
                try:
                    item = q.get(timeout=10)
                    self.wfile.write(("data: " + item + "\n\n").encode("utf-8"))
                except queue.Empty:
                    self.wfile.write(b": keepalive\n\n")
                self.wfile.flush()
        except (BrokenPipeError, ConnectionError, OSError):
            pass
        finally:
            with LOCK:
                if CLIENTS.get(cid) is q:
                    del CLIENTS[cid]

    def do_POST(self):
        p = urllib.parse.urlparse(self.path)
        if not p.path.endswith("/lan/send"):
            self.send_error(405, "Read-only server")
            return
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > MAX_BODY:
            self.send_error(413, "Bad size")
            return
        body = self.rfile.read(n).decode("utf-8", "replace").replace("\n", " ").replace("\r", " ")
        sender = urllib.parse.parse_qs(p.query).get("id", ["?"])[0]
        with LOCK:
            targets = [q for cid, q in CLIENTS.items() if cid != sender]
        for q in targets:
            try:
                q.put_nowait(body)
            except queue.Full:
                pass                                    # a stalled device never blocks the others
        self.send_response(204)
        self.end_headers()

    do_PUT = do_DELETE = do_PATCH = lambda self: self.send_error(405, "Read-only server")

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")     # always fetch fresh files
        super().end_headers()

    def log_message(self, fmt, *args):
        if "--quiet" not in sys.argv:
            sys.stderr.write("  %s\n" % (fmt % args))


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    host = "0.0.0.0" if LAN else "127.0.0.1"
    try:
        httpd = Server((host, PORT), Handler)
    except OSError as e:
        print("Could not start on port %d: %s" % (PORT, e))
        print("Is another copy already running? Try:  python serve.py --lan 8001")
        sys.exit(1)
    base = "http://localhost:%d" % PORT
    print("=" * 62)
    print("  TRAFALGAR PARK is running%s" % ("  (LAN mode)" if LAN else ""))
    if LAN:
        ips = lan_addresses()
        print("  On THIS laptop open (host, has the answers):")
        print("      %s/admin.html?lan=1" % base)
        print("  On the iPad / phone / second screen (same Wi-Fi) open ONE of:")
        for ip in ips or ["<your-laptop-ip>"]:
            print("      http://%s:%d/index.html?lan=1" % (ip, PORT))
        print("  (or open  %s/lan.html  here for a QR code to scan)" % base)
        print("  If Windows asks, ALLOW Python through the firewall on PRIVATE networks.")
    else:
        print("  Display (capture this in TikTok LIVE Studio):  %s/index.html" % base)
        print("  Admin (host only - NEVER capture this one):    %s/admin.html" % base)
        print("  For an iPad / phone on your Wi-Fi run:  python serve.py --lan")
    print("  Press Ctrl+C to stop.")
    print("=" * 62)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
