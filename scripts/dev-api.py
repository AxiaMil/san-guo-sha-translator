import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from http.server import ThreadingHTTPServer
from api.match import handler

ThreadingHTTPServer(("127.0.0.1", 8000), handler).serve_forever()
