#!/usr/bin/env python3
"""
Convert existing PDF bingo cards to JPG format (15cm x 20cm)
Plus create a master PNG file with all 100 cards in 10x10 grid for 1-meter printing
"""

import os
import glob
from PIL import Image
import fitz  # PyMuPDF

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

def pdf_to_jpg(pdf_path, jpg_path, target_width=CARD_WIDTH_PX, target_height=CARD_HEIGHT_PX):
    """Convert PDF to JPG with specific dimensions"""
    try:
        # Open PDF
        doc = fitz.open(pdf_path)
        page = doc[0]  # Get first page
        
        # Calculate zoom to get target dimensions
        page_rect = page.rect
        zoom_x = target_width / page_rect.width
        zoom_y = target_height / page_rect.height
        
        # Use the smaller zoom to maintain aspect ratio, then crop if needed
        zoom = min(zoom_x, zoom_y)
        
        # Create transformation matrix
        mat = fitz.Matrix(zoom, zoom)
        
        # Render page to pixmap
        pix = page.get_pixmap(matrix=mat)
        
        # Convert to PIL Image
        img_data = pix.tobytes("ppm")
        img = Image.open(io.BytesIO(img_data))
        
        # Resize to exact target dimensions
        img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
        
        # Save as JPG
        img.save(jpg_path, 'JPEG', quality=95, optimize=True)
        
        doc.close()
        return img
        
    except Exception as e:
        print(f"Error converting {pdf_path}: {e}")
        return None

def convert_pdfs_to_jpgs_and_master():
    """Convert all PDF cards to JPG and create master PNG"""
    
    # Get all PDF files
    pdf_files = glob.glob("printable_cards/bingo_card_*.pdf")
    pdf_files.sort()
    
    if not pdf_files:
        print("No PDF files found in printable_cards folder!")
        return
    
    print(f"Found {len(pdf_files)} PDF files to convert...")
    
    # Create master grid image
    master_img = Image.new('RGB', (MASTER_WIDTH_PX, MASTER_HEIGHT_PX), (255, 255, 255))
    
    converted_images = []
    
    for i, pdf_path in enumerate(pdf_files):
        # Extract card number from filename
        filename = os.path.basename(pdf_path)
        card_number = filename.replace('bingo_card_', '').replace('.pdf', '')
        
        print(f"Converting card {card_number} ({i+1}/{len(pdf_files)})...")
        
        # Convert PDF to JPG
        jpg_path = f"printable_cards/bingo_card_{card_number}.jpg"
        card_img = pdf_to_jpg(pdf_path, jpg_path)
        
        if card_img:
            converted_images.append(card_img)
            
            # Place in master grid (10x10)
            if i < 100:  # Only place first 100 cards
                row = i // GRID_COLS
                col = i % GRID_COLS
                x = col * CARD_WIDTH_PX
                y = row * CARD_HEIGHT_PX
                master_img.paste(card_img, (x, y))
    
    # Save master PNG
    master_filename = "printable_cards/master_bingo_cards_1meter.png"
    print(f"Saving master PNG file: {master_filename}")
    master_img.save(master_filename, 'PNG', optimize=False)
    
    print(f"\n✅ Converted {len(converted_images)} PDF cards to JPG!")
    print(f"✅ Created master PNG file: {master_filename}")
    print("\nFile specifications:")
    print(f"📄 Individual JPG cards: {CARD_WIDTH_PX}x{CARD_HEIGHT_PX}px (15cm x 20cm at 300 DPI)")
    print(f"🖼️  Master PNG grid: {MASTER_WIDTH_PX}x{MASTER_HEIGHT_PX}px")
    print(f"📐 Grid layout: {GRID_ROWS} rows × {GRID_COLS} columns")
    print(f"💾 Files saved in: printable_cards/")
    print("\nPrint settings:")
    print("- Individual JPG cards: Print at 300 DPI for exactly 15cm x 20cm")
    print("- Master PNG file: Print at 300 DPI for 1-meter width")
    print("- Physical master size: 177.2cm x 236.2cm (1.77m x 2.36m)")

if __name__ == "__main__":
    # Check if PyMuPDF is installed
    try:
        import fitz
        import io
    except ImportError:
        print("PyMuPDF not found. Installing...")
        os.system("pip install PyMuPDF")
        import fitz
        import io
    
    convert_pdfs_to_jpgs_and_master()