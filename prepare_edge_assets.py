import os
from PIL import Image

assets_dir = r"D:\NewIdeas\gmaps-grid-hunter\gumroad_assets"
edge_dir = r"D:\NewIdeas\gmaps-grid-hunter\edge_assets"
os.makedirs(edge_dir, exist_ok=True)

cover_src = os.path.join(assets_dir, "cover_pro.jpg")
thumb_src = os.path.join(assets_dir, "thumbnail_pro.jpg")

# 1. Extension Logo: 300x300
img_thumb = Image.open(thumb_src)
logo_300 = img_thumb.resize((300, 300), Image.Resampling.LANCZOS)
logo_path = os.path.join(edge_dir, "logo_300x300.png")
logo_300.save(logo_path)
print(f"Logo saved: {logo_path}")

# 2. Screenshot: 1280x800
img_cover = Image.open(cover_src)
# Resize to 1280 width, pad to 800 height
screenshot_1280 = Image.new("RGBA", (1280, 800), (248, 250, 252, 255))
cover_resized = img_cover.resize((1280, 720), Image.Resampling.LANCZOS)
screenshot_1280.paste(cover_resized, (0, 40))
screenshot_path = os.path.join(edge_dir, "screenshot_1280x800.png")
screenshot_1280.convert("RGB").save(screenshot_path)
print(f"Screenshot saved: {screenshot_path}")

# 3. Small Promotional Tile: 440x280
small_promo = img_cover.resize((440, 280), Image.Resampling.LANCZOS)
small_promo_path = os.path.join(edge_dir, "small_promo_440x280.png")
small_promo.save(small_promo_path)
print(f"Small promo saved: {small_promo_path}")

# 4. Large Promotional Tile: 1400x560
large_promo = Image.new("RGB", (1400, 560), (15, 23, 42))
banner_scaled = img_cover.resize((1000, 560), Image.Resampling.LANCZOS)
large_promo.paste(banner_scaled, (200, 0))
large_promo_path = os.path.join(edge_dir, "large_promo_1400x560.png")
large_promo.save(large_promo_path)
print(f"Large promo saved: {large_promo_path}")
