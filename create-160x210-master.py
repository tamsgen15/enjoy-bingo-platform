#!/usr/bin/env python3
"""
Create master PNG with 1.60m x 2.10m dimensions (10x10 grid)
"""

import os
import glob
from PIL import Image

# New dimensions: 1.60m x 2.10m at 300 DPI
DPI = 300
MASTER_WIDTH_CM = 160
MASTER_HEIGHT_CM = 210
MASTER_WIDTH_PX = int(MASTER_WIDTH_CM * DPI / 2.54)  # 1890 pixels
MASTER_HEIGHT_PX = int(MASTER_HEIGHT_CM * DPI / 2.54)  # 2480 pixels

# Grid: 10x10
GRID_ROWS = 10
GRID_COLS = 10
CARD_WIDTH_PX = MASTER_WIDTH_PX // GRID_COLS  # 189 pixels per card
CARD_HEIGHT_PX = MASTER_HEIGHT_PX // GRID_ROWS  # 248 pixels per card

def create_160x210_master():
    """Create master PNG with 1.60m x 2.10m dimensions"""
    
    # Get existing JPG files
    jpg_files = glob.glob("printable_cards/bingo_card_*.jpg")
    jpg_files.sort()
    
    if len(jpg_files) < 100:
        print(f"Only found {len(jpg_files)} JPG files. Need 100 cards.")
        return
    
    print(f"Creating 1.60m x 2.10m master PNG...")
    
    # Create master image
    master_img = Image.new('RGB', (MASTER_WIDTH_PX, MASTER_HEIGHT_PX), (255, 255, 255))
    
    # Place 100 cards in 10x10 grid
    for i in range(100):
        jpg_path = jpg_files[i]
        
        # Load and resize card to fit grid cell
        card_img = Image.open(jpg_path)
        card_img = card_img.resize((CARD_WIDTH_PX, CARD_HEIGHT_PX), Image.Resampling.LANCZOS)
        
        # Calculate position in grid
        row = i // GRID_COLS
        col = i % GRID_COLS
        x = col * CARD_WIDTH_PX
        y = row * CARD_HEIGHT_PX
        
        # Paste card into master
        master_img.paste(card_img, (x, y))
        
        if (i + 1) % 10 == 0:
            print(f"Processed {i + 1}/100 cards...")
    
    # Save master PNG
    master_filename = "printable_cards/master_bingo_cards_160x210cm.png"
    master_img.save(master_filename, 'PNG', optimize=False)
    
    print(f"\nSUCCESS!")
    print(f"Created: {master_filename}")
    print(f"Dimensions: {MASTER_WIDTH_PX} x {MASTER_HEIGHT_PX} pixels")
    print(f"Physical size: 160cm x 210cm (1.60m x 2.10m)")
    print(f"Grid: 10x10 cards")
    print(f"Each card: {CARD_WIDTH_PX} x {CARD_HEIGHT_PX} pixels (16cm x 21cm)")

if __name__ == "__main__":
    create_160x210_master()