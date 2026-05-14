"""
Kie AI (Nano Banana 2) - Image Generation Client

Usage:
    from kie_ai import KieAI

    client = KieAI()  # reads KIE_AI_API_KEY from .env
    urls = client.generate("A clean workspace with laptop", aspect_ratio="1:1")
    client.download(urls[0], "output.jpg")
"""

import os
import time
import json
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (scripts/ is one level below root)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

BASE_URL = "https://api.kie.ai/api/v1/jobs"
POLL_INTERVAL = 3  # seconds between status checks
MAX_WAIT = 300     # max seconds to wait for a single image


class KieAIError(Exception):
    """Kie AI API error."""
    pass


class KieAI:
    def __init__(self, api_key: str | None = None, model: str = "nano-banana-2"):
        self.api_key = api_key or os.getenv("KIE_AI_API_KEY")
        if not self.api_key:
            raise KieAIError(
                "KIE_AI_API_KEY not set. Get your key at https://kie.ai/api-key "
                "and add it to .env"
            )
        self.model = model
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def create_task(
        self,
        prompt: str,
        aspect_ratio: str = "1:1",
        resolution: str = "1K",
        output_format: str = "png",
        image_input: list[str] | None = None,
        model: str | None = None,
    ) -> str:
        """Create image generation task. Returns task ID."""
        active_model = model or self.model
        input_params = {
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "resolution": resolution,
        }
        if active_model == "nano-banana-2":
            input_params["output_format"] = output_format
        payload = {
            "model": active_model,
            "input": input_params,
        }
        if image_input:
            # gpt-image-2-image-to-image uses "input_urls"; all others use "image_input"
            key = "input_urls" if active_model == "gpt-image-2-image-to-image" else "image_input"
            payload["input"][key] = image_input

        for attempt in range(5):
            try:
                resp = requests.post(
                    f"{BASE_URL}/createTask",
                    headers=self.headers,
                    json=payload,
                    timeout=15,
                )
                data = resp.json()
                if data.get("code") != 200:
                    raise KieAIError(f"Create task failed: {data.get('msg', resp.text)}")
                return data["data"]["taskId"]
            except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
                if attempt == 4:
                    raise
                wait = 10 * (attempt + 1)
                print(f"  Create task error, retrying in {wait}s...")
                time.sleep(wait)

    def get_status(self, task_id: str) -> dict:
        """Check task status with retry on connection errors."""
        for attempt in range(5):
            try:
                resp = requests.get(
                    f"{BASE_URL}/recordInfo",
                    headers=self.headers,
                    params={"taskId": task_id},
                    timeout=15,
                )
                data = resp.json()
                if data.get("code") != 200:
                    raise KieAIError(f"Status check failed: {data.get('msg', resp.text)}")
                return data["data"]
            except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
                if attempt == 4:
                    raise
                wait = 10 * (attempt + 1)
                print(f"  Connection error, retrying in {wait}s... ({e})")
                time.sleep(wait)

    def wait_for_result(self, task_id: str) -> list[str]:
        """Poll until task completes. Returns list of result URLs."""
        elapsed = 0
        while elapsed < MAX_WAIT:
            status = self.get_status(task_id)
            state = status.get("state")

            if state == "success":
                result = json.loads(status.get("resultJson", "{}"))
                return result.get("resultUrls", [])

            if state == "fail":
                raise KieAIError(
                    f"Task failed: {status.get('failMsg', 'unknown error')} "
                    f"(code: {status.get('failCode')})"
                )

            # still waiting
            time.sleep(POLL_INTERVAL)
            elapsed += POLL_INTERVAL

        raise KieAIError(f"Timeout after {MAX_WAIT}s waiting for task {task_id}")

    def generate(
        self,
        prompt: str,
        aspect_ratio: str = "1:1",
        resolution: str = "1K",
        output_format: str = "png",
        image_input: list[str] | None = None,
        model: str | None = None,
    ) -> list[str]:
        """Generate image and wait for result. Returns list of image URLs."""
        task_id = self.create_task(
            prompt=prompt,
            aspect_ratio=aspect_ratio,
            resolution=resolution,
            output_format=output_format,
            image_input=image_input,
            model=model,
        )
        print(f"  Task created: {task_id}")
        return self.wait_for_result(task_id)

    def download(self, url: str, output_path: str) -> str:
        """Download image from URL to local file."""
        resp = requests.get(url, stream=True)
        resp.raise_for_status()

        output = Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)

        with open(output, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)

        return str(output)


# --- CLI usage ---
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python kie_ai.py 'your prompt here' [output.png]")
        print("       python kie_ai.py --test")
        sys.exit(1)

    if sys.argv[1] == "--test":
        # Quick connection test
        client = KieAI()
        print("API key loaded. Testing connection...")
        task_id = client.create_task("A simple red circle on white background")
        print(f"Task created: {task_id}")
        urls = client.wait_for_result(task_id)
        print(f"Success! Image URL: {urls[0]}")
        sys.exit(0)

    prompt = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else "output.png"

    client = KieAI()
    print(f"Generating: {prompt[:80]}...")
    urls = client.generate(prompt)
    print(f"Downloading to {output_file}...")
    client.download(urls[0], output_file)
    print(f"Done! Saved to {output_file}")
