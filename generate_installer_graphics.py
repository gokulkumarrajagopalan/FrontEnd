from PIL import Image, ImageDraw, ImageFilter
import os

assets_dir = r"D:\Talliffy\FrontEnd\assets"
icon_path = os.path.join(assets_dir, "icon.png")

icon = Image.open(icon_path).convert("RGBA")

# 1. Generate Sidebar (164x314)
# Brand gradient: Deep Blue (#1e3a8a) to Blue (#3b82f6)
sidebar = Image.new("RGBA", (164, 314), "#1d4ed8")
draw = ImageDraw.Draw(sidebar)
for y in range(314):
    r = int(30 + (59 - 30) * (y / 314))
    g = int(58 + (130 - 58) * (y / 314))
    b = int(138 + (246 - 138) * (y / 314))
    draw.line([(0, y), (164, y)], fill=(r, g, b))

icon_resized = icon.resize((100, 100), Image.Resampling.LANCZOS)
sidebar.paste(icon_resized, (32, 40), icon_resized)

# Save as BMP (RGB for NSIS)
sidebar.convert("RGB").save(os.path.join(assets_dir, "installer-sidebar.bmp"), "BMP")

# 2. Generate Header (150x57)
# White background
header = Image.new("RGBA", (150, 57), "#ffffff")
icon_small = icon.resize((45, 45), Image.Resampling.LANCZOS)
header.paste(icon_small, (150 - 45 - 6, 6), icon_small)

header.convert("RGB").save(os.path.join(assets_dir, "installer-header.bmp"), "BMP")
print("Successfully generated installer graphics!")
