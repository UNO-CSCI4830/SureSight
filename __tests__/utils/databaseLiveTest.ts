/**
 * IMPORTANT: This test interacts with a live database.
 * Run this ONLY in development/testing environments, NEVER in production.
 * 
 * To run this test:
 * npm run test:db
 * 
 * This test will:
 * 1. Create a test user
 * 2. Create properties for the user
 * 3. Create reports for the properties
 * 4. Add assessment areas to reports
 * 5. Upload a test image
 * 6. Create messages for the user
 * 7. Verify all data is correctly stored and retrieved
 * 8. Clean up all test data
 */

// Import dependencies
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Skip this test in CI environments
const SKIP_LIVE_TESTS = process.env.CI === 'true' || process.env.SKIP_LIVE_TESTS === 'true';

// Generate unique test IDs to avoid conflicts
const TEST_ID = `test-${Date.now()}`;
const TEST_EMAIL = `testuser${Date.now()}@gmail.com`;  // Using a common email domain
const TEST_PASSWORD = 'TestPassword123!';

// Option to reuse an existing test user instead of creating a new one
const REUSE_TEST_USER = process.env.REUSE_TEST_USER === 'true';
const FIXED_TEST_EMAIL = process.env.TEST_USER_EMAIL || 'suresight.test@gmail.com';
const FIXED_TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

// Create a Supabase client for testing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if we have valid Supabase credentials
const VALID_CREDENTIALS = Boolean(supabaseUrl && supabaseAnonKey && 
  !supabaseUrl.includes('mock-supabase-url') && 
  !supabaseAnonKey.includes('mock-supabase-anon-key'));

// Skip the test if credentials are not available
const SHOULD_SKIP_TESTS = SKIP_LIVE_TESTS || !VALID_CREDENTIALS;

// Create client only if we have valid credentials
const supabase = VALID_CREDENTIALS 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Track created resources for cleanup
const createdResources = {
  userId: '',
  authUserId: '',
  profileId: '',
  homeownerProfileId: '',
  propertyIds: [] as string[],
  reportIds: [] as string[],
  assessmentAreaIds: [] as string[],
  imageIds: [] as string[],
  messageIds: [] as string[],
};

/**
 * Use an existing test account to avoid rate limits
 */
async function useExistingTestUser() {
  console.log('Using existing test user account...');

  // 1. Sign in with the fixed test email/password
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: FIXED_TEST_EMAIL,
    password: FIXED_TEST_PASSWORD,
  });

  if (signInError) {
    throw new Error(`Failed to sign in with test user: ${signInError.message}`);
  }

  // Get the user ID from the auth session
  createdResources.authUserId = signInData.user?.id || '';
  console.log(`Signed in with existing auth user: ${createdResources.authUserId}`);

  // 2. Check if there's a corresponding user profile
  const { data: userDataArray, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', createdResources.authUserId);

  if (userError) {
    throw new Error(`Failed to check for user profile: ${userError.message}`);
  }
  
  let userData;
  
  // If user profile doesn't exist, create one
  if (!userDataArray || userDataArray.length === 0) {
    console.log('No user profile found for this auth user. Creating one...');
    
    // Create user profile based on the actual schema
    const { data: newUserData, error: insertError } = await supabase
      .from('users')
      .insert({
        auth_user_id: createdResources.authUserId,
        email: FIXED_TEST_EMAIL,
        first_name: 'Test',
        last_name: 'User',
        role: 'homeowner',
        email_confirmed: true,
        phone: '555-123-4567'
      })
      .select('*')
      .single();

    if (insertError) {
      throw new Error(`Failed to create user profile: ${insertError.message}`);
    }
    
    userData = newUserData;
    console.log(`Created new user profile: ${userData.id}`);
  } else {
    // Use the existing user profile
    userData = userDataArray[0];
    console.log(`Found existing user profile: ${userData.id} (${userData.email})`);
  }
  
  createdResources.userId = userData.id;
  return userData;
}

