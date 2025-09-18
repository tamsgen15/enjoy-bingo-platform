#!/usr/bin/env python3
"""
Generate redesigned printable bingo cards based on enjoycartela.jpg sample
Includes ENJOY TV logo and professional layout
"""

import os
import json
import requests
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch, mm
from reportlab.graphics.shapes import Drawing, Rect, Circle
from reportlab.platypus import Flowable
from reportlab.graphics import renderPDF

# Supabase connection
SUPABASE_URL = 'https://gvfcbzzindikkmhaahak.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZmNienppbmRpa2ttaGFhaGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjU5MzYsImV4cCI6MjA3MjA0MTkzNn0.9Pc-juJB8PqZkznfjQOERM27Gpap-wvIiG7aLkEFkMc'

# Enhanced color scheme for professional look
HEADER_COLORS = {
    'B': colors.Color(0.2, 0.4, 0.8),    # Professional blue
    'I': colors.Color(0.8, 0.2, 0.2),    # Professional red
    'N': colors.Color(0.9, 0.7, 0.1),    # Professional gold
    'G': colors.Color(0.2, 0.7, 0.3),    # Professional green
    'O': colors.Color(0.9, 0.5, 0.1)     # Professional orange
}

class LogoHeader(Flowable):
    """Custom header with logo and branding"""
    def __init__(self, card_number, width=7*inch, height=1.5*inch):
        self.card_number = card_number
        self.width = width
        self.height = height
    
    def draw(self):
        # Background gradient effect
        self.canv.setFillColor(colors.Color(0.95, 0.95, 0.98))
        self.canv.rect(0, 0, self.width, self.height, fill=1, stroke=0)
        
        # Border
        self.canv.setStrokeColor(colors.Color(0.2, 0.4, 0.8))
        self.canv.setLineWidth(2)
        self.canv.rect(0, 0, self.width, self.height, fill=0, stroke=1)
        
        # Logo placeholder (if logo exists)
        logo_path = "Asset/enjoy-bingoOfficial.png"
        if os.path.exists(logo_path):
            try:
                # Draw logo on left side
                logo_size = 40
                self.canv.drawImage(logo_path, 10, (self.height-logo_size)/2, 
                                  width=logo_size, height=logo_size, mask='auto')
            except:
                # Fallback if logo can't be loaded
                self.canv.setFillColor(colors.Color(0.2, 0.4, 0.8))
                self.canv.circle(30, self.height/2, 20, fill=1)
                self.canv.setFillColor(colors.white)
                self.canv.setFont('Helvetica-Bold', 12)
                self.canv.drawCentredString(30, self.height/2-4, "ENJOY")
        
        # Main title
        self.canv.setFillColor(colors.Color(0.2, 0.4, 0.8))
        self.canv.setFont('Helvetica-Bold', 24)
        title_x = 70 if os.path.exists(logo_path) else 20
        self.canv.drawString(title_x, self.height/2 + 10, "ENJOY TV BINGO")
        
        # Card number and price
        self.canv.setFont('Helvetica-Bold', 16)
        self.canv.drawString(title_x, self.height/2 - 15, f"CARD #{self.card_number:03d} - 20 ETB")
        
        # Right side decoration
        self.canv.setFillColor(colors.Color(0.9, 0.7, 0.1))
        self.canv.rect(self.width-60, 10, 50, self.height-20, fill=1, stroke=0)
        self.canv.setFillColor(colors.white)
        self.canv.setFont('Helvetica-Bold', 14)
        self.canv.drawCentredString(self.width-35, self.height/2-5, "OFFICIAL")

