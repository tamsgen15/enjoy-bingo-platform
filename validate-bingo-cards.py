#!/usr/bin/env python3
"""
Validate bingo cards for duplicate numbers
Checks database to ensure all cards have unique numbers in each column
"""

import os
import requests
import json

# Supabase connection
SUPABASE_URL = 'https://gvfcbzzindikkmhaahak.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZmNienppbmRpa2ttaGFhaGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjU5MzYsImV4cCI6MjA3MjA0MTkzNn0.9Pc-juJB8PqZkznfjQOERM27Gpap-wvIiG7aLkEFkMc'

def fetch_all_cards():
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
        print(f"❌ Error fetching cards: {response.status_code}")
        return []

def validate_card(card):
    """Validate a single bingo card for duplicates"""
    issues = []
    
    columns = {
        'B': card['b_column'],
        'I': card['i_column'], 
        'N': card['n_column'],
        'G': card['g_column'],
        'O': card['o_column']
    }
    
    ranges = {
        'B': (1, 15),
        'I': (16, 30),
        'N': (31, 45),
        'G': (46, 60),
        'O': (61, 75)
    }
    
    for col_name, numbers in columns.items():
        # Check for duplicates
        if len(numbers) != len(set(numbers)):
            duplicates = [x for x in numbers if numbers.count(x) > 1]
            issues.append(f"Column {col_name}: Duplicate numbers {set(duplicates)}")
        
        # Check number ranges
        min_val, max_val = ranges[col_name]
        for num in numbers:
            if num < min_val or num > max_val:
                issues.append(f"Column {col_name}: Number {num} out of range ({min_val}-{max_val})")
        
        # Check expected count
        expected_count = 4 if col_name == 'N' else 5
        if len(numbers) != expected_count:
            issues.append(f"Column {col_name}: Expected {expected_count} numbers, got {len(numbers)}")
    
    return issues

def main():
    print("BINGO CARD VALIDATION")
    print("=" * 40)
    
    cards = fetch_all_cards()
    
    if not cards:
        print("ERROR: No cards found or error fetching cards")
        return
    
    print(f"Validating {len(cards)} bingo cards...")
    
    total_issues = 0
    cards_with_issues = 0
    
    for card in cards:
        issues = validate_card(card)
        if issues:
            cards_with_issues += 1
            total_issues += len(issues)
            print(f"\nCard #{card['card_number']} - ISSUES FOUND:")
            for issue in issues:
                print(f"   • {issue}")
    
    print(f"\nVALIDATION RESULTS:")
    print(f"   Total Cards: {len(cards)}")
    print(f"   Cards with Issues: {cards_with_issues}")
    print(f"   Total Issues: {total_issues}")
    
    if total_issues == 0:
        print("SUCCESS: All bingo cards are valid! No duplicates found.")
    else:
        print("ERROR: Issues found. Please run the fix script.")
        print("SOLUTION: Use: python regenerate-and-print.py")

if __name__ == "__main__":
    main()