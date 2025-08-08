// Test script to verify photo upload functionality
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

async function testPhotoUpload() {
  try {
    console.log('🧪 Testing photo upload functionality...');
    
    // Create a simple test image
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG header
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
      0xAE, 0x42, 0x60, 0x82
    ]);
    
    fs.writeFileSync('test-upload.png', testImageBuffer);
    console.log('✅ Test image created');
    
    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream('test-upload.png'));
    form.append('projectId', 'e791d5b9-613b-4336-8a7b-786e3ef75e12');
    form.append('description', 'Test upload from script');
    
    // Make the upload request
    const response = await fetch('http://localhost:5000/api/photos', {
      method: 'POST',
      body: form,
      headers: {
        'Cookie': 'connect.sid=s%3AY5ftx0a-30JK4K7ZpRtPAM8nG4Lzf1xG.lCVWgnMEknr9t43q5GpeMB8vyl9617QdHA0MYqgoDks'
      }
    });
    
    console.log('📤 Upload response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Upload successful!');
      console.log('📁 Photo details:', result);
      
      // Test if the file can be accessed
      const fileResponse = await fetch(`http://localhost:5000${result.filePath}`);
      console.log('🖼️ File access status:', fileResponse.status);
      
      if (fileResponse.ok) {
        console.log('✅ File successfully accessible via URL');
        console.log('🎯 PHOTO UPLOAD WORKING CORRECTLY!');
      } else {
        console.log('❌ File not accessible via URL');
      }
    } else {
      const error = await response.text();
      console.log('❌ Upload failed:', error);
    }
    
    // Cleanup
    fs.unlinkSync('test-upload.png');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPhotoUpload();