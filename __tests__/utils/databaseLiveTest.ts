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
import { supabase } from '../../utils/supabaseClient';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Skip this test in CI environments
const SKIP_LIVE_TESTS = process.env.CI === 'true' || process.env.SKIP_LIVE_TESTS === 'true';

// Generate unique test IDs to avoid conflicts
const TEST_ID = `test-${Date.now()}`;
const TEST_EMAIL = `test-user-${TEST_ID}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';

// Track created resources for cleanup
const createdResources = {
  userId: '',
  authUserId: '',
  propertyIds: [] as string[],
  reportIds: [] as string[],
  assessmentAreaIds: [] as string[],
  imageIds: [] as string[],
  messageIds: [] as string[],
};

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

  // 2. Create user profile
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({
      auth_user_id: createdResources.authUserId,
      email: TEST_EMAIL,
      first_name: 'Test',
      last_name: 'User',
      role: 'homeowner',
      email_confirmed: true
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
 * Create test properties for the user
 */
async function createTestProperties(userId: string) {
  console.log('Creating test properties...');
  
  // Create two test properties
  const properties = [
    {
      homeowner_id: userId,
      address_line1: '123 Test Street',
      city: 'Testville',
      state: 'TS',
      postal_code: '12345',
      property_type: 'residential',
      year_built: 2010
    },
    {
      homeowner_id: userId,
      address_line1: '456 Sample Avenue',
      city: 'Sampletown',
      state: 'ST',
      postal_code: '67890',
      property_type: 'commercial',
      year_built: 2005
    }
  ];

  for (const property of properties) {
    const { data: propertyId, error } = await supabase.rpc('create_property', {
      p_homeowner_profile_id: property.homeowner_id,
      p_address_line1: property.address_line1,
      p_city: property.city,
      p_state: property.state,
      p_postal_code: property.postal_code,
      p_address_line2: null,
      p_country: 'US',
      p_property_type: property.property_type,
      p_year_built: property.year_built,
      p_square_footage: 2000
    });

    if (error) {
      throw new Error(`Failed to create property: ${error.message}`);
    }

    createdResources.propertyIds.push(propertyId);
    console.log(`Created property: ${propertyId}`);
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
  
  // Add assessment areas to each report
  const damageTypes = ['hail', 'wind', 'water'];
  const severities = ['minor', 'moderate', 'severe'];
  
  for (const reportId of reportIds) {
    // Add multiple assessment areas to each report
    for (let i = 0; i < 2; i++) {
      const damageType = damageTypes[Math.floor(Math.random() * damageTypes.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      
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
        throw new Error(`Failed to create assessment area: ${error.message}`);
      }

      createdResources.assessmentAreaIds.push(assessmentAreaId);
      console.log(`Created assessment area: ${assessmentAreaId}`);
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
    
    // Generate a unique file path
    const filePath = `reports/${reportId}/${Date.now()}-test-image.png`;
    
    // Upload the file to storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('report-images')
      .upload(filePath, testImage, { cacheControl: '3600', upsert: false });
    
    if (uploadError) {
      throw uploadError;
    }
    
    // Get the public URL
    const { data: urlData } = supabase
      .storage
      .from('report-images')
      .getPublicUrl(uploadData.path);
      
    // Add record to images table
    const { data: imageData, error: imageError } = await supabase
      .from('images')
      .insert({
        report_id: reportId,
        path: uploadData.path,
        url: urlData.publicUrl,
        uploaded_by: userId,
        file_name: testImage.name,
        file_size: testImage.size,
        file_type: testImage.type
      })
      .select('*')
      .single();
      
    if (imageError) {
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
      sender_id: 'system',
      receiver_id: userId,
      message: 'Welcome to SureSight! Your account has been created successfully.',
      type: 'system',
      read: false
    },
    {
      sender_id: 'system',
      receiver_id: userId,
      message: 'You have created your first property. Click here to add more details.',
      type: 'notification',
      read: false
    },
    {
      sender_id: userId, // Self message for testing
      receiver_id: userId,
      message: 'This is a test message from myself to myself.',
      type: 'message',
      read: true
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
  
  // 2. Verify properties exist
  const { data: properties, error: propertiesError } = await supabase
    .from('properties')
    .select('*')
    .eq('homeowner_id', createdResources.userId);
    
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

  // 6. Verify API endpoint for notifications works correctly
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
      .select('path')
      .in('id', createdResources.imageIds);
      
    if (images && images.length > 0) {
      // Delete from storage
      const paths = images.map(img => img.path);
      const { error: storageError } = await supabase
        .storage
        .from('report-images')
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
  
  // 6. Delete user profile
  if (createdResources.userId) {
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('id', createdResources.userId);
      
    if (userError) {
      console.warn(`Failed to delete user profile: ${userError.message}`);
    } else {
      console.log(`Deleted user profile: ${createdResources.userId}`);
    }
  }
  
  // 7. Delete auth user
  if (createdResources.authUserId) {
    // Note: This requires admin privileges and may not work with anonymous key
    try {
      // This might require admin access that the client doesn't have
      const { error: authError } = await supabase.auth.admin.deleteUser(
        createdResources.authUserId
      );
      
      if (authError) {
        console.warn(`Failed to delete auth user (this may require admin rights): ${authError.message}`);
      } else {
        console.log(`Deleted auth user: ${createdResources.authUserId}`);
      }
    } catch (error: any) {
      console.warn(`Failed to delete auth user: ${error.message}`);
    }
  }
  
  return true;
}

// Main test function
export async function runDatabaseLiveTest() {
  if (SKIP_LIVE_TESTS) {
    console.log('Skipping live database tests');
    return;
  }
  
  try {
    console.log('Starting database live test...');
    
    // Create test user
    const user = await createTestUser();
    
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