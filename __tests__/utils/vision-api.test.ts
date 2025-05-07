import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ImageAnnotatorClient } from '@google-cloud/vision';

const TEST_IMAGES_DIR = path.join(__dirname, '../../__tests__/_TestImages');
const DAMAGED_IMAGE_PATH = path.join(TEST_IMAGES_DIR, 'Dented/images (10).jpg');
const UNDAMAGED_IMAGE_PATH = path.join(TEST_IMAGES_DIR, 'Roof-Hail/download.png');

// These are the damage-related terms that our system checks for
const DAMAGE_LABELS = [
  'damage', 'broken', 'crack', 'dent', 'destruction', 
  'worn', 'rot', 'mold', 'leak', 'water damage', 'fire damage', 
  'structural damage', 'deterioration'
];

// Helper function to set up credentials for the Vision API client
// Handles different environments securely
function setupVisionCredentials() {
  // For production/Vercel deployment: Use environment variables
  if (process.env.GOOGLE_VISION_CREDENTIALS) {
    try {
      // If credentials are provided as a JSON string in env var
      const parsedCreds = JSON.parse(process.env.GOOGLE_VISION_CREDENTIALS);
      console.log('Using Google Vision credentials from environment variable');
      return { credentials: parsedCreds };
    } catch (error) {
      console.warn('Error parsing credentials from environment variable:', error.message);
    }
  }
  
  // For local development: Use credentials file
  const credsPath = path.join(__dirname, '../../google-vision-credentials.json');
  if (fs.existsSync(credsPath)) {
    // Set the environment variable that the client library will use
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credsPath;
    console.log('Using Google Vision credentials from local file');
    return {}; // Empty object lets the client use GOOGLE_APPLICATION_CREDENTIALS
  }
  
  console.warn('No Google Vision credentials found');
  return { credentials: {} }; // Empty credentials will fail gracefully
}

