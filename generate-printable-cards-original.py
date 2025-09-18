#!/usr/bin/env python3
"""
Generate printable bingo cards from database
Creates PDF files for physical printing that match the preview modal exactly
"""

import os
import json
import requests
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.graphics.shapes import Circle, Drawing
from reportlab.platypus import Flowable

# Supabase connection
import os
SUPABASE_URL = 'https://gvfcbzzindikkmhaahak.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZmNienppbmRpa2ttaGFhaGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjU5MzYsImV4cCI6MjA3MjA0MTkzNn0.9Pc-juJB8PqZkznfjQOERM27Gpap-wvIiG7aLkEFkMc'

# Color mapping to match BingoCard.tsx
COLOR_MAP = {
    'B': colors.Color(0.125, 0.588, 0.953),  # bg-sky-400
    'I': colors.Color(0.937, 0.322, 0.322),  # bg-red-500
    'N': colors.Color(0.937, 0.831, 0.322),  # bg-yellow-500
    'G': colors.Color(0.322, 0.737, 0.322),  # bg-green-500
    'O': colors.Color(0.953, 0.588, 0.322)   # bg-orange-500
}

class CircularHeader(Flowable):
    """Custom flowable for circular header letters"""
    def __init__(self, letter, color, size=40):
        self.letter = letter
        self.color = color
        self.size = size
        self.width = size
        self.height = size
    
    def draw(self):
        # Draw circle
        self.canv.setFillColor(self.color)
        self.canv.circle(self.size/2, self.size/2, self.size/2, fill=1)
        
        # Draw letter
        self.canv.setFillColor(colors.white)
        self.canv.setFont('Helvetica-Bold', 18)
        text_width = self.canv.stringWidth(self.letter, 'Helvetica-Bold', 18)
        x = (self.size - text_width) / 2
        y = (self.size - 18) / 2
        self.canv.drawString(x, y, self.letter)

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

def create_bingo_card_pdf(card_data, filename):
    """Create a single bingo card PDF with circular headers matching preview modal"""
    doc = SimpleDocTemplate(filename, pagesize=A4, topMargin=0.5*inch)
    elements = []
    
    # Title
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        spaceAfter=20,
        alignment=1,
        textColor=colors.black,
        fontName='Helvetica-Bold'
    )
    
    title = Paragraph(f"BINGO CARD #{card_data['card_number']} - 20 ETB", title_style)
    elements.append(title)
    elements.append(Spacer(1, 10))
    
    # Create circular header letters
    from reportlab.platypus import Table, TableStyle
    from reportlab.graphics.shapes import Drawing, Circle, String
    from reportlab.graphics import renderPDF
    
    # Create header with circular backgrounds
    header_data = [['B', 'I', 'N', 'G', 'O']]
    header_table = Table(header_data, colWidths=[1*inch]*5, rowHeights=[0.7*inch])
    
    # Apply circular styling
    header_table.setStyle(TableStyle([
        # Circular backgrounds for each letter
        ('BACKGROUND', (0, 0), (0, 0), COLOR_MAP['B']),
        ('BACKGROUND', (1, 0), (1, 0), COLOR_MAP['I']),
        ('BACKGROUND', (2, 0), (2, 0), COLOR_MAP['N']),
        ('BACKGROUND', (3, 0), (3, 0), COLOR_MAP['G']),
        ('BACKGROUND', (4, 0), (4, 0), COLOR_MAP['O']),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 20),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        # Make cells circular
        ('ROUNDEDCORNERS', (0, 0), (-1, -1), [25, 25, 25, 25]),
        ('GRID', (0, 0), (-1, -1), 1, colors.white),
    ]))
    
    elements.append(header_table)
    elements.append(Spacer(1, 5))
    
    # Create number grid (5x5) - shuffle numbers within each column for uniqueness
    grid_data = []
    
    # Shuffle the column arrays to ensure different positioning
    import random
    b_shuffled = card_data['b_column'].copy()
    i_shuffled = card_data['i_column'].copy()
    n_shuffled = card_data['n_column'].copy()
    g_shuffled = card_data['g_column'].copy()
    o_shuffled = card_data['o_column'].copy()
    
    # Use exact database order - no shuffling for consistency
    b_shuffled = card_data['b_column']
    i_shuffled = card_data['i_column']
    n_shuffled = card_data['n_column']
    g_shuffled = card_data['g_column']
    o_shuffled = card_data['o_column']
    
    for row in range(5):
        row_data = []
        for col in range(5):
            if col == 0:  # B column
                row_data.append(str(b_shuffled[row]))
            elif col == 1:  # I column
                row_data.append(str(i_shuffled[row]))
            elif col == 2:  # N column
                if row == 2:  # Center square (FREE)
                    row_data.append('FREE')
                else:
                    idx = row if row < 2 else row - 1
                    row_data.append(str(n_shuffled[idx]))
            elif col == 3:  # G column
                row_data.append(str(g_shuffled[row]))
            elif col == 4:  # O column
                row_data.append(str(o_shuffled[row]))
        grid_data.append(row_data)
    
    # Create number grid table
    grid_table = Table(grid_data, colWidths=[1*inch]*5, rowHeights=[0.8*inch]*5)
    grid_table.setStyle(TableStyle([
        # All cells
        ('BACKGROUND', (0, 0), (-1, -1), colors.white),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 16),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 2, colors.black),
        
        # FREE space styling
        ('BACKGROUND', (2, 2), (2, 2), colors.lightgrey),
        ('FONTSIZE', (2, 2), (2, 2), 12),
        ('TEXTCOLOR', (2, 2), (2, 2), colors.darkred),
    ]))
    
    elements.append(grid_table)
    elements.append(Spacer(1, 20))
    
    # Footer
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=10,
        alignment=1,
        textColor=colors.grey
    )
    
    footer = Paragraph("ENJOY TV BINGO GAME - Print and Play!", footer_style)
    elements.append(footer)
    
    doc.build(elements)
    print(f"Generated: {filename}")

def generate_all_cards():
    """Generate PDFs for all bingo cards"""
    print("Fetching bingo cards from database...")
    cards = fetch_bingo_cards()
    
    if not cards:
        print("No cards found in database!")
        return
    
    # Create output directory
    os.makedirs("printable_cards", exist_ok=True)
    
    print(f"Generating {len(cards)} printable bingo cards...")
    
    for card in cards:
        filename = f"printable_cards/bingo_card_{card['card_number']:03d}.pdf"
        create_bingo_card_pdf(card, filename)
    
    print(f"\nGenerated {len(cards)} printable bingo cards!")
    print("Files saved in: printable_cards/")
    print("Ready for printing!")
    print("Cards now match preview modal styling exactly!")

if __name__ == "__main__":
    generate_all_cards()