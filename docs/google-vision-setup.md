# Setting Up Google Cloud Vision API with Vercel

This document explains how to configure the Google Cloud Vision API with SureSight's Vercel deployment for damage assessment functionality.

## 1. Google Cloud Vision API Credentials

The application uses Google Cloud Vision API for image analysis and damage detection. The credentials are stored securely in environment variables rather than being hardcoded in the application code.

## 2. Setting up in Vercel

1. Log in to your Vercel dashboard.
2. Go to your SureSight project.
3. Click on "Settings" in the top navigation bar.
4. Select "Environment Variables" from the left sidebar.
5. Add a new environment variable:
   - **Name**: `GOOGLE_VISION_CREDENTIALS`
   - **Value**: Paste the entire JSON credential object from your Google Cloud Console
   
   **Important:** Never share or commit your actual credentials. The JSON object structure will contain your private key and other sensitive information that should be kept secure.

6. Click "Save" to store the environment variable.

## 3. Setting up in Supabase Edge Functions

For the Supabase Edge Function to access the Google Vision API:

1. Go to your Supabase dashboard.
2. Navigate to "Edge Functions".
3. Select the "analyze-image-damage" function.
4. Add the environment variable with the same name and value:
   - **Name**: `GOOGLE_VISION_CREDENTIALS`
   - **Value**: The same JSON credential object used in Vercel

## 4. Local Development

For local development, create a `.env.local` file in your project root with:

```
GOOGLE_VISION_CREDENTIALS='{"type":"service_account",...}'
```

Make sure to include the entire JSON credential object as a single-line string enclosed in quotes.

## 5. Security Notes

- Never commit your API credentials to version control
- Restrict your API key permissions in Google Cloud Console
- Consider setting up IP restrictions for your API key
- Regularly rotate your API credentials

## 6. Testing Without API Charges

The application includes mock tests that verify functionality without making actual API calls:

- Run `npm test -- __tests__/utils/visionService.test.ts` to execute tests using mocked responses
- These tests verify the damage detection logic without incurring API charges

For production-ready testing of the actual API integration, consider:
1. Using Google Cloud Vision API's free tier (1000 calls/month)
2. Setting up budget alerts in Google Cloud Console
3. Using test-specific credentials with lower quota limits