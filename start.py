"""Run PersonaForge's local web studio."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os

ROOT=Path(__file__).resolve().parent
if __name__=="__main__":
    os.chdir(ROOT)
    print("PersonaForge is available at http://127.0.0.1:8765")
    ThreadingHTTPServer(("127.0.0.1",8765),SimpleHTTPRequestHandler).serve_forever()
