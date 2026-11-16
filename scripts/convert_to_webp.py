import os
import sys
from PIL import Image

def convert_image(src_path, dest_path, max_dim=(1024, 768), quality=85):
    """
    Resizes image proportionally if larger than max_dim and saves as optimized WebP.
    """
    if not os.path.exists(src_path):
        print(f"Error: source not found: {src_path}", file=sys.stderr)
        return False
        
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    
    with Image.open(src_path) as img:
        img = img.convert("RGB")
        img.thumbnail(max_dim, Image.Resampling.LANCZOS)
        img.save(dest_path, "WEBP", quality=quality, method=6)
        size_kb = os.path.getsize(dest_path) / 1024
        print(f"Saved: {dest_path} ({img.size[0]}x{img.size[1]}, {size_kb:.1f} KB)")
        return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python convert_to_webp.py <src_path> <dest_path>")
        sys.exit(1)
    
    src = sys.argv[1]
    dest = sys.argv[2]
    success = convert_image(src, dest)
    sys.exit(0 if success else 1)
