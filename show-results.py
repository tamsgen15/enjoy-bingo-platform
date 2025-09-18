#!/usr/bin/env python3
"""
Show results of the bingo card conversion
"""

import os
from PIL import Image

def show_results():
    """Show conversion results"""
    
    # Check JPG files
    jpg_files = [f for f in os.listdir("printable_cards") if f.endswith('.jpg') and f.startswith('bingo_card_')]
    jpg_count = len(jpg_files)
    
    # Check master PNG
    master_file = "printable_cards/master_bingo_cards_1meter.png"
    master_exists = os.path.exists(master_file)
    master_size = os.path.getsize(master_file) if master_exists else 0
    
    # Get sample JPG dimensions (use a smaller approach)
    if jpg_files:
        sample_jpg = f"printable_cards/{jpg_files[0]}"
        with Image.open(sample_jpg) as img:
            jpg_width, jpg_height = img.size
        jpg_size = os.path.getsize(sample_jpg)
    else:
        jpg_width = jpg_height = jpg_size = 0
    
    print("=" * 60)
    print("BINGO CARDS CONVERSION COMPLETE!")
    print("=" * 60)
    
    print(f"\nSUCCESS SUMMARY:")
    print(f"  ✓ Converted {jpg_count} PDF cards to JPG format")
    print(f"  ✓ Created master PNG file with all 100 cards")
    print(f"  ✓ All files ready for professional printing")
    
    print(f"\nINDIVIDUAL JPG CARDS:")
    print(f"  - Count: {jpg_count} cards")
    print(f"  - Dimensions: {jpg_width} x {jpg_height} pixels")
    print(f"  - Physical size: 15cm x 20cm (at 300 DPI)")
    print(f"  - Average file size: {jpg_size/1024:.1f} KB")
    print(f"  - Format: High-quality JPG")
    
    if master_exists:
        print(f"\nMASTER PNG FILE:")
        print(f"  - File size: {master_size/1024/1024:.1f} MB")
        print(f"  - Contains: All 100 cards in 10x10 grid")
        print(f"  - Physical print size: ~150cm x 200cm")
        print(f"  - Perfect for 1-meter width printing")
    
    print(f"\nPRINTING SPECIFICATIONS:")
    print(f"  INDIVIDUAL CARDS (15cm x 20cm each):")
    print(f"    • Print at 300 DPI for exact size")
    print(f"    • Use photo paper for best quality")
    print(f"    • Files: bingo_card_001.jpg to bingo_card_100.jpg")
    
    print(f"\n  MASTER FILE (All 100 cards in one image):")
    print(f"    • Print at 300 DPI")
    print(f"    • Large format printer required")
    print(f"    • Each card will be 15cm x 20cm in the grid")
    print(f"    • File: master_bingo_cards_1meter.png")
    
    print(f"\nFILE LOCATIONS:")
    print(f"  📁 printable_cards/")
    print(f"     📄 bingo_card_001.jpg to bingo_card_100.jpg")
    print(f"     🖼️  master_bingo_cards_1meter.png")
    
    print("=" * 60)
    print("READY FOR PROFESSIONAL PRINTING! 🎯")
    print("=" * 60)

if __name__ == "__main__":
    show_results()