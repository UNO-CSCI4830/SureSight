# Setting up Google Cloud Vision API for SureSight

This guide will walk you through setting up the Google Cloud Vision API for use with SureSight.

## 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on "Select a project" at the top of the page and then click on "New Project"
3. Name your project (e.g., "SureSight-Damage-Detection") and click "Create"

## 2. Enable the Vision API

1. Go to the [API Library](https://console.cloud.google.com/apis/library)
2. Search for "Cloud Vision API"
3. Click on the API and then click "Enable"

## 3. Create a Service Account and Key

1. Go to [IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click "Create Service Account"
3. Enter a name (e.g., "suresight-vision-api")
4. Click "Create and Continue"
5. Assign the role "Cloud Vision API > Cloud Vision User"
6. Click "Continue" and then "Done"
7. Locate your newly created service account in the list and click on it
8. Go to the "Keys" tab
9. Click "Add Key" > "Create new key"
10. Choose JSON format and click "Create"
11. Save the downloaded JSON file securely - this is your credential file

## 4. Configure Supabase Environment Variables

1. Go to your [Supabase Project Dashboard](https://app.supabase.io)
2. Navigate to Settings > API
3. Under "Edge Functions", add a new secret called `GOOGLE_VISION_CREDENTIALS`
4. Paste the entire contents of the JSON key file as the value
5. Click "Save"

## 5. Additional Configuration

For local development, add the credentials to your `.env.local` file:

```
GOOGLE_VISION_CREDENTIALS='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
```

Note: Never commit this file to version control. Ensure `.env.local` is in your `.gitignore` file.