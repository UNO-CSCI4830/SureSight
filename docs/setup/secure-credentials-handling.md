# Secure Credential Handling for SureSight

This document outlines the proper approach for handling Google Cloud Vision API credentials in the SureSight application.

## Security Principles

1. **Never store credentials in source code repositories**
2. **Use environment variables for local development**
3. **Use secret management services for production environments**
4. **Limit credential access using the principle of least privilege**
5. **Rotate credentials periodically**

## Local Development Setup

For local development, follow these steps:

1. Create a `google-vision-credentials.json` file in the project root (this file is already in `.gitignore`)
2. Place your actual Google Cloud credentials in this file
3. Use the `setup-credentials.js` script to validate the credentials:

```bash
node scripts/setup-credentials.js
```

## Production Deployment

For production environments:

### 1. Supabase Edge Functions

When deploying to Supabase Edge Functions:

1. Base64 encode your credentials:
   ```bash
   # On Windows PowerShell
   [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content -Raw google-vision-credentials.json)))
   
   # On Linux/macOS
   base64 google-vision-credentials.json
   ```

2. Add the encoded value as a secret in the Supabase Dashboard:
   - Go to Project Settings > API > Edge Functions
   - Add a secret named `GOOGLE_VISION_CREDENTIALS_BASE64`
   - Paste the base64-encoded value

3. The Edge Function will automatically decode the credentials for use with the Google Vision API

### 2. Vercel Deployment

For Next.js deployment on Vercel:

1. Add your Google Cloud credentials as environment variables in the Vercel project dashboard:
   - Go to Project Settings > Environment Variables
   - Add environment variables for each required credential field:
     - `GOOGLE_VISION_PROJECT_ID`
     - `GOOGLE_VISION_CLIENT_EMAIL`
     - `GOOGLE_VISION_PRIVATE_KEY`

2. Update the application code to construct the credentials object from these environment variables.

## Credential Rotation

It's a security best practice to rotate service account credentials periodically:

1. Create new credentials in the Google Cloud Console
2. Update the credentials in all deployment environments
3. Once confirmed working, revoke the old credentials

## Emergency Credential Revocation

If credentials are accidentally exposed:

1. Immediately revoke the compromised credentials in Google Cloud Console
2. Create new credentials with limited permissions
3. Update all deployment environments with the new credentials
4. Review access logs for any unauthorized usage