#!/usr/bin/env python3
"""
Download ultra-realistic human voice using ElevenLabs AI
Most human-like voice available
"""

import os
import requests

# ElevenLabs API (Free: 10,000 characters/month)
ELEVENLABS_API_KEY = "YOUR_ELEVENLABS_KEY"  # Get from https://elevenlabs.io
VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Rachel (English) - can be cloned for Amharic

# Create directory
os.makedirs("public/audio/amharic", exist_ok=True)

# Texts for ultra-realistic voice
texts = {
    "game-started": "Game Started",  # Will sound very human
    "b": "B", "i": "I", "n": "N", "g": "G", "o": "O",
}

# Add numbers
for i in range(1, 76):
    texts[str(i)] = str(i)

def download_elevenlabs_audio(filename, text):
    if ELEVENLABS_API_KEY == "YOUR_ELEVENLABS_KEY":
        print("Please set your ElevenLabs API key from https://elevenlabs.io")
        return False
        
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }
    
    data = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.8,
            "style": 0.2,
            "use_speaker_boost": True
        }
    }
    
    try:
        response = requests.post(url, json=data, headers=headers)
        if response.status_code == 200:
            filepath = f"public/audio/amharic/{filename}.mp3"
            with open(filepath, 'wb') as f:
                f.write(response.content)
            print(f"Downloaded ultra-realistic: {filename}.mp3")
            return True
        else:
            print(f"Failed: {filename}.mp3 - Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"Error: {filename}.mp3 - {e}")
        return False

print("Downloading ultra-realistic human voice...")
print("Get ElevenLabs API key from: https://elevenlabs.io")
print("Free tier: 10,000 characters/month")

success_count = 0
for filename, text in texts.items():
    if download_elevenlabs_audio(filename, text):
        success_count += 1

print(f"\nDownloaded {success_count}/{len(texts)} ultra-realistic audio files!")