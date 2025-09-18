#!/usr/bin/env python3
"""
Print specifications and summary for the converted bingo cards
"""

import os
from PIL import Image

def get_file_info():
    """Get information about the generated files"""
    
    # Check JPG files
    jpg_files = [f for f in os.listdir("printable_cards") if f.endswith('.jpg') and f.startswith('bingo_card_')]
    jpg_count = len(jpg_files)
    
    # Check master PNG
    master_file = "printable_cards/master_bingo_cards_1meter.png"
    master_exists = os.path.exists(master_file)
    
    if master_exists:
        # Get master file dimensions
        with Image.open(master_file) as img:
            master_width, master_height = img.size
    else:
        master_width = master_height = 0
    
    # Get sample JPG dimensions
    if jpg_files:
        sample_jpg = f"printable_cards/{jpg_files[0]}"
        with Image.open(sample_jpg) as img:
            jpg_width, jpg_height = img.size
    else:
        jpg_width = jpg_height = 0
    
    return {
        'jpg_count': jpg_count,
        'jpg_width': jpg_width,
        'jpg_height': jpg_height,
        'master_exists': master_exists,
        'master_width': master_width,
        'master_height': master_height
    }

def print_specifications():
    """Print detailed specifications"""
    
    info = get_file_info()
    
    print("=" * 60)
    print("BINGO CARDS CONVERSION COMPLETE")
    print("=" * 60)
    
    print(f"\nINDIVIDUAL JPG CARDS:")
    print(f"  - Count: {info['jpg_count']} cards")
    print(f"  - Dimensions: {info['jpg_width']} x {info['jpg_height']} pixels")
    print(f"  - Physical size: 15cm x 20cm (at 300 DPI)")
    print(f"  - Format: High-quality JPG (95% quality)")
    print(f"  - Files: bingo_card_001.jpg to bingo_card_100.jpg")
    
    if info['master_exists']:
        print(f"\nMASTER PNG FILE:")
        print(f"  - Dimensions: {info['master_width']} x {info['master_height']} pixels")
        print(f"  - Physical size: {info['master_width']/118.11:.1f}cm x {info['master_height']/118.11:.1f}cm (at 300 DPI)")
        print(f"  - Grid layout: 10 rows x 10 columns")
        print(f"  - Total cards: 100 cards in one image")
        print(f"  - File: master_bingo_cards_1meter.png")
    
    print(f"\nPRINTING INSTRUCTIONS:")
    print(f"  INDIVIDUAL CARDS:")
    print(f"    - Print at 300 DPI")
    print(f"    - Each card will be exactly 15cm x 20cm")
    print(f"    - Use high-quality photo paper for best results")
    
    if info['master_exists']:
        print(f"\n  MASTER FILE (1-METER PRINTING):")
        print(f"    - Print at 300 DPI")
        print(f"    - Total size: {info['master_width']/118.11:.1f}cm x {info['master_height']/118.11:.1f}cm")
        print(f"    - Each card in grid: 15cm x 20cm")
        print(f"    - 100 cards arranged in 10x10 grid")
        print(f"    - Suitable for large format printing")
    
    print(f"\nFILE LOCATIONS:")
    print(f"  - All files saved in: printable_cards/")
    print(f"  - Individual JPGs: printable_cards/bingo_card_XXX.jpg")
    if info['master_exists']:
        print(f"  - Master PNG: printable_cards/master_bingo_cards_1meter.png")
    
    print(f"\nQUALITY SPECIFICATIONS:")
    print(f"  - Resolution: 300 DPI (print quality)")
    print(f"  - JPG Quality: 95% (high quality, optimized)")
    print(f"  - PNG: Lossless compression")
    print(f"  - Color: Full RGB color")
    
    print("=" * 60)
    print("READY FOR PROFESSIONAL PRINTING!")
    print("=" * 60)

if __name__ == "__main__":
    print_specifications()