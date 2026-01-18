import os
from PIL import Image, ImageOps, ImageDraw

def create_circular_icon(input_path, output_dir):
    try:
        img = Image.open(input_path).convert("RGBA")
    except Exception as e:
        print(f"Error opening image: {e}")
        return

    # Create a circular mask
    size = min(img.size)
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)

    # Crop the image to a square
    img = ImageOps.fit(img, (size, size), centering=(0.5, 0.5))
    
    # Apply the mask
    img.putalpha(mask)

    # Define sizes
    sizes = {
        "favicon.png": (32, 32),
        "pwa-192x192.png": (192, 192),
        "pwa-512x512.png": (512, 512),
        "apple-touch-icon.png": (180, 180)
    }

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    for filename, dimensions in sizes.items():
        output_path = os.path.join(output_dir, filename)
        resized_img = img.resize(dimensions, Image.Resampling.LANCZOS)
        resized_img.save(output_path)
        print(f"Generated {output_path}")

if __name__ == "__main__":
    input_icon = "icon.png"
    output_directory = "client/public"
    
    if os.path.exists(input_icon):
        create_circular_icon(input_icon, output_directory)
    else:
        print(f"Error: {input_icon} not found in current directory.")
