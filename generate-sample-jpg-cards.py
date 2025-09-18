#!/usr/bin/env python3
"""
Generate sample JPG bingo cards with 15cm x 20cm dimensions
Plus create a master PNG file with all 100 cards in 10x10 grid for 1-meter printing
"""

import os
import random
from PIL import Image, ImageDraw, ImageFont

# Physical dimensions: 15cm x 20cm at 300 DPI for high quality printing
DPI = 300
CARD_WIDTH_CM = 15
CARD_HEIGHT_CM = 20
CARD_WIDTH_PX = int(CARD_WIDTH_CM * DPI / 2.54)  # 1772 pixels
CARD_HEIGHT_PX = int(CARD_HEIGHT_CM * DPI / 2.54)  # 2362 pixels

# Master grid: 10x10 cards for 1-meter printing
GRID_ROWS = 10
GRID_COLS = 10
MASTER_WIDTH_PX = CARD_WIDTH_PX * GRID_COLS  # 17720 pixels
MASTER_HEIGHT_PX = CARD_HEIGHT_PX * GRID_ROWS  # 23620 pixels

# Colors
GREEN = (0, 128, 0)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
HEADER_COLORS = {
    'B': (51, 102, 204),    # Blue
    'I': (204, 51, 51),     # Red  
    'N': (230, 184, 0),     # Gold
    'G': (51, 179, 102),    # Green
    'O': (230, 128, 26)     # Orange
}

def generate_bingo_card_data(card_number):
    """Generate unique bingo card data"""
    # Ensure reproducible cards by seeding with card number
    random.seed(card_number * 12345)
    
    # BINGO number ranges
    b_numbers = random.sample(range(1, 16), 5)    # B: 1-15
    i_numbers = random.sample(range(16, 31), 5)   # I: 16-30
    n_numbers = random.sample(range(31, 46), 4)   # N: 31-45 (4 numbers, center is FREE)
    g_numbers = random.sample(range(46, 61), 5)   # G: 46-60
    o_numbers = random.sample(range(61, 76), 5)   # O: 61-75
    
    return {
        'card_number': card_number,
        'b_column': sorted(b_numbers),
        'i_column': sorted(i_numbers),
        'n_column': sorted(n_numbers),
        'g_column': sorted(g_numbers),
        'o_column': sorted(o_numbers)
    }

