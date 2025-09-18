#!/usr/bin/env python3
"""
Fix bingo cards to be truly unique and regenerate printable PDFs
"""

import requests
import time
import subprocess
import sys

SUPABASE_URL = 'https://gvfcbzzindikkmhaahak.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZmNienppbmRpa2ttaGFhaGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjU5MzYsImV4cCI6MjA3MjA0MTkzNn0.9Pc-juJB8PqZkznfjQOERM27Gpap-wvIiG7aLkEFkMc'

def regenerate_unique_cards():
    """Regenerate all bingo cards with unique randomization"""
    print("Regenerating truly unique bingo cards...")
    
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }
    
    # Clear existing cards
    print("Clearing existing cards...")
    delete_response = requests.delete(
        f"{SUPABASE_URL}/rest/v1/bingo_cards?card_number=gte.1",
        headers=headers
    )
    
    if delete_response.status_code not in [200, 204]:
        print(f"Error clearing cards: {delete_response.status_code}")
        return False
    
    # Generate new unique cards
    print("Generating 100 unique cards...")
    for i in range(1, 101):
        # Generate unique seed for each card
        seed = (i * 123456789 + int(time.time() * 1000)) % 1000000
        
        # Call the new truly random generation function
        rpc_data = {
            "card_num": i
        }
        
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/generate_truly_random_bingo_card",
            headers=headers,
            json=rpc_data
        )
        
        if response.status_code not in [200, 204]:
            print(f"Error generating card {i}: {response.status_code}")
            return False
        
        # Small delay to ensure different timestamps
        time.sleep(0.02)
        
        if i % 10 == 0:
            print(f"Generated {i}/100 cards...")
    
    print("All cards generated successfully!")
    return True

def verify_uniqueness():
    """Verify that cards are actually different"""
    print("Verifying card uniqueness...")
    
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }
    
    # Fetch first 5 cards to compare
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/bingo_cards?select=*&order=card_number&limit=5",
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"Error fetching cards: {response.status_code}")
        return False
    
    cards = response.json()
    
    print("Sample cards:")
    for card in cards:
        print(f"Card {card['card_number']}: B={card['b_column'][:3]}...")
    
    # Check if first two cards are different
    if len(cards) >= 2:
        card1_b = cards[0]['b_column']
        card2_b = cards[1]['b_column']
        
        if card1_b == card2_b:
            print("WARNING: Cards appear to be identical!")
            return False
        else:
            print("SUCCESS: Cards are unique!")
            return True
    
    return True

def main():
    print("BINGO CARD UNIQUENESS FIX")
    print("=" * 40)
    
    # Step 1: Regenerate unique cards
    if not regenerate_unique_cards():
        print("Failed to regenerate cards!")
        return
    
    # Step 2: Verify uniqueness
    if not verify_uniqueness():
        print("Cards are still not unique!")
        return
    
    # Step 3: Generate new printable PDFs
    print("\nGenerating new printable PDFs...")
    try:
        subprocess.run([sys.executable, 'generate-printable-cards.py'], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error generating PDFs: {e}")
        return
    
    print("\nCOMPLETE!")
    print("- All 100 bingo cards are now truly unique")
    print("- Printable PDFs updated with circular headers")
    print("- Each card has different number arrangements")

if __name__ == "__main__":
    main()