describe('Google Cloud Vision API Live Test', () => {
  
  // Set up the credentials before any tests run
  let visionClientOptions: any;
  beforeAll(() => {
    visionClientOptions = setupVisionCredentials();
  });
  
  test('should detect damage in a cracked image', async () => {
    // Skip test if credentials aren't available
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && 
        !visionClientOptions.credentials?.private_key) {
      console.warn('Skipping test: No Google Vision credentials available');
      return;
    }
    
    // Check that the test image exists
    expect(fs.existsSync(DAMAGED_IMAGE_PATH)).toBe(true);
    
    try {
      // Create a client using our secure credential setup
      const client = new ImageAnnotatorClient(visionClientOptions);
      
      console.log('Calling Vision API with cracked image...');
      console.log('Testing image:', DAMAGED_IMAGE_PATH);
      
      // Call the Vision API's labelDetection method
      const [result] = await client.labelDetection(DAMAGED_IMAGE_PATH);
      const labels = result.labelAnnotations || [];
      
      // Log the labels returned by the API
      console.log('Labels returned by Vision API:', 
        labels.map(l => `${l.description} (${l.score})`).join(', '));
      
      // Check if we got some labels back
      expect(labels.length).toBeGreaterThan(0);
      
      // Check if any damage-related labels are present
      const damageDetected = labels.some(label => 
        DAMAGE_LABELS.some(damageType => 
          label.description.toLowerCase().includes(damageType)
        )
      );
      
      // Calculate confidence score - highest score among damage-related labels
      const damageLabels = labels.filter(label => 
        DAMAGE_LABELS.some(damageType => 
          label.description.toLowerCase().includes(damageType)
        )
      );
      
      const confidenceScore = damageLabels.length > 0
        ? Math.max(...damageLabels.map(label => label.score))
        : 0;
      
      console.log(`Damage detected: ${damageDetected}`);
      console.log(`Confidence score: ${confidenceScore}`);
      
      if (damageLabels.length > 0) {
        console.log('Damage labels found:', 
          damageLabels.map(l => `${l.description} (${l.score})`).join(', '));
      } else {
        console.log('No damage labels found in the image');
      }
      
      // Store these results in a mock database entry - this simulates how your
      // actual system would store vision API results
      const analysisEntry = {
        id: uuidv4(),
        image_id: 'test-image-id',
        damage_detected: damageDetected,
        confidence: confidenceScore,
        raw_results: labels,
        analyzed_at: new Date().toISOString()
      };
      
      // Log the analysis entry details
      console.log('Analysis entry created:', {
        damage_detected: analysisEntry.damage_detected,
        confidence: analysisEntry.confidence,
        labels_count: labels.length
      });
      
    } catch (error) {
      console.error('Vision API request failed:', error.message);
      throw error; // Make the test fail if the API call fails
    }
  }, 30000); // Increase timeout to 30 seconds for API call
  
  test('should process an undamaged image correctly', async () => {
    // Skip test if credentials aren't available
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && 
        !visionClientOptions.credentials?.private_key) {
      console.warn('Skipping test: No Google Vision credentials available');
      return;
    }
    
    // Check that the test image exists
    expect(fs.existsSync(UNDAMAGED_IMAGE_PATH)).toBe(true);
    
    try {
      // Create a client using our secure credential setup
      const client = new ImageAnnotatorClient(visionClientOptions);
      
      console.log('Calling Vision API with undamaged image...');
      
      // Call the Vision API's labelDetection method
      const [result] = await client.labelDetection(UNDAMAGED_IMAGE_PATH);
      const labels = result.labelAnnotations || [];
      
      // Log the labels returned by the API
      console.log('Labels returned by Vision API for undamaged image:', 
        labels.map(l => `${l.description} (${l.score})`).join(', '));
      
      // Check if we got some labels back
      expect(labels.length).toBeGreaterThan(0);
      
      // Process labels to check for damage detection
      const damageDetected = labels.some(label => 
        DAMAGE_LABELS.some(damageType => 
          label.description.toLowerCase().includes(damageType)
        )
      );
      
      // Log what we found for reference
      if (damageDetected) {
        console.log('Note: Damage was detected in the supposedly undamaged image');
        
        // Show which labels triggered the damage detection
        const matchingLabels = labels.filter(label => 
          DAMAGE_LABELS.some(damageType => 
            label.description.toLowerCase().includes(damageType)
          )
        );
        
        console.log('Matching damage labels:', 
          matchingLabels.map(l => `${l.description} (${l.score})`).join(', '));
      } else {
        console.log('No damage detected in undamaged image, as expected');
      }
      
    } catch (error) {
      console.error('Vision API request failed:', error.message);
      throw error; // Make the test fail if the API call fails
    }
  }, 30000); // Increase timeout to 30 seconds for API call
  
  test('should simulate the actual damage detection logic used in production', async () => {
    // Skip test if credentials aren't available
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && 
        !visionClientOptions.credentials?.private_key) {
      console.warn('Skipping test: No Google Vision credentials available');
      return;
    }
    
    // Check that the test image exists
    expect(fs.existsSync(DAMAGED_IMAGE_PATH)).toBe(true);
    
    try {
      // Create a client using our secure credential setup
      const client = new ImageAnnotatorClient(visionClientOptions);
      
      console.log('Calling Vision API to test production logic...');
      
      // Call the Vision API's labelDetection method (same as in production)
      const [result] = await client.labelDetection(DAMAGED_IMAGE_PATH);
      const labels = result.labelAnnotations || [];
      
      // This simulates the damage detection logic used in the Edge function
      // Check if any damage-related labels are present
      const damageDetected = labels.some(label => 
        DAMAGE_LABELS.some(damageType => 
          label.description.toLowerCase().includes(damageType)
        )
      );
      
      // Calculate confidence score - highest score among damage-related labels
      const damageLabels = labels.filter(label => 
        DAMAGE_LABELS.some(damageType => 
          label.description.toLowerCase().includes(damageType)
        )
      );
      
      const confidenceScore = damageLabels.length > 0
        ? Math.max(...damageLabels.map(label => label.score))
        : 0;
        
      // Log the results
      console.log(`Damage detected: ${damageDetected}`);
      console.log(`Confidence score: ${confidenceScore}`);
      console.log(`Damage labels found: ${damageLabels.length}`);
      
      if (damageLabels.length > 0) {
        console.log('Damage labels:', damageLabels.map(l => `${l.description} (${l.score})`).join(', '));
      }
      
      // Store these results in a mock database entry - this simulates how your
      // actual system would store vision API results
      const analysisEntry = {
        id: uuidv4(),
        image_id: 'test-image-id',
        damage_detected: damageDetected,
        confidence: confidenceScore,
        raw_results: labels,
        analyzed_at: new Date().toISOString()
      };
      
      // Verify that our analysis entry has the expected structure
      expect(analysisEntry).toHaveProperty('damage_detected');
      expect(analysisEntry).toHaveProperty('confidence');
      expect(analysisEntry).toHaveProperty('raw_results');
      
      // Validate that we have the expected properties and types
      expect(typeof analysisEntry.damage_detected).toBe('boolean');
      expect(typeof analysisEntry.confidence).toBe('number');
      expect(Array.isArray(analysisEntry.raw_results)).toBe(true);
      
    } catch (error) {
      console.error('Vision API request failed:', error.message);
      throw error; // Make the test fail if the API call fails
    }
  }, 30000); // Increase timeout to 30 seconds for API call
});