# Image Damage Analysis Edge Function

This Edge Function uses Google Cloud Vision API to analyze property damage images.

## Features

- Damage detection using image labels
- Object detection for property features
- Text recognition from images
- Safe search detection

## Required Environment Variables

- `GOOGLE_VISION_CREDENTIALS`: JSON string containing Google Vision API credentials
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

## Usage

This function is called by the frontend application when:
1. New images are uploaded to reports
2. Users manually trigger AI analysis on images
3. Batch analysis is performed on unprocessed images

## API

**Input:**
```json
{
  "imageUrl": "https://path-to-image.jpg",
  "imageId": "uuid-of-image-in-database"
}
```

**Output:**
```json
{
  "damage_detected": true|false,
  "confidence": 0.95,
  "analysis": [...], 
  "damage_labels": ["Crack", "Damage"],
  "objects": ["Roof", "House"],
  "text_detected": "Any text found in the image"
}
```