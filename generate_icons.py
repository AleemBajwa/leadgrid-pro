import os
from PIL import Image, ImageDraw, ImageFont

icons_dir = os.path.join(os.path.dirname(__file__), "icons")
os.makedirs(icons_dir, exist_ok=True)

sizes = [16, 48, 128]

for size in sizes:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw rounded background gradient simulation
    radius = int(size * 0.22)
    # Background rounded rect
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=(99, 102, 241, 255))

    # Inner grid accent
    grid_color = (255, 255, 255, 230)
    center = size // 2
    offset = int(size * 0.25)
    line_w = max(1, int(size * 0.08))

    # Draw map pin / grid target
    draw.ellipse([center - offset, center - offset, center + offset, center + offset], outline=grid_color, width=line_w)
    draw.line([center, center - offset - int(size * 0.1), center, center + offset + int(size * 0.1)], fill=grid_color, width=line_w)
    draw.line([center - offset - int(size * 0.1), center, center + offset + int(size * 0.1), center], fill=grid_color, width=line_w)

    img.save(os.path.join(icons_dir, f"icon{size}.png"))
    print(f"Generated icon{size}.png")