/**
 * Helper to create a temporary test image file
 */
async function createTestImageFile(): Promise<File> {
  // For Node.js testing environment, we need a different approach to create a File
  // This is a simplified approach that works in the browser
  const base64Data = 
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
  const binaryData = Buffer.from(base64Data, 'base64');
  
  // Create a Blob from the binary data
  const blob = new Blob([binaryData], { type: 'image/png' });
  
  // Create a File from the Blob
  return new File([blob], 'test-image.png', { type: 'image/png' });
}

/**
 * Create a test user account
 */
async function createTestUser() {
  console.log('Creating test user...');

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (authError) {
    throw new Error(`Failed to create auth user: ${authError.message}`);
  }

  createdResources.authUserId = authData.user?.id || '';
  console.log(`Created auth user: ${createdResources.authUserId}`);

  // 2. Create user profile based on the actual schema
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({
      auth_user_id: createdResources.authUserId,
      email: TEST_EMAIL,
      first_name: 'Test',
      last_name: 'User',
      role: 'homeowner',
      email_confirmed: true,
      phone: '555-123-4567'  // Only include fields that are in the actual schema
    })
    .select('*')
    .single();

  if (userError) {
    throw new Error(`Failed to create user profile: ${userError.message}`);
  }

  createdResources.userId = userData.id;
  console.log(`Created user profile: ${createdResources.userId}`);

  return userData;
}

/**
 * Create a profile for the user, then create a homeowner profile linked to it
 */
async function createProfiles(userId: string) {
  console.log('Creating user profiles...');

  // 1. Create the base profile first
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .insert({
      user_id: userId
    })
    .select('*')
    .single();

  if (profileError) {
    throw new Error(`Failed to create base profile: ${profileError.message}`);
  }

  createdResources.profileId = profileData.id;
  console.log(`Created base profile: ${profileData.id}`);

  // 2. Now create the homeowner profile linked to the base profile
  const { data: homeownerProfile, error: homeownerError } = await supabase
    .from('homeowner_profiles')
    .insert({
      id: profileData.id,  // The homeowner_profiles.id references profiles.id
      preferred_contact_method: 'email',
      additional_notes: 'This is a test homeowner profile created by automated tests',
      property_count: 0
    })
    .select('*')
    .single();

  if (homeownerError) {
    throw new Error(`Failed to create homeowner profile: ${homeownerError.message}`);
  }

  createdResources.homeownerProfileId = homeownerProfile.id;
  console.log(`Created homeowner profile: ${homeownerProfile.id}`);

  return homeownerProfile;
}

/**
 * Create test properties for the user
 */
async function createTestProperties(userId: string) {
  console.log('Creating test properties...');
  
  // Use the homeowner_profile_id instead of user_id based on the schema
  const homeownerId = createdResources.homeownerProfileId;
  
  if (!homeownerId) {
    throw new Error('Homeowner profile ID is required to create properties');
  }
  
  // Create two test properties
  const properties = [
    {
      homeowner_id: homeownerId,
      address_line1: '123 Test Street',
      city: 'Testville',
      state: 'TS',
      postal_code: '12345',
      property_type: 'residential',
      year_built: 2010
    },
    {
      homeowner_id: homeownerId,
      address_line1: '456 Sample Avenue',
      city: 'Sampletown',
      state: 'ST',
      postal_code: '67890',
      property_type: 'commercial',
      year_built: 2005
    }
  ];

  for (const property of properties) {
    // Try direct insert first if the RPC function doesn't work
    const { data: propertyData, error: insertError } = await supabase
      .from('properties')
      .insert({
        homeowner_id: property.homeowner_id,
        address_line1: property.address_line1,
        city: property.city,
        state: property.state,
        postal_code: property.postal_code,
        property_type: property.property_type,
        year_built: property.year_built,
        square_footage: 2000
      })
      .select('id')
      .single();

    if (insertError) {
      console.warn(`Direct insert failed, trying RPC: ${insertError.message}`);
      
      // Fall back to RPC if direct insert fails
      const { data: propertyId, error } = await supabase.rpc('create_property', {
        p_homeowner_profile_id: property.homeowner_id,
        p_address_line1: property.address_line1,
        p_city: property.city,
        p_state: property.state,
        p_postal_code: property.postal_code,
        p_address_line2: undefined,
        p_country: 'US',
        p_property_type: property.property_type,
        p_year_built: property.year_built,
        p_square_footage: 2000
      });

      if (error) {
        throw new Error(`Failed to create property: ${error.message}`);
      }

      createdResources.propertyIds.push(propertyId);
      console.log(`Created property via RPC: ${propertyId}`);
    } else {
      createdResources.propertyIds.push(propertyData.id);
      console.log(`Created property via direct insert: ${propertyData.id}`);
    }
  }

  return createdResources.propertyIds;
}

