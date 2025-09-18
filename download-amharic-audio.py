#!/usr/bin/env python3
"""
Download Amharic audio files using gTTS (Google Text-to-Speech)
Run: pip install gtts requests
"""

import os
from gtts import gTTS
import requests

# Create directory
os.makedirs("public/audio/amharic", exist_ok=True)

# Amharic texts
texts = {
    "game-started": "ጨዋታው ተጀምሯል",
    "b": "ቢ",
    "i": "አይ", 
    "n": "ኤን",
    "g": "ጂ",
    "o": "ኦ",
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

def download_audio(filename, text):
    try:
        # Try Amharic first, fallback to English
        tts = gTTS(text=text, lang='am', slow=False)
        filepath = f"public/audio/amharic/{filename}.mp3"
        tts.save(filepath)
        print(f"Downloaded: {filename}.mp3")
        return True
    except:
        try:
            # Fallback to English
            tts = gTTS(text=text, lang='en', slow=False)
            filepath = f"public/audio/amharic/{filename}.mp3"
            tts.save(filepath)
            print(f"Downloaded (English): {filename}.mp3")
            return True
        except Exception as e:
            print(f"Failed: {filename}.mp3 - {e}")
            return False

# Download all files
print("Downloading Amharic audio files...")
success_count = 0

for filename, text in texts.items():
    if download_audio(filename, text):
        success_count += 1

print(f"\nDownloaded {success_count}/{len(texts)} audio files!")
print("Files saved to: public/audio/amharic/")