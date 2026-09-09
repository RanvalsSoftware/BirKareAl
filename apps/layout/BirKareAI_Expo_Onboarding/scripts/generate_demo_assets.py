from __future__ import annotations

from pathlib import Path
import math
import random
from typing import Callable

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
BOARD_A = ROOT / "design-reference" / "onboarding-filters-board.png"
BOARD_B = ROOT / "design-reference" / "onboarding-flow-board.png"
OUT = ROOT / "assets" / "images"

POSTER = (1080, 1350)
THUMB = (640, 800)

random.seed(41)


def load_rgb(path: Path) -> Image.Image:
    return Image.open(path).convert("RGB")


def crop(image: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    return image.crop(box)


def cover(image: Image.Image, size: tuple[int, int], anchor: tuple[float, float] = (0.5, 0.5)) -> Image.Image:
    target_w, target_h = size
    src_w, src_h = image.size
    scale = max(target_w / src_w, target_h / src_h)
    resized = image.resize((math.ceil(src_w * scale), math.ceil(src_h * scale)), Image.Resampling.LANCZOS)
    left = int((resized.width - target_w) * anchor[0])
    top = int((resized.height - target_h) * anchor[1])
    left = max(0, min(left, resized.width - target_w))
    top = max(0, min(top, resized.height - target_h))
    return resized.crop((left, top, left + target_w, top + target_h))


def contain(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    target_w, target_h = size
    src_w, src_h = image.size
    scale = min(target_w / src_w, target_h / src_h)
    return image.resize((max(1, int(src_w * scale)), max(1, int(src_h * scale))), Image.Resampling.LANCZOS)


def finish(image: Image.Image, *, sharpen: float = 1.0, contrast: float = 1.04, saturation: float = 1.04) -> Image.Image:
    image = ImageEnhance.Contrast(image).enhance(contrast)
    image = ImageEnhance.Color(image).enhance(saturation)
    image = ImageEnhance.Sharpness(image).enhance(sharpen)
    image = image.filter(ImageFilter.UnsharpMask(radius=1.5, percent=115, threshold=3))
    return image


def add_grain(image: Image.Image, amount: int = 8, opacity: float = 0.10) -> Image.Image:
    noise = Image.effect_noise(image.size, amount).convert("L")
    noise_rgb = Image.merge("RGB", (noise, noise, noise))
    return Image.blend(image, noise_rgb, opacity)


def vignette(image: Image.Image, strength: float = 0.55) -> Image.Image:
    w, h = image.size
    mask = Image.new("L", (w, h), 0)
    px = mask.load()
    cx, cy = w / 2, h / 2
    max_d = math.sqrt(cx * cx + cy * cy)
    for y in range(h):
        for x in range(w):
            d = math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / max_d
            px[x, y] = int(max(0, min(255, (d ** 1.7) * 255 * strength)))
    overlay = Image.new("RGB", (w, h), "black")
    return Image.composite(overlay, image, mask)


def cinematic_grade(image: Image.Image) -> Image.Image:
    image = ImageEnhance.Contrast(image).enhance(1.16)
    image = ImageEnhance.Color(image).enhance(0.92)
    r, g, b = image.split()
    shadows = ImageOps.colorize(ImageOps.grayscale(image), "#07141D", "#FFB16B")
    image = Image.blend(image, shadows, 0.22)
    image = add_grain(image, 7, 0.06)
    return vignette(image, 0.32)


def poster_from_crop(source: Image.Image, *, anchor=(0.5, 0.5)) -> Image.Image:
    result = cover(source, POSTER, anchor)
    return finish(result, sharpen=1.18, contrast=1.06, saturation=1.07)


def poster_from_wide(source: Image.Image) -> Image.Image:
    bg = cover(source, POSTER).filter(ImageFilter.GaussianBlur(30))
    bg = ImageEnhance.Brightness(bg).enhance(0.52)
    fg = contain(source, (POSTER[0], int(POSTER[1] * 0.62)))
    fg = finish(fg, sharpen=1.25, contrast=1.08, saturation=1.10)
    canvas = bg.copy()
    top = (POSTER[1] - fg.height) // 2
    canvas.paste(fg, ((POSTER[0] - fg.width) // 2, top))
    # Soft top/bottom gradients so the full-width scene feels intentional.
    overlay = Image.new("RGBA", POSTER, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    fade_h = 210
    for i in range(fade_h):
        alpha = int(165 * (1 - i / fade_h))
        draw.rectangle((0, i, POSTER[0], i + 1), fill=(0, 0, 0, alpha))
        draw.rectangle((0, POSTER[1] - i - 1, POSTER[0], POSTER[1] - i), fill=(0, 0, 0, alpha))
    return Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB")


def save(image: Image.Image, path: Path, *, quality: int = 92) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix.lower() in {".jpg", ".jpeg"}:
        image.save(path, quality=quality, optimize=True, progressive=True)
    else:
        image.save(path, optimize=True)


def create_filter_variants(base: Image.Image) -> dict[str, Image.Image]:
    base = poster_from_crop(base, anchor=(0.5, 0.43))
    result: dict[str, Image.Image] = {}

    result["natural"] = finish(base, sharpen=1.10, contrast=1.02, saturation=1.00)
    result["cinematic"] = cinematic_grade(base)

    # Pop art: hard posterization, saturated palette and comic outlines.
    pop = ImageOps.posterize(base, 4)
    pop = ImageEnhance.Color(pop).enhance(2.35)
    pop = ImageEnhance.Contrast(pop).enhance(1.32)
    edges = ImageOps.invert(ImageOps.grayscale(base).filter(ImageFilter.FIND_EDGES)).point(lambda p: 255 if p > 132 else 0)
    line_layer = Image.new("RGB", POSTER, "#161018")
    pop = Image.composite(line_layer, pop, ImageOps.invert(edges))
    result["pop-art"] = pop

    # Drip art: pop-art base plus colorful paint drops and vertical streaks.
    drip = pop.copy().convert("RGBA")
    paint = Image.new("RGBA", POSTER, (0, 0, 0, 0))
    d = ImageDraw.Draw(paint)
    palette = ["#FF2D95", "#7C3AED", "#00D4FF", "#FFC400", "#F7652A"]
    for _ in range(36):
        x = random.randint(0, POSTER[0])
        y = random.randint(int(POSTER[1] * 0.10), int(POSTER[1] * 0.85))
        radius = random.randint(16, 70)
        color = random.choice(palette)
        d.ellipse((x - radius, y - radius, x + radius, y + radius), fill=color + "B8")
        if random.random() > 0.35:
            length = random.randint(45, 230)
            width = random.randint(8, 24)
            d.rounded_rectangle((x - width // 2, y, x + width // 2, min(POSTER[1], y + length)), radius=width // 2, fill=color + "A0")
    paint = paint.filter(ImageFilter.GaussianBlur(2.2))
    result["drip-art"] = Image.alpha_composite(drip, paint).convert("RGB")

    hdr = ImageOps.autocontrast(base, cutoff=1)
    hdr = ImageEnhance.Contrast(hdr).enhance(1.28)
    hdr = ImageEnhance.Sharpness(hdr).enhance(2.2)
    result["hdr"] = hdr

    bw = ImageOps.grayscale(base)
    bw = ImageOps.autocontrast(bw, cutoff=2)
    bw = ImageEnhance.Contrast(bw).enhance(1.25)
    result["black-white"] = Image.merge("RGB", (bw, bw, bw))

    gray = ImageOps.grayscale(base)
    sepia = ImageOps.colorize(gray, "#24170F", "#E7C693")
    sepia = ImageEnhance.Contrast(sepia).enhance(0.95)
    result["vintage"] = add_grain(vignette(sepia, 0.25), 10, 0.10)

    # Bokeh: soft portrait with glowing circles on the outer area.
    bokeh = ImageEnhance.Brightness(base).enhance(1.03).convert("RGBA")
    lights = Image.new("RGBA", POSTER, (0, 0, 0, 0))
    d = ImageDraw.Draw(lights)
    for _ in range(34):
        radius = random.randint(22, 85)
        side = random.choice(["left", "right", "top"])
        if side == "left":
            x = random.randint(-15, int(POSTER[0] * 0.24))
            y = random.randint(20, POSTER[1] - 20)
        elif side == "right":
            x = random.randint(int(POSTER[0] * 0.76), POSTER[0] + 15)
            y = random.randint(20, POSTER[1] - 20)
        else:
            x = random.randint(30, POSTER[0] - 30)
            y = random.randint(-10, int(POSTER[1] * 0.22))
        color = random.choice([(255, 193, 77, 100), (255, 105, 180, 85), (100, 200, 255, 80)])
        d.ellipse((x - radius, y - radius, x + radius, y + radius), fill=color)
    lights = lights.filter(ImageFilter.GaussianBlur(20))
    result["bokeh"] = Image.alpha_composite(bokeh, lights).convert("RGB")

    # Cyberpunk: blue-magenta duotone with channel offset.
    mono = ImageOps.grayscale(base)
    cyan = ImageOps.colorize(mono, "#001018", "#00E5FF")
    magenta = ImageOps.colorize(mono, "#12001A", "#FF3CAC")
    cyan = ImageChops.offset(cyan, -14, 0)
    magenta = ImageChops.offset(magenta, 14, 0)
    cyber = Image.blend(cyan, magenta, 0.5)
    cyber = Image.blend(base, cyber, 0.62)
    result["cyberpunk"] = vignette(ImageEnhance.Contrast(cyber).enhance(1.18), 0.25)

    # Watercolor: smooth blocks with visible edge wash.
    water = base.filter(ImageFilter.ModeFilter(size=9)).filter(ImageFilter.SMOOTH_MORE)
    water = ImageOps.posterize(water, 5)
    edge = ImageOps.grayscale(base).filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(1.1))
    edge = ImageOps.invert(edge)
    edge_rgb = Image.merge("RGB", (edge, edge, edge))
    result["watercolor"] = Image.blend(water, edge_rgb, 0.16)

    # Pencil sketch via color dodge.
    g = ImageOps.grayscale(base)
    inverted = ImageOps.invert(g)
    blurred = inverted.filter(ImageFilter.GaussianBlur(18))
    dodge = Image.new("L", g.size)
    gp, bp, dp = g.load(), blurred.load(), dodge.load()
    for y in range(g.height):
        for x in range(g.width):
            denom = 255 - bp[x, y]
            dp[x, y] = min(255, int(gp[x, y] * 255 / max(1, denom)))
    paper = ImageOps.colorize(dodge, "#2B2926", "#F4EFE4")
    result["sketch"] = ImageEnhance.Contrast(paper).enhance(1.12)

    # Cartoon: posterized color blocks with dark contours.
    cartoon = base.filter(ImageFilter.MedianFilter(size=7))
    cartoon = ImageOps.posterize(cartoon, 4)
    contours = ImageOps.grayscale(base).filter(ImageFilter.FIND_EDGES)
    contours = ImageEnhance.Contrast(contours).enhance(2.0)
    contours = contours.point(lambda p: 255 if p > 56 else 0)
    contour_rgb = Image.new("RGB", POSTER, "#111111")
    result["cartoon"] = Image.composite(contour_rgb, cartoon, contours)

    # Warm studio / professional retouch.
    warm = ImageOps.colorize(ImageOps.grayscale(base), "#1B1110", "#F3D2B1")
    result["warm-studio"] = Image.blend(base, warm, 0.18)

    return result


def make_logo_assets() -> None:
    try:
        font_bold = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 400)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 120)
    except OSError:
        font_bold = ImageFont.load_default()
        font_small = ImageFont.load_default()

    size = 1024
    img = Image.new("RGB", (size, size), "#050505")
    draw = ImageDraw.Draw(img)
    # Gold halo.
    halo = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    hdraw = ImageDraw.Draw(halo)
    hdraw.ellipse((180, 180, 844, 844), fill=(255, 196, 0, 42))
    halo = halo.filter(ImageFilter.GaussianBlur(85))
    img = Image.alpha_composite(img.convert("RGBA"), halo)
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((205, 205, 819, 819), radius=175, fill="#0A0A0C", outline="#FFC400", width=10)
    bbox = draw.textbbox((0, 0), "BK", font=font_bold)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((size - tw) / 2, (size - th) / 2 - 38), "BK", font=font_bold, fill="#FFC400")
    draw.text((420, 715), "AI", font=font_small, fill="#FFFFFF")
    save(img.convert("RGB"), OUT / "brand" / "icon.png")

    # Transparent logo mark for UI.
    mark = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    mdraw = ImageDraw.Draw(mark)
    mdraw.rounded_rectangle((66, 66, 446, 446), radius=112, fill="#08080A", outline="#FFC400", width=7)
    bbox = mdraw.textbbox((0, 0), "BK", font=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 210))
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 210)
    mdraw.text(((512 - (bbox[2]-bbox[0]))/2, 117), "BK", font=font, fill="#FFC400")
    save(mark, OUT / "brand" / "logo-mark.png")



def main() -> None:
    board_a = load_rgb(BOARD_A)
    board_b = load_rgb(BOARD_B)

    # Category previews from the generated design board. Coordinates intentionally exclude UI labels.
    categories = {
        "fan-selfie": (229, 596, 383, 763),
        "background-luxury": (392, 596, 544, 763),
        "art-style": (553, 596, 704, 763),
        "professional-portrait": (714, 596, 856, 763),
        "cinematic-scene": (866, 596, 1007, 763),
    }
    category_images: dict[str, Image.Image] = {}
    for name, box in categories.items():
        raw = crop(board_a, box)
        category_images[name] = raw
        image = poster_from_crop(raw, anchor=(0.5, 0.45))
        save(image, OUT / "categories" / f"{name}.jpg")

    # Fan selfie variants / scene examples from board B.
    wide_scenes = {
        "fan-selfie-stadium-01": (23, 584, 211, 663),
        "fan-selfie-stadium-02": (23, 667, 211, 746),
        "fan-selfie-celebration": (23, 750, 211, 840),
        "luxury-villa": (344, 584, 462, 663),
        "gala-lounge": (344, 667, 462, 747),
        "night-city-drive": (344, 750, 462, 840),
        "red-carpet": (986, 584, 1195, 663),
        "stadium-night": (986, 667, 1195, 747),
        "city-night": (986, 750, 1195, 840),
    }
    for name, box in wide_scenes.items():
        raw = crop(board_b, box)
        image = poster_from_wide(raw)
        if name in {"red-carpet", "stadium-night", "city-night"}:
            image = cinematic_grade(image)
        save(image, OUT / "scenes" / f"{name}.jpg")

    # A few additional scene cards from the reference grid on board A.
    grid_scenes = {
        "yacht-sunset": (1210, 724, 1301, 816),
        "city-luxury-car": (1306, 724, 1397, 816),
        "grand-hotel": (1402, 612, 1492, 704),
        "mountain-chalet": (1210, 828, 1301, 920),
        "historic-gala": (1306, 828, 1397, 920),
        "private-suite": (1402, 828, 1492, 920),
    }
    for name, box in grid_scenes.items():
        raw = crop(board_a, box)
        save(poster_from_crop(raw), OUT / "scenes" / f"{name}.jpg")

    # 12 mobile filter previews derived from one generated fictional portrait.
    filters = create_filter_variants(category_images["professional-portrait"])
    for name, image in filters.items():
        save(image, OUT / "filters" / f"{name}.jpg")

    # Onboarding backgrounds / fallback gallery items.
    for i, key in enumerate(["fan-selfie", "background-luxury", "art-style", "professional-portrait", "cinematic-scene"], start=1):
        image = poster_from_crop(category_images[key], anchor=(0.5, 0.44))
        save(image, OUT / "onboarding" / f"gallery-{i:02d}.jpg")

    # Before / after pair used on the intro screen.
    before = finish(poster_from_crop(category_images["professional-portrait"]), saturation=0.72, contrast=0.96)
    after = cinematic_grade(poster_from_crop(category_images["cinematic-scene"]))
    save(before, OUT / "onboarding" / "before-portrait.jpg")
    save(after, OUT / "onboarding" / "after-cinematic.jpg")

    make_logo_assets()

    # Contact sheet for quick review.
    paths = sorted((OUT / "filters").glob("*.jpg"))
    tile_w, tile_h = 240, 300
    cols = 4
    rows = math.ceil(len(paths) / cols)
    sheet = Image.new("RGB", (cols * tile_w, rows * (tile_h + 42)), "#050505")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22)
    for idx, path in enumerate(paths):
        image = Image.open(path).convert("RGB").resize((tile_w, tile_h), Image.Resampling.LANCZOS)
        x = (idx % cols) * tile_w
        y = (idx // cols) * (tile_h + 42)
        sheet.paste(image, (x, y))
        draw.text((x + 10, y + tile_h + 8), path.stem, font=font, fill="#FFFFFF")
    save(sheet, ROOT / "design-reference" / "generated-filter-contact-sheet.jpg", quality=94)

    print(f"Generated assets under: {OUT}")
    print(f"Category files: {len(list((OUT / 'categories').glob('*')))}")
    print(f"Filter files: {len(list((OUT / 'filters').glob('*')))}")
    print(f"Scene files: {len(list((OUT / 'scenes').glob('*')))}")


if __name__ == "__main__":
    main()
