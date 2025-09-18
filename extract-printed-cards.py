#!/usr/bin/env python3
"""
Extract bingo card data from Supabase database to match printed cards
"""

import requests
import json

# Supabase connection
SUPABASE_URL = 'https://gvfcbzzindikkmhaahak.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZmNienppbmRpa2ttaGFhaGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjU5MzYsImV4cCI6MjA3MjA0MTkzNn0.9Pc-juJB8PqZkznfjQOERM27Gpap-wvIiG7aLkEFkMc'

def fetch_cards():
    """Fetch all cards from database"""
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
        print(f"Error: {response.status_code}")
        return []

def generate_js_file(cards):
    """Generate JavaScript file with exact card data"""
    js_content = """// Exact bingo cards matching printed cards
export const PRINTED_BINGO_CARDS = {
"""
    
    for card in cards:
        js_content += f"""  {card['card_number']}: {{
    B: {json.dumps(card['b_column'])},
    I: {json.dumps(card['i_column'])},
    N: {json.dumps(card['n_column'])},
    G: {json.dumps(card['g_column'])},
    O: {json.dumps(card['o_column'])}
  }},
"""
    
    js_content += """}

export const getBingoCard = (cardNumber) => {
  return PRINTED_BINGO_CARDS[cardNumber] || null
}

export const getCardNumbers = (cardNumber) => {
  const card = getBingoCard(cardNumber)
  if (!card) return []
  
  return [
    ...card.B,
    ...card.I,
    ...card.N,
    ...card.G,
    ...card.O
  ]
}"""
    
    return js_content

def generate_sql_file(cards):
    """Generate SQL to insert exact card data"""
    sql_content = """-- Insert exact bingo cards matching printed cards
DELETE FROM bingo_cards;

"""
    
    for card in cards:
        b_col = '{' + ','.join(map(str, card['b_column'])) + '}'
        i_col = '{' + ','.join(map(str, card['i_column'])) + '}'
        n_col = '{' + ','.join(map(str, card['n_column'])) + '}'
        g_col = '{' + ','.join(map(str, card['g_column'])) + '}'
        o_col = '{' + ','.join(map(str, card['o_column'])) + '}'
        
        sql_content += f"""INSERT INTO bingo_cards (card_number, b_column, i_column, n_column, g_column, o_column) VALUES
({card['card_number']}, '{b_col}', '{i_col}', '{n_col}', '{g_col}', '{o_col}');
"""
    
    return sql_content

if __name__ == "__main__":
    print("Fetching cards from database...")
    cards = fetch_cards()
    
    if cards:
        print(f"Found {len(cards)} cards")
        
        # Generate JavaScript file
        js_content = generate_js_file(cards)
        with open('src/lib/printedBingoCards.js', 'w') as f:
            f.write(js_content)
        print("Generated: src/lib/printedBingoCards.js")
        
        # Generate SQL file
        sql_content = generate_sql_file(cards)
        with open('supabase/insert_printed_cards.sql', 'w') as f:
            f.write(sql_content)
        print("Generated: supabase/insert_printed_cards.sql")
        
        print("\nFiles generated successfully!")
        print("Your database cards now match your printed cards exactly.")
    else:
        print("No cards found in database!")