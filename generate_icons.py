import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math

def draw_arshi_icon(size=512, is_foreground_only=False, is_round=False):
    # Supersample 2x for smooth anti-aliased edges
    scale = 2
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx, cy = canvas_size / 2, canvas_size / 2

    if not is_foreground_only:
        # Background: Modern Deep Navy/Emerald gradient fill
        # Draw background base
        if is_round:
            # Circle mask
            r = canvas_size / 2 - (8 * scale)
            # Create gradient in a bounding box
            bg = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
            bg_draw = ImageDraw.Draw(bg)
            for y in range(canvas_size):
                t = y / canvas_size
                # Gradient from #064E3B (Deep Emerald) to #0F172A (Deep Slate/Navy)
                r_c = int(6 + t * (15 - 6))
                g_c = int(78 + t * (23 - 78))
                b_c = int(59 + t * (42 - 59))
                bg_draw.line([(0, y), (canvas_size, y)], fill=(r_c, g_c, b_c, 255))
            
            # Mask to circle
            mask = Image.new("L", (canvas_size, canvas_size), 0)
            mask_draw = ImageDraw.Draw(mask)
            mask_draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
            img.paste(bg, (0, 0), mask)
            
            # Golden/Emerald rim border
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(16, 185, 129, 220), width=int(5 * scale))
        else:
            # Rounded squircle
            radius = int(canvas_size * 0.22)
            bg = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
            bg_draw = ImageDraw.Draw(bg)
            for y in range(canvas_size):
                t = y / canvas_size
                r_c = int(6 + t * (15 - 6))
                g_c = int(78 + t * (23 - 78))
                b_c = int(59 + t * (42 - 59))
                bg_draw.line([(0, y), (canvas_size, y)], fill=(r_c, g_c, b_c, 255))
            
            mask = Image.new("L", (canvas_size, canvas_size), 0)
            mask_draw = ImageDraw.Draw(mask)
            mask_draw.rounded_rectangle([6 * scale, 6 * scale, canvas_size - 6 * scale, canvas_size - 6 * scale], radius=radius, fill=255)
            img.paste(bg, (0, 0), mask)
            
            draw.rounded_rectangle([6 * scale, 6 * scale, canvas_size - 6 * scale, canvas_size - 6 * scale], radius=radius, outline=(16, 185, 129, 200), width=int(5 * scale))

    # Inner Emblem - Tech Shield / Hexagon
    shield_pts = [
        (cx, cy - 140 * scale),            # Top peak
        (cx + 120 * scale, cy - 80 * scale),# Top right
        (cx + 120 * scale, cy + 45 * scale),# Mid right
        (cx, cy + 150 * scale),            # Bottom tip
        (cx - 120 * scale, cy + 45 * scale),# Mid left
        (cx - 120 * scale, cy - 80 * scale) # Top left
    ]

    # Subtle inner shield fill
    shield_overlay = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shield_overlay)
    s_draw.polygon(shield_pts, fill=(5, 150, 105, 45), outline=(52, 211, 153, 240))
    s_draw.line(shield_pts + [shield_pts[0]], fill=(52, 211, 153, 240), width=int(6 * scale))
    img = Image.alpha_composite(img, shield_overlay)
    draw = ImageDraw.Draw(img)

    # Stylized Capital 'A' in Emerald & Gold
    # Left leg
    top_pt = (cx, cy - 90 * scale)
    left_bottom = (cx - 75 * scale, cy + 85 * scale)
    right_bottom = (cx + 75 * scale, cy + 85 * scale)
    leg_w = int(18 * scale)

    # Draw legs with rounded caps
    draw.line([top_pt, left_bottom], fill=(255, 255, 255, 255), width=leg_w)
    draw.line([top_pt, right_bottom], fill=(255, 255, 255, 255), width=leg_w)

    # Crossbar of 'A' shaped like RFID wave badge
    bar_y = cy + 10 * scale
    draw.line([(cx - 48 * scale, bar_y), (cx + 48 * scale, bar_y)], fill=(16, 185, 129, 255), width=int(14 * scale))

    # Center RFID / Smart Chip Core Accent (Glowing Emerald Dot)
    draw.ellipse([cx - 14 * scale, bar_y - 14 * scale, cx + 14 * scale, bar_y + 14 * scale], fill=(52, 211, 153, 255), outline=(255, 255, 255, 255), width=int(2.5 * scale))

    # Radio Waves (RFID Contactless Signal Emitting from top right)
    wave_center = (cx + 50 * scale, cy - 65 * scale)
    for r_wave, a_width, alpha in [(32 * scale, 4 * scale, 240), (46 * scale, 3.5 * scale, 190), (60 * scale, 3 * scale, 130)]:
        bbox = [wave_center[0] - r_wave, wave_center[1] - r_wave, wave_center[0] + r_wave, wave_center[1] + r_wave]
        draw.arc(bbox, start=290, end=380, fill=(245, 158, 11, alpha), width=int(a_width)) # Amber / Golden RFID beam

    # Bottom Banner Accent: "ARSHI" text badge
    if not is_foreground_only:
        badge_w = 110 * scale
        badge_h = 24 * scale
        badge_x = cx - badge_w / 2
        badge_y = cy + 105 * scale
        draw.rounded_rectangle([badge_x, badge_y, badge_x + badge_w, badge_y + badge_h], radius=int(6 * scale), fill=(6, 78, 59, 230), outline=(52, 211, 153, 200), width=int(2 * scale))

    # Downsample using Lanczos for maximum sharpness and anti-aliasing
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

def main():
    sizes = {
        'mdpi': 48,
        'hdpi': 72,
        'xhdpi': 96,
        'xxhdpi': 144,
        'xxxhdpi': 192
    }
    
    base_res = "client/android/app/src/main/res"

    for density, sz in sizes.items():
        folder = os.path.join(base_res, f"mipmap-{density}")
        os.makedirs(folder, exist_ok=True)

        # Standard icon
        icon = draw_arshi_icon(sz, is_foreground_only=False, is_round=False)
        icon.save(os.path.join(folder, "ic_launcher.png"), "PNG")

        # Round icon
        round_icon = draw_arshi_icon(sz, is_foreground_only=False, is_round=True)
        round_icon.save(os.path.join(folder, "ic_launcher_round.png"), "PNG")

        # Foreground for adaptive icon (scaled to fit adaptive safe zone ~66%)
        # In adaptive icons, foreground is typically centered in a larger canvas
        fg_icon = draw_arshi_icon(sz, is_foreground_only=True, is_round=False)
        fg_icon.save(os.path.join(folder, "ic_launcher_foreground.png"), "PNG")
        print(f"Generated icons for mipmap-{density} ({sz}x{sz})")

    # Also save a 512x512 app logo for web and client
    web_logo = draw_arshi_icon(512, is_foreground_only=False, is_round=False)
    web_logo.save("client/public/arshi_logo.png" if os.path.exists("client/public") else "client/src/assets/arshi_logo.png", "PNG")
    web_logo.save("Arshi_Enterprises_Logo.png", "PNG")
    print("Master 512x512 logo saved!")

if __name__ == "__main__":
    main()
