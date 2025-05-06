# SureSight Image Analysis Documentation

This document describes how SureSight uses Google Cloud Vision API to analyze roof and siding damage in property images.

## Overview

SureSight leverages Google Cloud Vision API to provide AI-powered damage assessment for roofing and siding. The system:

1. Accepts uploaded images from users
2. Analyzes these images for signs of damage using Google Vision API
3. Classifies the damage type (roof, siding, etc.) and severity
4. Generates confidence scores for the assessment
5. Stores the analysis results for reporting

## Architecture

```
┌──────────┐     ┌─────────────────┐     ┌──────────────────────┐
│  Upload  │     │  Supabase Edge  │     │  Google Cloud Vision │
│  Image   ├────►│  Function       ├────►│  API                 │
└──────────┘     └─────────────────┘     └──────────────────────┘
                         │                           │
                         ▼                           │
                 ┌─────────────────┐                 │
                 │  Storage &      │                 │
                 │  Database       │◄────────────────┘
                 └─────────────────┘
                         │
                         ▼
                 ┌─────────────────┐
                 │  Report         │
                 │  Generation     │
                 └─────────────────┘
```

## Implementation Details

### 1. Image Upload

Images are uploaded to Supabase Storage using the `uploadAndAnalyzeImage` function in `utils/supabaseClient.ts`. This function:

- Uploads the image to a Supabase storage bucket
- Gets the public URL for the uploaded image
- Calls the Edge Function to analyze the image
- Returns the analysis results

### 2. Image Analysis (Edge Function)

The image analysis is performed by a Supabase Edge Function (`analyze-image-damage/index.ts`) which:

- Receives the image URL and ID
- Uses Google Cloud Vision API to analyze the image
- Processes multiple features:
  - Label Detection
  - Object Localization
  - Text Detection
  - Image Properties
- Identifies damage types based on predefined keywords
- Calculates confidence scores and determines severity
- Stores the results in the database

### 3. Damage Classification

The system classifies damage into several categories:

| Damage Type | Description                           | Examples                                      |
|-------------|---------------------------------------|-----------------------------------------------|
| Roof        | Any damage to roof materials          | Missing shingles, holes, leaks                |
| Siding      | Damage to exterior wall coverings     | Cracks, dents, missing pieces                 |
| Window      | Damage to windows                     | Broken glass, frame damage                    |
| Structural  | Foundational or structural issues     | Wall damage, foundation cracks                |
| Water       | Water damage or intrusion             | Water stains, moisture damage                 |
| Other       | Any damage not fitting other categories | Various types                               |

Severity levels are determined by confidence scores:
- Minor (0.0-0.5)
- Moderate (0.5-0.7)
- Severe (0.7-0.85)
- Critical (0.85-1.0)

### 4. API Route

The system includes an API route (`/api/analyze-image`) that allows direct image analysis requests. This route:

- Validates user authentication
- Calls the Edge Function with the image information
- Stores the analysis results
- Updates the image record with AI analysis results
- Returns the analysis data to the client

### 5. Database Storage

Analysis results are stored in two tables:
- `image_analysis`: Complete analysis data including raw results
- `images`: Summary of analysis results for quick access

## Usage

### Client-Side Usage

```typescript
import { uploadAndAnalyzeImage } from '../utils/supabaseClient';

// Function to handle image upload and analysis
async function handleImageUpload(file) {
  try {
    const result = await uploadAndAnalyzeImage(file);
    
    if (result.success) {
      const { damageDetected, damageType, severity, confidence } = result.data.damageAnalysis;
      
      // Handle the analysis results
      console.log(`Damage detected: ${damageDetected}`);
      console.log(`Damage type: ${damageType}`);
      console.log(`Severity: ${severity}`);
      console.log(`Confidence: ${confidence}`);
    } else {
      console.error(`Error: ${result.error}`);
    }
  } catch (error) {
    console.error('Failed to analyze image:', error);
  }
}
```

### API Route Usage

```typescript
// Example API request
const response = await fetch('/api/analyze-image', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    imageId: 'image-123',
    imageUrl: 'https://example.com/image.jpg'
  }),
});

const data = await response.json();
```

## Performance and Limitations

- The Google Vision API can process a wide variety of image formats
- Analysis typically takes 1-3 seconds per image
- Accuracy depends on image quality and visibility of damage
- For best results:
  - Use high-resolution images
  - Ensure good lighting
  - Capture images from multiple angles
  - Include both close-up and wide shots of damaged areas

## Future Enhancements

Planned improvements to the image analysis system:

1. Custom-trained ML models for specific damage types
2. Improved damage area segmentation
3. Automatic cost estimation based on damage type and severity
4. Historical comparison to detect progressive damage
5. Integration with weather data to correlate damage with weather events