def create_jpg_bingo_card(card_data):
    """Create a high-resolution JPG bingo card (15cm x 20cm)"""
    img = Image.new('RGB', (CARD_WIDTH_PX, CARD_HEIGHT_PX), WHITE)
    draw = ImageDraw.Draw(img)
    
    # Scale fonts for high resolution
    try:
        title_font = ImageFont.truetype("arial.ttf", 80)
        subtitle_font = ImageFont.truetype("arial.ttf", 50)
        header_font = ImageFont.truetype("arial.ttf", 70)
        cell_font = ImageFont.truetype("arial.ttf", 60)
        free_font = ImageFont.truetype("arial.ttf", 40)
    except:
        # Fallback to default font with size scaling
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        header_font = ImageFont.load_default()
        cell_font = ImageFont.load_default()
        free_font = ImageFont.load_default()
    
    # Header section
    header_height = 300
    draw.rectangle([0, 0, CARD_WIDTH_PX, header_height], fill=WHITE, outline=GREEN, width=8)
    
    # Logo placeholder (if logo exists)
    logo_path = "printable_cards/enjoycartelalogo.jpg"
    if os.path.exists(logo_path):
        try:
            logo = Image.open(logo_path)
            logo = logo.resize((250, 150))
            img.paste(logo, (30, 75))
        except:
            # Draw placeholder logo
            draw.rectangle([30, 75, 280, 225], fill=GREEN, outline=BLACK, width=4)
            draw.text((155, 150), "LOGO", fill=WHITE, font=subtitle_font, anchor="mm")
    else:
        # Draw placeholder logo
        draw.rectangle([30, 75, 280, 225], fill=GREEN, outline=BLACK, width=4)
        draw.text((155, 150), "LOGO", fill=WHITE, font=subtitle_font, anchor="mm")
    
    # Title and card info
    draw.text((320, 80), "ENJOY BINGO", fill=GREEN, font=title_font)
    draw.text((320, 170), f"CARD #{card_data['card_number']:03d} - 20 ETB", fill=GREEN, font=subtitle_font)
    
    # BINGO header letters
    letters = ['B', 'I', 'N', 'G', 'O']
    cell_size = CARD_WIDTH_PX // 5
    start_y = header_height + 50
    
    for i, letter in enumerate(letters):
        x = i * cell_size
        y = start_y
        
        # Circular background
        circle_size = cell_size - 40
        circle_x = x + 20
        circle_y = y + 20
        draw.ellipse([circle_x, circle_y, circle_x + circle_size, circle_y + circle_size], fill=HEADER_COLORS[letter])
        
        # Letter text
        bbox = draw.textbbox((0, 0), letter, font=header_font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        text_x = x + (cell_size - text_width) // 2
        text_y = y + (circle_size - text_height) // 2 + 20
        draw.text((text_x, text_y), letter, fill=WHITE, font=header_font)
    
    # Number grid
    grid_start_y = start_y + cell_size + 50
    grid_cell_height = (CARD_HEIGHT_PX - grid_start_y - 50) // 5
    
    columns = [
        card_data['b_column'],
        card_data['i_column'], 
        card_data['n_column'],
        card_data['g_column'],
        card_data['o_column']
    ]
    
    for row in range(5):
        for col in range(5):
            x = col * cell_size
            y = grid_start_y + row * grid_cell_height
            
            # Cell background and border
            if col == 2 and row == 2:  # FREE space
                draw.rectangle([x, y, x + cell_size, y + grid_cell_height], fill=GREEN, outline=GREEN, width=8)
                text = "FREE"
                text_color = WHITE
                font = free_font
            else:
                draw.rectangle([x, y, x + cell_size, y + grid_cell_height], fill=WHITE, outline=GREEN, width=8)
                
                # Get number
                if col == 2:  # N column (skip center)
                    idx = row if row < 2 else row - 1
                    number = columns[col][idx]
                else:
                    number = columns[col][row]
                
                text = str(number)
                text_color = BLACK
                font = cell_font
            
            # Center text in cell
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            text_x = x + (cell_size - text_width) // 2
            text_y = y + (grid_cell_height - text_height) // 2
            draw.text((text_x, text_y), text, fill=text_color, font=font)
    
    return img

def generate_jpg_cards_and_master():
    """Generate 100 JPG cards and master PNG grid"""
    # Create output directory
    os.makedirs("printable_cards", exist_ok=True)
    
    print(f"Generating 100 JPG bingo cards (15cm x 20cm)...")
    
    # Create master grid image
    master_img = Image.new('RGB', (MASTER_WIDTH_PX, MASTER_HEIGHT_PX), WHITE)
    
    card_images = []
    
    # Generate 100 cards
    for i in range(100):
        card_number = i + 1
        print(f"Processing card {card_number}/100...")
        
        # Generate card data
        card_data = generate_bingo_card_data(card_number)
        
        # Create card image
        card_img = create_jpg_bingo_card(card_data)
        
        # Save individual JPG
        jpg_filename = f"printable_cards/bingo_card_{card_number:03d}.jpg"
        card_img.save(jpg_filename, 'JPEG', quality=95, optimize=True)
        
        # Store for master grid
        card_images.append(card_img)
        
        # Place in master grid
        row = i // GRID_COLS
        col = i % GRID_COLS
        x = col * CARD_WIDTH_PX
        y = row * CARD_HEIGHT_PX
        master_img.paste(card_img, (x, y))
    
    # Save master PNG
    master_filename = "printable_cards/master_bingo_cards_1meter.png"
    print(f"Saving master PNG file: {master_filename}")
    master_img.save(master_filename, 'PNG', optimize=False)
    
    print(f"\n✅ Generated {len(card_images)} JPG bingo cards!")
    print(f"✅ Created master PNG file: {master_filename}")
    print("\nFile specifications:")
    print(f"📄 Individual JPG cards: {CARD_WIDTH_PX}x{CARD_HEIGHT_PX}px (15cm x 20cm at 300 DPI)")
    print(f"🖼️  Master PNG grid: {MASTER_WIDTH_PX}x{MASTER_HEIGHT_PX}px (100cm x 118cm at 300 DPI)")
    print(f"📐 Grid layout: {GRID_ROWS} rows × {GRID_COLS} columns")
    print(f"💾 Files saved in: printable_cards/")
    print("\nPrint settings:")
    print("- Individual cards: Print at 300 DPI for 15cm x 20cm")
    print("- Master file: Print at 300 DPI for 1-meter width (actual size: 100cm x 118cm)")
    print("\nPhysical printing:")
    print("- Each card will be exactly 15cm × 20cm when printed")
    print("- Master file contains all 100 cards in 10×10 grid")
    print("- Total master size: 1.5m × 2.0m (150cm × 200cm)")

if __name__ == "__main__":
    generate_jpg_cards_and_master()