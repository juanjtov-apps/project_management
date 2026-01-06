#!/usr/bin/env node

// Test direct access to the Google Cloud Storage image URL

async function testImageAccess() {
  console.log('🔍 Testing Google Cloud Storage Image Access\n');
  
  // Use the image URL from the logs
  const imageUrl = 'https://storage.googleapis.com/replit-objstore-19d9abdb-d40b-44f2-b96f-7b47591275d4/.private/uploads/fd2c050b-a49a-4b53-97fa-347d343268d6';
  
  try {
    console.log('Testing direct access to:', imageUrl.substring(0, 100) + '...');
    
    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/*'
      }
    });
    
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      console.log('✅ Image accessible directly');
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);
      const contentLength = response.headers.get('content-length');
      console.log('Content-Length:', contentLength);
    } else {
      const errorText = await response.text();
      console.log('❌ Image not accessible');
      console.log('Error:', errorText.substring(0, 200));
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testImageAccess();