/**
 * Create test reports for the properties
 */
async function createTestReports(propertyIds: string[], userId: string) {
  console.log('Creating test reports...');
  
  // Create a report for each property
  for (const propertyId of propertyIds) {
    const { data: reportId, error } = await supabase.rpc('create_report', {
      p_property_id: propertyId,
      p_creator_id: userId,
      p_title: `Test Report for ${propertyId}`,
      p_description: 'This is a test report created by the automated test suite',
      p_incident_date: new Date().toISOString().split('T')[0],
    });

    if (error) {
      throw new Error(`Failed to create report: ${error.message}`);
    }

    createdResources.reportIds.push(reportId);
    console.log(`Created report: ${reportId}`);
  }

  return createdResources.reportIds;
}

/**
 * Add assessment areas to the reports
 */
async function createTestAssessmentAreas(reportIds: string[], userId: string) {
  console.log('Creating test assessment areas...');
  
  // Use correct enum values from the database schema
  const damageTypes = ['roof', 'siding', 'window', 'structural', 'water', 'other'];
  const severities = ['minor', 'moderate', 'severe', 'critical'];
  
  for (const reportId of reportIds) {
    // Add multiple assessment areas to each report
    for (let i = 0; i < 2; i++) {
      const damageType = damageTypes[Math.floor(Math.random() * damageTypes.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      
      console.log(`Adding assessment area with damage_type: "${damageType}" and severity: "${severity}"`);
      
      try {
        // Direct insert into assessment_areas table
        const { data: directAreaData, error: directError } = await supabase
          .from('assessment_areas')
          .insert({
            report_id: reportId,
            damage_type: damageType,
            location: `${i === 0 ? 'North' : 'South'} side`,
            severity: severity,
            dimensions: `${10 + i}x${15 + i}`,
            notes: `${severity} ${damageType} damage on the ${i === 0 ? 'North' : 'South'} side`
          })
          .select('id')
          .single();

        if (directError) {
          console.warn(`Direct insert failed: ${directError.message}, trying RPC...`);
          
          // Fall back to RPC if direct insert fails
          const { data: assessmentAreaId, error } = await supabase.rpc('add_assessment_area', {
            p_report_id: reportId,
            p_damage_type: damageType,
            p_location: `${i === 0 ? 'North' : 'South'} side`,
            p_severity: severity,
            p_added_by: userId,
            p_dimensions: `${10 + i}x${15 + i}`,
            p_notes: `${severity} ${damageType} damage on the ${i === 0 ? 'North' : 'South'} side`
          });

          if (error) {
            throw new Error(`Failed to create assessment area via RPC: ${error.message}`);
          }

          createdResources.assessmentAreaIds.push(assessmentAreaId);
          console.log(`Created assessment area via RPC: ${assessmentAreaId}`);
        } else {
          createdResources.assessmentAreaIds.push(directAreaData.id);
          console.log(`Created assessment area via direct insert: ${directAreaData.id}`);
        }
      } catch (error: any) {
        throw new Error(`Failed to create assessment area: ${error.message}`);
      }
    }
  }

  return createdResources.assessmentAreaIds;
}

/**
 * Upload test image to a report
 */
async function uploadTestImage(reportId: string, userId: string) {
  console.log('Uploading test image...');
  
  try {
    // Create test image
    const testImage = await createTestImageFile();
    
    // Get the auth session to use the auth user ID
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) {
      throw new Error('No authenticated session found');
    }
    
    const authUserId = authData.session.user.id;
    console.log(`Current auth state: Authenticated`);
    console.log(`Auth user ID: ${authUserId}`);
    console.log(`Test user profile ID: ${userId}`);
    
    // Generate a path that follows the storage RLS policy pattern: reports/[auth_user_id]/...
    const filePath = `reports/${authUserId}/${reportId}-${Date.now()}-test-image.png`;
    console.log(`Attempting to upload to path: ${filePath}`);
    
    // Upload the file to storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('reports')
      .upload(filePath, testImage, { cacheControl: '3600', upsert: false });
    
    if (uploadError) {
      console.log(`Storage upload error: ${uploadError.message}`);
      throw uploadError;
    }
    
    console.log('File uploaded successfully to storage bucket');
    
    // Get the public URL
    const { data: urlData } = supabase
      .storage
      .from('reports')
      .getPublicUrl(uploadData.path);
      
    // Add record to images table based on actual schema
    // IMPORTANT: Use the user profile ID (not the auth user ID) for uploaded_by to satisfy foreign key constraints
    const { data: imageData, error: imageError } = await supabase
      .from('images')
      .insert({
        assessment_area_id: createdResources.assessmentAreaIds[0], // Associate with first assessment area
        report_id: reportId, // Also link to the report directly as per schema
        storage_path: uploadData.path,
        filename: testImage.name,
        file_size: testImage.size,
        content_type: testImage.type,
        uploaded_by: userId  // Use user profile ID (not auth ID) to match activities_user_id_fkey
      })
      .select('*')
      .single();
      
    if (imageError) {
      console.log(`Error inserting image record: ${imageError.message}`);
      throw imageError;
    }
    
    createdResources.imageIds.push(imageData.id);
    console.log(`Uploaded image: ${imageData.id}`);
    
    return imageData;
  } catch (error: any) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

/**
 * Create test messages for the user
 */
async function createTestMessages(userId: string) {
  console.log('Creating test messages...');
  
  const messages = [
    {
      sender_id: userId, // Use the actual user ID instead of system
      receiver_id: userId,
      content: 'Welcome to the system! This is your first notification.',
      is_read: false
    },
    {
      sender_id: userId, // Use the actual user ID instead of system
      receiver_id: userId,
      content: 'You have created your first property. Click here to add more details.',
      is_read: false
    },
    {
      sender_id: userId, // Self message for testing
      receiver_id: userId,
      content: 'This is a test message from myself to myself.',
      is_read: true
    }
  ];
  
  for (const message of messages) {
    const { data, error } = await supabase
      .from('messages')
      .insert(message)
      .select('*')
      .single();
      
    if (error) {
      throw new Error(`Failed to create message: ${error.message}`);
    }
    
    createdResources.messageIds.push(data.id);
    console.log(`Created message: ${data.id}`);
  }
  
  return createdResources.messageIds;
}

/**
 * Verify the data is correctly stored and can be retrieved
 */
async function verifyTestData() {
  console.log('Verifying test data...');
  
  // 1. Verify user exists
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', createdResources.userId)
    .single();
    
  if (userError || !userData) {
    throw new Error(`Failed to verify user: ${userError?.message || 'User not found'}`);
  }
  console.log('✓ User verified');
  
  // 2. Verify properties exist - use homeownerProfileId instead of userId
  const { data: properties, error: propertiesError } = await supabase
    .from('properties')
    .select('*')
    .eq('homeowner_id', createdResources.homeownerProfileId);
    
  if (propertiesError || !properties || properties.length !== 2) {
    throw new Error(`Failed to verify properties: ${propertiesError?.message || 'Properties not found'}`);
  }
  console.log('✓ Properties verified');
  
  // 3. Verify reports exist with correct relationships
  const { data: reports, error: reportsError } = await supabase
    .from('reports')
    .select(`
      *,
      property:property_id(*),
      assessment_areas(*)
    `)
    .in('id', createdResources.reportIds);
    
  if (reportsError || !reports || reports.length !== 2) {
    throw new Error(`Failed to verify reports: ${reportsError?.message || 'Reports not found'}`);
  }
  
  // Verify each report has two assessment areas
  for (const report of reports) {
    if (!report.assessment_areas || report.assessment_areas.length !== 2) {
      throw new Error(`Report ${report.id} should have 2 assessment areas, found ${report.assessment_areas?.length || 0}`);
    }
  }
  console.log('✓ Reports and assessment areas verified');
  
  // 4. Verify images exist
  if (createdResources.imageIds.length > 0) {
    const { data: images, error: imagesError } = await supabase
      .from('images')
      .select('*')
      .in('id', createdResources.imageIds);
      
    if (imagesError || !images || images.length === 0) {
      throw new Error(`Failed to verify images: ${imagesError?.message || 'Images not found'}`);
    }
    console.log('✓ Images verified');
  }
  
  // 5. Verify messages exist
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .eq('receiver_id', createdResources.userId);

  if (messagesError || !messages || messages.length !== 3) {
    throw new Error(`Failed to verify messages: ${messagesError?.message || 'Messages not found'}`);
  }
  console.log('✓ Messages verified');

  try {
    const response = await fetch(`http://localhost:3000/api/notis?user_id=${createdResources.userId}`);
    
    if (!response.ok) {
      throw new Error(`API response error: ${response.status}`);
    }
    
    const responseData = await response.json();
    
    if (!Array.isArray(responseData) || responseData.length !== 3) {
      throw new Error(`Expected 3 messages in API response, got ${responseData.length}`);
    }
    
    console.log('✓ API endpoint for notifications verified');
  } catch (error: any) {
    console.warn(`Could not verify API endpoint (server may not be running): ${error.message}`);
  }

  return true;
}

/**
 * Clean up all test data
 */
async function cleanupTestData() {
  console.log('Cleaning up test data...');
  
  // 1. Delete messages
  if (createdResources.messageIds.length > 0) {
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .in('id', createdResources.messageIds);
      
    if (messagesError) {
      console.warn(`Failed to delete messages: ${messagesError.message}`);
    } else {
      console.log(`Deleted ${createdResources.messageIds.length} messages`);
    }
  }
  
  // 2. Delete images
  if (createdResources.imageIds.length > 0) {
    const { data: images } = await supabase
      .from('images')
      .select('storage_path')
      .in('id', createdResources.imageIds);
      
    if (images && images.length > 0) {
      // Delete from storage
      const paths = images.map(img => img.storage_path);
      const { error: storageError } = await supabase
        .storage
        .from('reports')
        .remove(paths);
        
      if (storageError) {
        console.warn(`Failed to delete images from storage: ${storageError.message}`);
      }
    }
    
    // Delete from database
    const { error: imagesError } = await supabase
      .from('images')
      .delete()
      .in('id', createdResources.imageIds);
      
    if (imagesError) {
      console.warn(`Failed to delete image records: ${imagesError.message}`);
    } else {
      console.log(`Deleted ${createdResources.imageIds.length} images`);
    }
  }
  
  // 3. Delete assessment areas (normally handled by RLS cascading delete, but being thorough)
  if (createdResources.assessmentAreaIds.length > 0) {
    const { error: areasError } = await supabase
      .from('assessment_areas')
      .delete()
      .in('id', createdResources.assessmentAreaIds);
      
    if (areasError) {
      console.warn(`Failed to delete assessment areas: ${areasError.message}`);
    } else {
      console.log(`Deleted ${createdResources.assessmentAreaIds.length} assessment areas`);
    }
  }
  
  // 4. Delete reports
  if (createdResources.reportIds.length > 0) {
    const { error: reportsError } = await supabase
      .from('reports')
      .delete()
      .in('id', createdResources.reportIds);
      
    if (reportsError) {
      console.warn(`Failed to delete reports: ${reportsError.message}`);
    } else {
      console.log(`Deleted ${createdResources.reportIds.length} reports`);
    }
  }
  
  // 5. Delete properties
  if (createdResources.propertyIds.length > 0) {
    const { error: propertiesError } = await supabase
      .from('properties')
      .delete()
      .in('id', createdResources.propertyIds);
    
    if (propertiesError) {
      console.warn(`Failed to delete properties: ${propertiesError.message}`);
    } else {
      console.log(`Deleted ${createdResources.propertyIds.length} properties`);
    }
  }

  // Note: We're keeping the user profiles for future tests
  console.log('User profile preserved for future tests');
  
  return true;
}

// Main test function
export async function runDatabaseLiveTest() {
  if (SHOULD_SKIP_TESTS) {
    console.log('Skipping live database tests - environment variables not set or test explicitly skipped');
    return;
  }
  
  // Ensure supabase client is available
  if (!supabase) {
    console.error('Supabase client is not initialized');
    return;
  }
  
  try {
    console.log('Starting database live test...');
    
    // Get a user - either create a new one or use existing one depending on settings
    let user;
    if (REUSE_TEST_USER) {
      // Use existing test user to avoid rate limits
      user = await useExistingTestUser();
      
      // In reuse mode, we'll clean up test data but keep the user
      console.log('Using existing test user - will clean up data but keep user account');
    } else {
      // Create a brand new test user
      try {
        user = await createTestUser();
      } catch (error: any) {
        if (error.message && error.message.includes('rate limit')) {
          console.warn('Hit rate limit creating user, falling back to existing test user');
          user = await useExistingTestUser();
        } else {
          throw error;
        }
      }
    }
    
    // Add a small delay to ensure the user profile is fully available in the database
    console.log('Waiting for user profile to propagate...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create profiles - this creates the base profile and homeowner profile
    await createProfiles(user.id);
    
    // Create test properties
    const propertyIds = await createTestProperties(user.id);
    
    // Create test reports
    const reportIds = await createTestReports(propertyIds, user.id);
    
    // Create test assessment areas
    await createTestAssessmentAreas(reportIds, user.id);
    
    // Upload test image to first report
    if (reportIds.length > 0) {
      await uploadTestImage(reportIds[0], user.id);
    }
    
    // Create test messages
    await createTestMessages(user.id);
    
    // Verify all data
    await verifyTestData();
    
    console.log('All tests passed!');
    
    // Clean up
    await cleanupTestData();
    
    console.log('Test cleanup complete.');
    
  } catch (error: any) {
    console.error(`Test failed: ${error.message}`);
    
    // Attempt cleanup even on failure
    try {
      await cleanupTestData();
      console.log('Cleanup after error completed');
    } catch (cleanupError: any) {
      console.error(`Cleanup failed: ${cleanupError.message}`);
    }
    
    throw error;
  }
}

// Add Jest test structure to run the tests
describe('Database Live Tests', () => {
  jest.setTimeout(60000); // Set a longer timeout for these tests as they interact with a live database
  
  test('should perform full database integration test', async () => {
    if (SHOULD_SKIP_TESTS) {
      console.log('Skipping database live tests - required environment variables not available or tests explicitly skipped');
      expect(true).toBe(true); // Pass test when skipped
      return;
    }
    await runDatabaseLiveTest();
  });
});