#!/usr/bin/env python3
"""
Enhance current gTTS audio files with professional effects
"""

from pydub import AudioSegment
import os

def enhance_audio_file(input_path, output_path):
    try:
        # Load audio
        audio = AudioSegment.from_mp3(input_path)
        
        # Professional enhancements
        audio = audio.normalize()  # Normalize volume
        audio = audio + 2  # Slight volume boost
        audio = audio.low_pass_filter(3000)  # Remove harsh frequencies
        
        # Add slight reverb effect (simulate professional studio)
        audio = audio.overlay(audio.apply_gain(-20), position=50)
        
        # Export enhanced version
        audio.export(output_path, format="mp3", bitrate="128k")
        return True
    except Exception as e:
        print(f"Error enhancing {input_path}: {e}")
        return False

# Enhance all existing files
audio_dir = "public/audio/amharic"
if os.path.exists(audio_dir):
    files = [f for f in os.listdir(audio_dir) if f.endswith('.mp3')]
    
    for file in files:
        input_path = os.path.join(audio_dir, file)
        output_path = os.path.join(audio_dir, f"enhanced_{file}")
        
        if enhance_audio_file(input_path, output_path):
            # Replace original with enhanced version
            os.replace(output_path, input_path)
            print(f"Enhanced: {file}")
    
    print(f"Enhanced {len(files)} audio files!")
else:
    print("Audio directory not found")