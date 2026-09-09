"""Run the local studio and its same-origin Control Centre API."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit
import json
from populator.control_centre import HubService
from populator.pool_editor import PoolEditor

ROOT = Path(__file__).resolve().parent
SERVICE = HubService(ROOT)
EDITOR = PoolEditor(ROOT)


class StudioHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def reply(self, code, value):
        content = json.dumps(value).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_GET(self):
        if urlsplit(self.path).path == "/api/hub":
            try:
                self.reply(200, SERVICE.snapshot())
            except Exception as error:
                self.reply(500, {"error":str(error)})
        else:
            super().do_GET()

    def do_POST(self):
        # Custom header + exact origin prevent cross-site mutation of local data.
        host = self.headers.get("Host", "")
        allowed = {f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}"}
        if host not in allowed or self.headers.get("Origin") != "http://" + host or self.headers.get("X-Forge-Action") != "1":
            self.reply(403, {"error":"Use the local Prompt Forge studio to run this action."})
            return
        action = urlsplit(self.path).path
        if action not in {"/api/hub/audit", "/api/hub/backup", "/api/pools/preview", "/api/pools/apply", "/api/pools/restore"}:
            self.reply(404, {"error":"Unknown action"})
            return
        try:
            if action.startswith("/api/hub/"):
                result = SERVICE.action(action.rsplit("/", 1)[-1])
            else:
                length = int(self.headers.get("Content-Length", "0"))
                payload = json.loads(self.rfile.read(length) or b"{}")
                if action.endswith("/preview"):
                    result = EDITOR.preview(payload["category"], payload["entries"])
                elif action.endswith("/apply"):
                    result = EDITOR.apply(payload["token"])
                else:
                    result = EDITOR.restore(payload["archive"], payload.get("conflicts", "reject"))
            self.reply(200, result)
        except Exception as error:
            self.reply(500, {"error":str(error)})


if __name__ == "__main__":
    print("Prompt Forge is available at http://127.0.0.1:8765")
    ThreadingHTTPServer(("127.0.0.1", 8765), StudioHandler).serve_forever()
