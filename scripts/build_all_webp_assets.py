import os
from PIL import Image

def process_and_save(src_path, dest_path, target_size=(800, 600), quality=85):
    """
    Crops image to target aspect ratio (centered) and resizes to target_size,
    saving as an optimized WebP file.
    """
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    with Image.open(src_path) as img:
        img = img.convert("RGB")
        target_w, target_h = target_size
        target_ratio = target_w / target_h

        curr_w, curr_h = img.size
        curr_ratio = curr_w / curr_h

        if curr_ratio > target_ratio:
            # Too wide: crop left & right
            new_w = int(curr_h * target_ratio)
            left = (curr_w - new_w) // 2
            top = 0
            right = left + new_w
            bottom = curr_h
        else:
            # Too tall: crop top & bottom
            new_h = int(curr_w / target_ratio)
            left = 0
            top = (curr_h - new_h) // 2
            right = curr_w
            bottom = top + new_h

        cropped = img.crop((left, top, right, bottom))
        resized = cropped.resize(target_size, Image.Resampling.LANCZOS)
        resized.save(dest_path, "WEBP", quality=quality, method=6)
        size_kb = os.path.getsize(dest_path) / 1024
        print(f"Processed -> {dest_path} ({target_w}x{target_h}, {size_kb:.1f} KB)")

# Paths
BRAIN = r"C:\Users\Tilin Bijoy\.gemini\antigravity\brain\4ce35fb4-271b-4a74-a704-b67bce46a7a8"
ASSETS = r"assets\images"
OUT = r"assets\images\catalog"

MAPPINGS = {
    # Categories
    f"{OUT}\\categories\\sand.webp": f"{BRAIN}\\category_sand_png_1793723379764.jpg",
    f"{OUT}\\categories\\aggregate.webp": f"{BRAIN}\\category_aggregate_png_1793723399556.jpg",
    f"{OUT}\\categories\\bricks.webp": f"{BRAIN}\\category_bricks_png_1793723421571.jpg",
    f"{OUT}\\categories\\filling.webp": f"{BRAIN}\\category_filling_png_1793723444404.jpg",

    # Items
    f"{OUT}\\items\\p-sand.webp": f"{BRAIN}\\item_p_sand_png_1793723408220.jpg",
    f"{OUT}\\items\\m-sand.webp": f"{BRAIN}\\item_m_sand_png_1793723446368.jpg",
    f"{OUT}\\items\\dry-sand.webp": f"{BRAIN}\\construction_sand_pile_png_1793723205924.jpg",
    f"{OUT}\\items\\river-sand.webp": f"{BRAIN}\\category_sand_png_1793723379764.jpg",
    f"{OUT}\\items\\jelly-10.webp": f"{ASSETS}\\stone-metal-raw.jpg",
    f"{OUT}\\items\\jelly-20.webp": f"{BRAIN}\\category_aggregate_png_1793723399556.jpg",
    f"{OUT}\\items\\jelly-40.webp": f"{ASSETS}\\stone-crushed-raw.jpg",
    f"{OUT}\\items\\red-bricks.webp": f"{BRAIN}\\item_red_bricks_png_1793723421562.jpg",
    f"{OUT}\\items\\hollow-blocks.webp": f"{BRAIN}\\item_hollow_blocks_png_1793723440393.jpg",
    f"{OUT}\\items\\soil.webp": f"{BRAIN}\\item_soil_png_1793723458384.jpg",
    f"{OUT}\\items\\debris.webp": f"{ASSETS}\\rubble-raw.jpg",

    # Vehicles
    f"{OUT}\\vehicles\\pickup-auto.webp": f"{BRAIN}\\vehicle_pickup_auto_png_1793723431945.jpg",
    f"{OUT}\\vehicles\\tata-ace.webp": f"{BRAIN}\\vehicle_tata_ace_png_1793723451146.jpg",
    f"{OUT}\\vehicles\\bolero.webp": f"{ASSETS}\\bolero-raw.jpg",
    f"{OUT}\\vehicles\\lorry-14.webp": f"{ASSETS}\\lorry-14-raw.jpg",
    f"{OUT}\\vehicles\\tipper-1.webp": f"{ASSETS}\\tipper-1-raw.jpg",
    f"{OUT}\\vehicles\\tipper-2.webp": f"{ASSETS}\\tipper-2-raw.jpg",
    f"{OUT}\\vehicles\\taurus.webp": f"{ASSETS}\\taurus-raw.jpg",
}

for dest, src in MAPPINGS.items():
    if not os.path.exists(src):
        print(f"MISSING: {src}")
    else:
        process_and_save(src, dest, target_size=(800, 600))

print("\nAll conversions completed!")
