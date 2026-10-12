import os
from PIL import Image, ImageDraw, ImageFont

output_dir = r"D:\NewIdeas\gmaps-grid-hunter\gumroad_assets"
os.makedirs(output_dir, exist_ok=True)

# Helper function to get default font or basic font
def get_font(size):
    try:
        # Standard Windows fonts
        return ImageFont.truetype("arialbd.ttf", size)
    except Exception:
        try:
            return ImageFont.truetype("segoeui.ttf", size)
        except Exception:
            return ImageFont.load_default()

# 1. Generate Cover Image (1280x720)
def generate_cover():
    width, height = 1280, 720
    img = Image.new("RGBA", (width, height), (15, 23, 42, 255)) # Dark slate (#0f172a)
    draw = ImageDraw.Draw(img)

    # Decorative background glows / cards
    draw.rounded_rectangle([60, 60, width - 60, height - 60], radius=24, fill=(30, 41, 59, 255), outline=(51, 65, 85, 255), width=2)

    # Gradient-like top accent bar
    draw.rounded_rectangle([60, 60, width - 60, 76], radius=8, fill=(99, 102, 241, 255))

    font_title = get_font(56)
    font_sub = get_font(26)
    font_badge = get_font(20)
    font_pill = get_font(18)

    # Title & Branding
    draw.text((120, 130), "LeadGrid Pro", fill=(255, 255, 255, 255), font=font_title)
    
    # Badge
    draw.rounded_rectangle([480, 140, 620, 180], radius=8, fill=(59, 130, 246, 255))
    draw.text((496, 148), "EARLY BIRD", fill=(255, 255, 255, 255), font=font_badge)

    # Subtitle
    draw.text((120, 210), "Google Maps B2B Lead Scraper & Deep Email Enricher", fill=(56, 189, 248, 255), font=font_sub)

    # Feature List
    features = [
        "✓ Auto Grid-Panning (Bypasses Google's 120-result limit)",
        "✓ Client-Side Email & Social Extraction ($0 API bills)",
        "✓ Extracts: Phone, Website, Rating, Address, Facebook, LinkedIn",
        "✓ 1-Click Excel / CSV Instant Download",
        "✓ Manifest V3 Chrome & Microsoft Edge Compatible"
    ]

    y_pos = 280
    for feat in features:
        draw.text((120, y_pos), feat, fill=(203, 213, 225, 255), font=font_pill)
        y_pos += 46

    # Bottom Price & Value Box
    draw.rounded_rectangle([120, 530, 520, 600], radius=12, fill=(99, 102, 241, 255))
    draw.text((140, 548), "Launch Special: $4.99  (Save 80%)", fill=(255, 255, 255, 255), font=get_font(22))

    # Right-side preview representation card
    draw.rounded_rectangle([780, 140, 1160, 580], radius=16, fill=(15, 23, 42, 255), outline=(99, 102, 241, 255), width=2)
    draw.text((820, 170), "LEAD EXTRACTION DASHBOARD", fill=(148, 163, 184, 255), font=get_font(16))

    # Mock statistics cards inside preview
    draw.rounded_rectangle([820, 210, 960, 290], radius=8, fill=(30, 41, 59, 255))
    draw.text((850, 225), "542", fill=(56, 189, 248, 255), font=get_font(28))
    draw.text((840, 262), "LEADS", fill=(148, 163, 184, 255), font=get_font(12))

    draw.rounded_rectangle([980, 210, 1120, 290], radius=8, fill=(30, 41, 59, 255))
    draw.text((1005, 225), "389", fill=(16, 185, 129, 255), font=get_font(28))
    draw.text((1000, 262), "EMAILS", fill=(148, 163, 184, 255), font=get_font(12))

    draw.rounded_rectangle([820, 320, 1120, 400], radius=8, fill=(30, 41, 59, 255))
    draw.text((840, 340), "Target: Dentists in Austin, TX", fill=(241, 245, 249, 255), font=get_font(16))
    draw.text((840, 368), "Status: Exported to leads.csv ✓", fill=(52, 211, 153, 255), font=get_font(14))

    draw.rounded_rectangle([820, 430, 1120, 480], radius=8, fill=(16, 185, 129, 255))
    draw.text((865, 445), "⬇ Download Excel / CSV", fill=(255, 255, 255, 255), font=get_font(16))

    cover_path = os.path.join(output_dir, "cover_1280x720.png")
    img.save(cover_path)
    print(f"Cover image saved: {cover_path}")

# 2. Generate Thumbnail Image (600x600)
def generate_thumbnail():
    width, height = 600, 600
    img = Image.new("RGBA", (width, height), (15, 23, 42, 255))
    draw = ImageDraw.Draw(img)

    # Background card
    draw.rounded_rectangle([20, 20, width - 20, height - 20], radius=24, fill=(30, 41, 59, 255), outline=(99, 102, 241, 255), width=3)

    # Icon circle
    draw.ellipse([210, 80, 390, 260], fill=(99, 102, 241, 255))
    draw.text((250, 120), "LG", fill=(255, 255, 255, 255), font=get_font(72))

    # Title
    font_title = get_font(38)
    draw.text((150, 290), "LeadGrid Pro", fill=(255, 255, 255, 255), font=font_title)

    # Subtitle
    font_sub = get_font(20)
    draw.text((80, 350), "Google Maps B2B Lead Scraper", fill=(56, 189, 248, 255), font=font_sub)
    draw.text((130, 385), "& Deep Email Enricher", fill=(56, 189, 248, 255), font=font_sub)

    # Pill badge
    draw.rounded_rectangle([170, 450, 430, 510], radius=16, fill=(16, 185, 129, 255))
    draw.text((215, 468), "$4.99 EARLY BIRD", fill=(255, 255, 255, 255), font=get_font(20))

    thumb_path = os.path.join(output_dir, "thumbnail_600x600.png")
    img.save(thumb_path)
    print(f"Thumbnail image saved: {thumb_path}")

if __name__ == "__main__":
    generate_cover()
    generate_thumbnail()
