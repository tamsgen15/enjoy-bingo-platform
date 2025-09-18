#!/usr/bin/env python3
"""
Download professional human-like Amharic voice using Azure Cognitive Services
More natural than gTTS with better phonetics
"""

import os
import requests
import json

# Create directory
os.makedirs("public/audio/amharic", exist_ok=True)

# Azure Speech Service (Free tier: 5 hours/month)
AZURE_KEY = input("Enter your Azure Speech Service API key: ").strip()
AZURE_REGION = "eastus"

# Amharic texts with SSML for better pronunciation
texts = {
    "game-started": '<speak version="1.0" xml:lang="am-ET"><voice name="am-ET-MekdesNeural">ጨዋታው ተጀምሯል</voice></speak>',
    "b": '<speak version="1.0" xml:lang="am-ET"><voice name="am-ET-AmehaNeural">ቢ</voice></speak>',
    "i": '<speak version="1.0" xml:lang="am-ET"><voice name="am-ET-AmehaNeural">አይ</voice></speak>',
    "n": '<speak version="1.0" xml:lang="am-ET"><voice name="am-ET-AmehaNeural">ኤን</voice></speak>',
    "g": '<speak version="1.0" xml:lang="am-ET"><voice name="am-ET-AmehaNeural">ጂ</voice></speak>',
    "o": '<speak version="1.0" xml:lang="am-ET"><voice name="am-ET-AmehaNeural">ኦ</voice></speak>',
}

# Add numbers with professional male voice
for i in range(1, 76):
    amharic_numbers = {
        1: "አንድ", 2: "ሁለት", 3: "ሶስት", 4: "አራት", 5: "አምስት",
        6: "ስድስት", 7: "ሰባት", 8: "ስምንት", 9: "ዘጠኝ", 10: "አስር",
        11: "አስራ አንድ", 12: "አስራ ሁለት", 13: "አስራ ሶስት", 14: "አስራ አራት", 15: "አስራ አምስት",
        16: "አስራ ስድስት", 17: "አስራ ሰባት", 18: "አስራ ስምንት", 19: "አስራ ዘጠኝ", 20: "ሃያ",
        21: "ሃያ አንድ", 22: "ሃያ ሁለት", 23: "ሃያ ሶስት", 24: "ሃያ አራት", 25: "ሃያ አምስት",
        26: "ሃያ ስድስት", 27: "ሃያ ሰባት", 28: "ሃያ ስምንት", 29: "ሃያ ዘጠኝ", 30: "ሰላሳ",
        31: "ሰላሳ አንድ", 32: "ሰላሳ ሁለት", 33: "ሰላሳ ሶስት", 34: "ሰላሳ አራት", 35: "ሰላሳ አምስት",
        36: "ሰላሳ ስድስት", 37: "ሰላሳ ሰባት", 38: "ሰላሳ ስምንት", 39: "ሰላሳ ዘጠኝ", 40: "አርባ",
        41: "አርባ አንድ", 42: "አርባ ሁለት", 43: "አርባ ሶስት", 44: "አርባ አራት", 45: "አርባ አምስት",
        46: "አርባ ስድስት", 47: "አርባ ሰባት", 48: "አርባ ስምንት", 49: "አርባ ዘጠኝ", 50: "ሃምሳ",
        51: "ሃምሳ አንድ", 52: "ሃምሳ ሁለት", 53: "ሃምሳ ሶስት", 54: "ሃምሳ አራት", 55: "ሃምሳ አምስት",
        56: "ሃምሳ ስድስት", 57: "ሃምሳ ሰባት", 58: "ሃምሳ ስምንት", 59: "ሃምሳ ዘጠኝ", 60: "ስድሳ",
        61: "ስድሳ አንድ", 62: "ስድሳ ሁለት", 63: "ስድሳ ሶስት", 64: "ስድሳ አራት", 65: "ስድሳ አምስት",
        66: "ስድሳ ስድስት", 67: "ስድሳ ሰባት", 68: "ስድሳ ስምንት", 69: "ስድሳ ዘጠኝ", 70: "ሰባ",
        71: "ሰባ አንድ", 72: "ሰባ ሁለት", 73: "ሰባ ሶስት", 74: "ሰባ አራት", 75: "ሰባ አምስት"
    }
    
    if i in amharic_numbers:
        texts[str(i)] = f'<speak version="1.0" xml:lang="am-ET"><voice name="am-ET-AmehaNeural"><prosody rate="0.8" pitch="-5%">{amharic_numbers[i]}</prosody></voice></speak>'

def download_azure_audio(filename, ssml_text):
    if AZURE_KEY == "YOUR_AZURE_KEY":
        print("Please set your Azure Speech Service API key")
        return False
        
    url = f"https://{AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1"
    headers = {
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
    }
    
    try:
        response = requests.post(url, headers=headers, data=ssml_text.encode('utf-8'))
        if response.status_code == 200:
            filepath = f"public/audio/amharic/{filename}.mp3"
            with open(filepath, 'wb') as f:
                f.write(response.content)
            print(f"Downloaded professional: {filename}.mp3")
            return True
        else:
            print(f"Failed: {filename}.mp3 - Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"Error: {filename}.mp3 - {e}")
        return False

print("Downloading professional Amharic voice files...")
print("Get Azure Speech Service key from: https://portal.azure.com")
print("Free tier: 5 hours/month of neural voice synthesis")

success_count = 0
for filename, ssml in texts.items():
    if download_azure_audio(filename, ssml):
        success_count += 1

print(f"\nDownloaded {success_count}/{len(texts)} professional audio files!")