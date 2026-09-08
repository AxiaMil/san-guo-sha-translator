from http.server import BaseHTTPRequestHandler
import base64
import json
import os

# Bound OpenCV decompression before decoding attacker-controlled image bytes.
os.environ.setdefault("OPENCV_IO_MAX_IMAGE_PIXELS", "24000000")
os.environ.setdefault("OPENCV_IO_MAX_IMAGE_WIDTH", "12000")
os.environ.setdefault("OPENCV_IO_MAX_IMAGE_HEIGHT", "12000")
import cv2
import numpy as np
from recognition.engine import match_image


class handler(BaseHTTPRequestHandler):
    def reply(self, status, payload):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode())

    def do_GET(self):
        self.reply(
            200, {"status": "ready", "engine": "ORB + CLAHE + RANSAC", "version": 1}
        )

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 3_500_000:
                return self.reply(
                    413,
                    {"error": "Photo is too large. Crop or resize it and try again."},
                )
            if "application/json" not in self.headers.get("Content-Type", ""):
                return self.reply(415, {"error": "Expected a JSON image upload."})
            payload = json.loads(self.rfile.read(length))
            encoded = payload.get("image")
            if not isinstance(encoded, str):
                raise ValueError("Choose a photo to scan.")
            raw = base64.b64decode(encoded, validate=True)
            image = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
            if image is None:
                raise ValueError("Could not read this image. Try a JPEG or PNG photo.")
            self.reply(200, match_image(image))
        except ValueError, TypeError, AttributeError, cv2.error:
            self.reply(
                400,
                {
                    "error": "Could not read this photo. Try a JPEG or PNG under 24 megapixels."
                },
            )
        except Exception:
            self.reply(
                503,
                {
                    "error": "Artwork matching is temporarily unavailable. Try text recognition or search by name."
                },
            )
