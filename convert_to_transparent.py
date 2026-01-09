#!/usr/bin/env python3
"""
Convert images with white backgrounds to transparent backgrounds.
Handles anti-aliased edges by converting gray pixels to black with appropriate alpha.
Usage: python convert_to_transparent.py <image_path> [--threshold 250] [--output output.png]
"""

from PIL import Image
import argparse
import os


def convert_white_to_transparent(image_path, threshold=250, output_path=None):
    """
    Convert white background to transparent while preserving black line art.
    Gray anti-aliased pixels become black with proportional transparency.

    Args:
        image_path: Path to the input image
        threshold: RGB values above this are considered pure "white" (0-255, default 250)
        output_path: Output file path (defaults to input_transparent.png)
    """
    img = Image.open(image_path).convert("RGBA")
    data = img.getdata()

    new_data = []
    for item in data:
        r, g, b, a = item

        # Calculate brightness (average of RGB)
        brightness = (r + g + b) / 3

        if brightness >= threshold:
            # Pure white - make fully transparent
            new_data.append((0, 0, 0, 0))
        elif brightness < 50:
            # Dark pixels - keep as black, fully opaque
            new_data.append((0, 0, 0, 255))
        else:
            # Gray pixels (anti-aliasing) - convert to black with alpha
            # The darker the gray, the more opaque
            alpha = int(255 * (1 - (brightness / threshold)))
            alpha = max(0, min(255, alpha))  # Clamp to valid range
            new_data.append((0, 0, 0, alpha))

    img.putdata(new_data)

    if output_path is None:
        base, ext = os.path.splitext(image_path)
        output_path = f"{base}_transparent.png"

    img.save(output_path, "PNG")
    print(f"Saved: {output_path}")
    return output_path


def main():
    parser = argparse.ArgumentParser(description="Convert white backgrounds to transparent")
    parser.add_argument("image", help="Path to the image file")
    parser.add_argument("--threshold", "-t", type=int, default=250,
                        help="RGB threshold for white detection (0-255, default: 250)")
    parser.add_argument("--output", "-o", help="Output file path (default: adds _transparent suffix)")

    args = parser.parse_args()

    if not os.path.exists(args.image):
        print(f"Error: File not found: {args.image}")
        return 1

    convert_white_to_transparent(args.image, args.threshold, args.output)
    return 0


if __name__ == "__main__":
    exit(main())
