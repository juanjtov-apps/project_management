#!/usr/bin/env node

// Simple photo upload test script
import fs from 'fs';
import path from 'path';

// Create a simple test image data (1x1 pixel PNG)
const testImageData = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
  0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
  0x49, 0x48, 0x44, 0x52, // IHDR
  0x00, 0x00, 0x00, 0x01, // Width: 1
  0x00, 0x00, 0x00, 0x01, // Height: 1
  0x08, 0x02, 0x00, 0x00, 0x00, // Bit depth, color type, compression, filter, interlace
  0x90, 0x77, 0x53, 0xDE, // CRC
  0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
  0x49, 0x44, 0x41, 0x54, // IDAT
  0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, // Image data
  0x02, 0x00, 0x01, 0xE5, // CRC
  0x00, 0x00, 0x00, 0x00, // IEND chunk length
  0x49, 0x45, 0x4E, 0x44, // IEND
  0xAE, 0x42, 0x60, 0x82  // CRC
]);

const testImagePath = 'test-upload.png';
fs.writeFileSync(testImagePath, testImageData);

console.log('Created test image at:', testImagePath);
console.log('Image size:', fs.statSync(testImagePath).size, 'bytes');

async function testPhotoUpload() {
  try {
    const FormData = (await import('form-data')).default;
    const fetch = (await import('node-fetch')).default;
    
    const form = new FormData();
    form.append('file', fs.createReadStream(testImagePath));
    form.append('projectId', 'e791d5b9-613b-4336-8a7b-786e3ef75e12'); // Using a project ID from logs
    form.append('description', 'Test upload from script');
    form.append('userId', 'sample-user-id');

    const response = await fetch('http://localhost:5000/api/photos', {
      method: 'POST',
      body: form,
    });

    console.log('Upload response status:', response.status);
    const responseText = await response.text();
    console.log('Upload response:', responseText);

    if (response.ok) {
      console.log('✅ Photo upload test successful!');
    } else {
      console.log('❌ Photo upload test failed');
    }
  } catch (error) {
    console.error('Upload test error:', error.message);
  } finally {
    // Clean up test file
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
      console.log('Cleaned up test file');
    }
  }
}

// Run the test
testPhotoUpload();