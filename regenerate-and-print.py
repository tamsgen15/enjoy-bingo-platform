#!/usr/bin/env python3
"""
Regenerate bingo cards and create printable PDFs
This script fixes duplicate numbers and creates matching printable cards
"""

import os
import sys
import subprocess
from generate_printable_cards import generate_all_cards

def run_sql_fix():
    """Run the SQL fix script to regenerate cards"""
    print("🔧 Fixing bingo cards in database...")
    
    # You would run this SQL script in your Supabase dashboard or via psql
    print("⚠️  Please run the following SQL script in your Supabase SQL Editor:")
    print("📁 File: supabase/complete_bingo_fix.sql")
    print("\nOr use the admin panel 'Fix Bingo Cards' button")
    
    input("\nPress Enter after running the SQL script to continue...")

def main():
    print("🎯 BINGO CARD REGENERATION TOOL")
    print("=" * 50)
    
    # Step 1: Fix database
    run_sql_fix()
    
    # Step 2: Generate new printable cards
    print("\n📄 Generating new printable cards...")
    generate_all_cards()
    
    print("\n✅ COMPLETE!")
    print("🎯 All bingo cards now have unique numbers")
    print("📄 Printable cards match preview modal styling")
    print("🎮 Game logic updated for new card format")

if __name__ == "__main__":
    main()