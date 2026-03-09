"""Generate installer sidebar bitmap for NSIS"""
from PIL import Image, ImageDraw, ImageFont
import os

# NSIS sidebar: 164x314 pixels, BMP format
WIDTH, HEIGHT = 164, 314

# Create gradient background (dark blue to lighter blue)
img = Image.new('RGB', (WIDTH, HEIGHT))
draw = ImageDraw.Draw(img)

# Professional gradient: dark navy to medium blue
for y in range(HEIGHT):
    r = int(15 + (25 - 15) * y / HEIGHT)
    g = int(23 + (50 - 23) * y / HEIGHT)  
    b = int(42 + (85 - 42) * y / HEIGHT)
    draw.line([(0, y), (WIDTH, y)], fill=(r, g, b))

# Add the app icon (resized to fit nicely)
try:
    icon = Image.open('assets/icon.png').convert('RGBA')
    icon_size = 80
    icon = icon.resize((icon_size, icon_size), Image.LANCZOS)
    
    # Center horizontally, position at top area
    x_pos = (WIDTH - icon_size) // 2
    y_pos = 40
    
    # Paste with alpha mask
    img.paste(icon, (x_pos, y_pos), icon)
except Exception as e:
    print(f"Warning: Could not add icon: {e}")

# Add app name text
try:
    # Try to use a nice font, fallback to default
    try:
        font_title = ImageFont.truetype("segoeui.ttf", 22)
        font_sub = ImageFont.truetype("segoeui.ttf", 11)
        font_ver = ImageFont.truetype("segoeui.ttf", 10)
    except:
        try:
            font_title = ImageFont.truetype("arial.ttf", 22)
            font_sub = ImageFont.truetype("arial.ttf", 11)
            font_ver = ImageFont.truetype("arial.ttf", 10)
        except:
            font_title = ImageFont.load_default()
            font_sub = ImageFont.load_default()
            font_ver = ImageFont.load_default()
    
    # App name
    text = "Tallify"
    bbox = draw.textbbox((0, 0), text, font=font_title)
    text_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - text_width) // 2, 135), text, fill=(255, 255, 255), font=font_title)
    
    # Subtitle
    sub_text = "Professional Accounting"
    bbox = draw.textbbox((0, 0), sub_text, font=font_sub)
    sub_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - sub_width) // 2, 165), sub_text, fill=(150, 180, 220), font=font_sub)
    
    sub_text2 = "& ERP System"
    bbox = draw.textbbox((0, 0), sub_text2, font=font_sub)
    sub_width2 = bbox[2] - bbox[0]
    draw.text(((WIDTH - sub_width2) // 2, 180), sub_text2, fill=(150, 180, 220), font=font_sub)

    # Decorative line
    line_y = 210
    draw.line([(30, line_y), (WIDTH - 30, line_y)], fill=(80, 120, 180), width=1)

    # Version
    ver_text = "Version 1.0.0"
    bbox = draw.textbbox((0, 0), ver_text, font=font_ver)
    ver_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - ver_width) // 2, 225), ver_text, fill=(120, 150, 200), font=font_ver)

    # Bottom copyright
    copy_text = "© 2025 Tallify"
    bbox = draw.textbbox((0, 0), copy_text, font=font_ver)
    copy_width = bbox[2] - bbox[0]
    draw.text(((WIDTH - copy_width) // 2, HEIGHT - 25), copy_text, fill=(100, 130, 180), font=font_ver)

except Exception as e:
    print(f"Warning: Could not add text: {e}")

# Save as BMP (required for NSIS)
img.save('assets/installer-sidebar.bmp', format='BMP')
print(f"Created installer-sidebar.bmp ({WIDTH}x{HEIGHT})")
print(f"Size: {os.path.getsize('assets/installer-sidebar.bmp')} bytes")