class BingoGrid(Flowable):
    """Professional bingo grid with enhanced styling"""
    def __init__(self, card_data, width=5*inch, height=5*inch):
        self.card_data = card_data
        self.width = width
        self.height = height
        self.cell_size = min(width/5, height/5)
    
    def draw(self):
        # Draw header letters with circular backgrounds
        letters = ['B', 'I', 'N', 'G', 'O']
        header_height = 0.8 * self.cell_size
        
        for i, letter in enumerate(letters):
            x = i * self.cell_size
            y = self.height - header_height
            
            # Circular background
            center_x = x + self.cell_size/2
            center_y = y + header_height/2
            radius = min(self.cell_size, header_height) * 0.4
            
            self.canv.setFillColor(HEADER_COLORS[letter])
            self.canv.circle(center_x, center_y, radius, fill=1, stroke=0)
            
            # Letter text
            self.canv.setFillColor(colors.white)
            self.canv.setFont('Helvetica-Bold', 20)
            text_width = self.canv.stringWidth(letter, 'Helvetica-Bold', 20)
            self.canv.drawString(center_x - text_width/2, center_y - 7, letter)
        
        # Draw number grid
        columns = [
            self.card_data['b_column'],
            self.card_data['i_column'], 
            self.card_data['n_column'],
            self.card_data['g_column'],
            self.card_data['o_column']
        ]
        
        grid_start_y = self.height - header_height - 0.1*inch
        
        for row in range(5):
            for col in range(5):
                x = col * self.cell_size
                y = grid_start_y - (row + 1) * self.cell_size
                
                # Cell background
                if col == 2 and row == 2:  # FREE space
                    self.canv.setFillColor(colors.Color(0.9, 0.9, 0.9))
                else:
                    self.canv.setFillColor(colors.white)
                
                # Cell border
                self.canv.setStrokeColor(colors.Color(0.3, 0.3, 0.3))
                self.canv.setLineWidth(2)
                self.canv.rect(x, y, self.cell_size, self.cell_size, fill=1, stroke=1)
                
                # Cell content
                if col == 2 and row == 2:  # FREE space
                    self.canv.setFillColor(colors.Color(0.5, 0.5, 0.5))
                    self.canv.setFont('Helvetica-Bold', 12)
                    text = "FREE"
                else:
                    # Get number from appropriate column
                    if col == 2:  # N column (skip center)
                        idx = row if row < 2 else row - 1
                        number = columns[col][idx]
                    else:
                        number = columns[col][row]
                    
                    self.canv.setFillColor(colors.black)
                    self.canv.setFont('Helvetica-Bold', 16)
                    text = str(number)
                
                # Center text in cell
                text_width = self.canv.stringWidth(text, self.canv._fontname, self.canv._fontsize)
                text_x = x + (self.cell_size - text_width) / 2
                text_y = y + (self.cell_size - self.canv._fontsize) / 2
                self.canv.drawString(text_x, text_y, text)

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

def create_redesigned_bingo_card(card_data, filename):
    """Create a redesigned bingo card PDF with professional layout"""
    doc = SimpleDocTemplate(
        filename, 
        pagesize=A4, 
        topMargin=0.5*inch,
        bottomMargin=0.5*inch,
        leftMargin=0.75*inch,
        rightMargin=0.75*inch
    )
    elements = []
    
    # Logo header
    logo_header = LogoHeader(card_data['card_number'])
    elements.append(logo_header)
    elements.append(Spacer(1, 20))
    
    # Bingo grid
    bingo_grid = BingoGrid(card_data)
    elements.append(bingo_grid)
    elements.append(Spacer(1, 30))
    
    # Instructions section
    styles = getSampleStyleSheet()
    instruction_style = ParagraphStyle(
        'Instructions',
        parent=styles['Normal'],
        fontSize=10,
        leading=12,
        alignment=0,
        textColor=colors.Color(0.3, 0.3, 0.3),
        fontName='Helvetica'
    )
    
    instructions = [
        "HOW TO PLAY:",
        "• Mark numbers as they are called",
        "• Complete any line (horizontal, vertical, or diagonal) to win",
        "• Shout 'BINGO!' when you have a winning pattern",
        "• Present this card to claim your prize"
    ]
    
    for instruction in instructions:
        elements.append(Paragraph(instruction, instruction_style))
    
    elements.append(Spacer(1, 20))
    
    # Footer with branding
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        alignment=1,
        textColor=colors.Color(0.5, 0.5, 0.5),
        fontName='Helvetica-Oblique'
    )
    
    footer_text = "ENJOY TV BINGO GAME • Official Game Card • www.enjoytv.com"
    elements.append(Paragraph(footer_text, footer_style))
    
    # Build PDF
    doc.build(elements)
    print(f"Generated redesigned card: {filename}")

def generate_redesigned_cards():
    """Generate all redesigned bingo cards"""
    print("Fetching bingo cards from database...")
    cards = fetch_bingo_cards()
    
    if not cards:
        print("No cards found in database!")
        return
    
    # Create output directory
    os.makedirs("printable_cards", exist_ok=True)
    
    print(f"Generating {len(cards)} redesigned bingo cards...")
    
    for card in cards:
        filename = f"printable_cards/bingo_card_{card['card_number']:03d}.pdf"
        create_redesigned_bingo_card(card, filename)
    
    print(f"\nGenerated {len(cards)} redesigned bingo cards!")
    print("Files saved in: printable_cards/")
    print("Cards feature:")
    print("+ ENJOY TV logo and branding")
    print("+ Professional color scheme")
    print("+ Enhanced layout and typography")
    print("+ Clear instructions")
    print("+ Official game card styling")

if __name__ == "__main__":
    generate_redesigned_cards()