#!/usr/bin/env node

import fs from 'fs';
import https from 'https';
import http from 'http';

async function testUploadFlow() {
  console.log('🧪 Testing complete upload flow...\n');
  
  // Test 1: Get upload URL
  console.log('📋 Test 1: Getting upload URL from server');
  try {
    const response = await fetch('http://localhost:5000/api/objects/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    console.log('✅ Upload URL generated successfully');
    console.log(`   Length: ${data.uploadURL.length} characters`);
    console.log(`   Domain: ${new URL(data.uploadURL).hostname}`);
    
    // Test 2: Upload a test file
    console.log('\n📤 Test 2: Testing file upload to signed URL');
    const testContent = 'Test file content for upload verification';
    
    const uploadResponse = await fetch(data.uploadURL, {
      method: 'PUT',
      body: testContent,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': testContent.length.toString()
      }
    });
    
    console.log(`   Upload status: ${uploadResponse.status}`);
    console.log(`   Upload headers:`, Object.fromEntries(uploadResponse.headers.entries()));
    
    if (uploadResponse.ok) {
      console.log('✅ File upload successful');
    } else {
      console.log('❌ File upload failed');
      const errorText = await uploadResponse.text();
      console.log(`   Error: ${errorText}`);
    }
    
    // Test 3: Check if it's a CORS issue
    console.log('\n🔒 Test 3: Checking CORS headers');
    console.log(`   Access-Control-Allow-Origin: ${uploadResponse.headers.get('access-control-allow-origin') || 'Not present'}`);
    console.log(`   Access-Control-Allow-Methods: ${uploadResponse.headers.get('access-control-allow-methods') || 'Not present'}`);
    
    // Test 4: Simulate binary file upload (like images)
    console.log('\n🖼️  Test 4: Testing binary file upload');
    const binaryData = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]); // JPEG header
    
    const binaryResponse = await fetch(data.uploadURL.replace(/uploads\/[^?]+/, 'uploads/test-binary'), {
      method: 'PUT',
      body: binaryData,
      headers: {
        'Content-Type': 'image/jpeg'
      }
    });
    
    console.log(`   Binary upload status: ${binaryResponse.status}`);
    if (binaryResponse.ok) {
      console.log('✅ Binary upload successful');
    } else {
      console.log('❌ Binary upload failed');
      console.log(`   Error: ${await binaryResponse.text()}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('   Stack:', error.stack);
  }
}

testUploadFlow().catch(console.error);