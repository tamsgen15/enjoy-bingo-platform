#!/usr/bin/env python3
"""
Generate PNG bingo cards from database
Creates high-quality PNG files for digital use
"""

import os
import requests
from PIL import Image, ImageDraw, ImageFont
import json

# Supabase connection
SUPABASE_URL = 'https://gvfcbzzindikkmhaahak.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZmNienppbmRpa2ttaGFhaGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjU5MzYsImV4cCI6MjA3MjA0MTkzNn0.9Pc-juJB8PqZkznfjQOERM27Gpap-wvIiG7aLkEFkMc'

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

def fetch_bingo_cards():
    """Fetch all bingo cards from database"""
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }
    
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/bingo_cards?select=*&order=card_number",
        headers=headers
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error fetching cards: {response.status_code}")
        return []

def create_png_bingo_card(card_data, filename):
    """Create a PNG bingo card"""
    # High-quality card dimensions
    cell_size = 120
    grid_width = cell_size * 5  # 600px
    width, height = grid_width, 900
    img = Image.new('RGB', (width, height), WHITE)
    draw = ImageDraw.Draw(img)
    
    # Try to load fonts
    try:
        title_font = ImageFont.truetype("arial.ttf", 28)
        subtitle_font = ImageFont.truetype("arial.ttf", 18)
        header_font = ImageFont.truetype("arial.ttf", 24)
        cell_font = ImageFont.truetype("arial.ttf", 20)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        header_font = ImageFont.load_default()
        cell_font = ImageFont.load_default()
    
    # Header section - same width as bingo grid
    header_height = 120
    draw.rectangle([0, 0, grid_width, header_height], fill=WHITE, outline=GREEN, width=4)
    
    # Logo
    logo_path = "printable_cards/enjoycartelalogo.jpg"
    if os.path.exists(logo_path):
        try:
            logo = Image.open(logo_path)
            logo = logo.resize((100, 60))
            img.paste(logo, (10, 20))
        except:
            pass
    
    # Title and card info
    draw.text((130, 25), "ENJOY BINGO", fill=GREEN, font=title_font)
    draw.text((130, 55), f"CARD #{card_data['card_number']:03d} - 20 ETB", fill=GREEN, font=subtitle_font)
    
    # BINGO header letters
    letters = ['B', 'I', 'N', 'G', 'O']
    start_x = 0
    start_y = 140
    
    for i, letter in enumerate(letters):
        x = start_x + i * cell_size
        y = start_y
        
        # Circular background
        draw.ellipse([x+15, y+15, x+105, y+105], fill=HEADER_COLORS[letter])
        
        # Letter text
        bbox = draw.textbbox((0, 0), letter, font=header_font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        text_x = x + (cell_size - text_width) // 2
        text_y = y + (90 - text_height) // 2 + 15
        draw.text((text_x, text_y), letter, fill=WHITE, font=header_font)
    
    # Number grid
    grid_start_y = start_y + 120
    columns = [
        card_data['b_column'],
        card_data['i_column'], 
        card_data['n_column'],
        card_data['g_column'],
        card_data['o_column']
    ]
    
    for row in range(5):
        for col in range(5):
            x = start_x + col * cell_size
            y = grid_start_y + row * cell_size
            
            # Cell background and border
            if col == 2 and row == 2:  # FREE space
                draw.rectangle([x, y, x+cell_size, y+cell_size], fill=GREEN, outline=GREEN, width=4)
                text = "FREE"
                text_color = WHITE
            else:
                draw.rectangle([x, y, x+cell_size, y+cell_size], fill=WHITE, outline=GREEN, width=4)
                
                # Get number
                if col == 2:  # N column (skip center)
                    idx = row if row < 2 else row - 1
                    number = columns[col][idx]
                else:
                    number = columns[col][row]
                
                text = str(number)
                text_color = BLACK
            
            # Center text in cell
            bbox = draw.textbbox((0, 0), text, font=cell_font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            text_x = x + (cell_size - text_width) // 2
            text_y = y + (cell_size - text_height) // 2
            draw.text((text_x, text_y), text, fill=text_color, font=cell_font)
    
    # Save high-quality PNG
    img.save(filename, 'PNG', optimize=False, compress_level=0)
    print(f"Generated PNG: {filename}")

def generate_png_cards():
    """Generate PNG files for all bingo cards"""
    print("Fetching bingo cards from database...")
    cards = fetch_bingo_cards()
    
    if not cards:
        print("No cards found in database!")
        return
    
    # Create output directory
    os.makedirs("printable_cards", exist_ok=True)
    
    print(f"Generating {len(cards)} PNG bingo cards...")
    
    for card in cards:
        filename = f"printable_cards/bingo_card_{card['card_number']:03d}.png"
        create_png_bingo_card(card, filename)
    
    print(f"\nGenerated {len(cards)} PNG bingo cards!")
    print("Files saved in: printable_cards/")
    print("Perfect PNG quality for digital use!")

if __name__ == "__main__":
    generate_png_cards()