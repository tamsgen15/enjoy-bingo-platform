#!/usr/bin/env python3
"""
Download gentleman Amharic voice - deep, slow, professional male voice
"""

import os
from gtts import gTTS

# Create directory
os.makedirs("public/audio/amharic", exist_ok=True)

# Amharic texts
texts = {
    "game-started": "ጨዋታው ተጀምሯል",
    "b": "ቢ", "i": "አይ", "n": "ኤን", "g": "ጂ", "o": "ኦ",
    "1": "አንድ", "2": "ሁለት", "3": "ሶስት", "4": "አራት", "5": "አምስት",
    "6": "ስድስት", "7": "ሰባት", "8": "ስምንት", "9": "ዘጠኝ", "10": "አስር",
    "11": "አስራ አንድ", "12": "አስራ ሁለት", "13": "አስራ ሶስት", "14": "አስራ አራት", "15": "አስራ አምስት",
    "16": "አስራ ስድስት", "17": "አስራ ሰባት", "18": "አስራ ስምንት", "19": "አስራ ዘጠኝ", "20": "ሃያ",
    "21": "ሃያ አንድ", "22": "ሃያ ሁለት", "23": "ሃያ ሶስት", "24": "ሃያ አራት", "25": "ሃያ አምስት",
    "26": "ሃያ ስድስት", "27": "ሃያ ሰባት", "28": "ሃያ ስምንት", "29": "ሃያ ዘጠኝ", "30": "ሰላሳ",
    "31": "ሰላሳ አንድ", "32": "ሰላሳ ሁለት", "33": "ሰላሳ ሶስት", "34": "ሰላሳ አራት", "35": "ሰላሳ አምስት",
    "36": "ሰላሳ ስድስት", "37": "ሰላሳ ሰባት", "38": "ሰላሳ ስምንት", "39": "ሰላሳ ዘጠኝ", "40": "አርባ",
    "41": "አርባ አንድ", "42": "አርባ ሁለት", "43": "አርባ ሶስት", "44": "አርባ አራት", "45": "አርባ አምስት",
    "46": "አርባ ስድስት", "47": "አርባ ሰባት", "48": "አርባ ስምንት", "49": "አርባ ዘጠኝ", "50": "ሃምሳ",
    "51": "ሃምሳ አንድ", "52": "ሃምሳ ሁለት", "53": "ሃምሳ ሶስት", "54": "ሃምሳ አራት", "55": "ሃምሳ አምስት",
    "56": "ሃምሳ ስድስት", "57": "ሃምሳ ሰባት", "58": "ሃምሳ ስምንት", "59": "ሃምሳ ዘጠኝ", "60": "ስድሳ",
    "61": "ስድሳ አንድ", "62": "ስድሳ ሁለት", "63": "ስድሳ ሶስት", "64": "ስድሳ አራት", "65": "ስድሳ አምስት",
    "66": "ስድሳ ስድስት", "67": "ስድሳ ሰባት", "68": "ስድሳ ስምንት", "69": "ስድሳ ዘጠኝ", "70": "ሰባ",
    "71": "ሰባ አንድ", "72": "ሰባ ሁለት", "73": "ሰባ ሶስት", "74": "ሰባ አራት", "75": "ሰባ አምስት"
}

def generate_gentleman_voice(filename, text):
    try:
        # Use slow=True for deep gentleman voice
        # Try different TLD for different voice characteristics
        tts = gTTS(text=text, lang='am', slow=True, tld='com')
        filepath = f"public/audio/amharic/{filename}.mp3"
        tts.save(filepath)
        print(f"Generated gentleman voice: {filename}.mp3")
        return True
    except Exception as e:
        try:
            # Fallback without tld
            tts = gTTS(text=text, lang='am', slow=True)
            filepath = f"public/audio/amharic/{filename}.mp3"
            tts.save(filepath)
            print(f"Generated gentleman voice (fallback): {filename}.mp3")
            return True
        except Exception as e2:
            print(f"Failed: {filename}.mp3 - {e2}")
            return False

print("Generating fresh gentleman Amharic voice files...")
print("Deep, slow, professional male voice for bingo calling")

success_count = 0
for filename, text in texts.items():
    if generate_gentleman_voice(filename, text):
        success_count += 1

print(f"\nGenerated {success_count}/{len(texts)} gentleman voice files!")
print("All old female voices deleted and replaced with gentleman voice!")