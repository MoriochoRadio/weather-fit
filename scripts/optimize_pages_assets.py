from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "client" / "public" / "assets"

SPECS = {
    "weather-fit-logo.png": ("weather-fit-logo.webp", 512, 90),
    "weather-fit-hero.png": ("weather-fit-hero.webp", 1600, 84),
    "weather-fit-closet.png": ("weather-fit-closet.webp", 1200, 82),
    "weather-fit-weather-moods.png": ("weather-fit-weather-moods.webp", 1200, 82),
}

for source_name, (target_name, max_width, quality) in SPECS.items():
    source = ASSET_DIR / source_name
    target = ASSET_DIR / target_name
    with Image.open(source) as image:
        image.thumbnail((max_width, image.height), Image.Resampling.LANCZOS)
        if image.mode not in {"RGB", "RGBA"}:
            image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
        image.save(target, "WEBP", quality=quality, method=6)
    print(f"{source_name} -> {target_name}")
