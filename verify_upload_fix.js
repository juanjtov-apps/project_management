#!/usr/bin/env node

// Final verification test for the upload fix

async function verifyUploadWorks() {
  console.log('🔍 Final Upload Verification Test\n');
  
  try {
    // Step 1: Get fresh upload URL
    console.log('1. Getting fresh upload URL...');
    const response = await fetch('http://localhost:5000/api/objects/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get upload URL: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('   ✅ Upload URL generated');
    
    // Step 2: Create a mock image file (JPEG)
    const jpegHeader = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const imageData = new Uint8Array(1024); // 1KB test image
    imageData.set(jpegHeader);
    
    console.log('2. Uploading test JPEG image...');
    const uploadResponse = await fetch(data.uploadURL, {
      method: 'PUT',
      body: imageData,
      headers: {
        'Content-Type': 'image/jpeg'
      }
    });
    
    console.log(`   Status: ${uploadResponse.status}`);
    
    if (uploadResponse.ok) {
      console.log('   ✅ Image upload successful!');
      console.log('   🎉 Upload system is working correctly');
      return true;
    } else {
      const errorText = await uploadResponse.text();
      console.log(`   ❌ Upload failed: ${errorText}`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

verifyUploadWorks().then(success => {
  if (success) {
    console.log('\n🎯 RESULT: Upload system is working correctly');
    console.log('   The issue may be specific to Uppy configuration or browser environment');
  } else {
    console.log('\n💥 RESULT: Upload system has underlying issues');
  }
});