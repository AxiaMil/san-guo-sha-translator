import sys, threading, json, urllib.request, urllib.error
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from http.server import ThreadingHTTPServer
import pytest
from api.match import handler


@pytest.fixture(scope="module")
def endpoint():
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{server.server_port}/api/match"
    server.shutdown()
    server.server_close()


@pytest.mark.parametrize(
    "body,ctype,expected",
    [
        (b"{}", "application/json", 400),
        (b"{", "application/json", 400),
        (b'{"image":"bad!"}', "application/json", 400),
        (b"[]", "application/json", 400),
        (b"{}", "text/plain", 415),
        (b"{}", "application/json", 413),
    ],
)
def test_bad_uploads(endpoint, body, ctype, expected):
    req = urllib.request.Request(
        endpoint,
        data=body,
        headers={
            "Content-Type": ctype,
            "Content-Length": str(3500001 if expected == 413 else len(body)),
        },
    )
    with pytest.raises(urllib.error.HTTPError) as error:
        urllib.request.urlopen(req)
    assert error.value.code == expected
    assert "error" in json.loads(error.value.read())
    assert error.value.headers["Cache-Control"] == "no-store"
