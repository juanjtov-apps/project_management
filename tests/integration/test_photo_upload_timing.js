// Test script to verify photo upload timing
// This script will help us verify when photos are being uploaded

console.log('=== PHOTO UPLOAD TIMING TEST ===');

// Monitor network requests to detect when uploads happen
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  if (typeof url === 'string' && (url.includes('/api/objects/upload') || url.includes('storage.googleapis.com'))) {
    console.log('🔴 UPLOAD DETECTED:', {
      url: url,
      method: args[1]?.method || 'GET',
      timestamp: new Date().toLocaleTimeString(),
      stackTrace: new Error().stack.split('\n').slice(1, 5)
    });
  }
  return originalFetch.apply(this, args);
};

// Test functions
window.testPhotoUploadTiming = {
  // Test 1: Check if upload happens immediately on file selection
  testImmediateUpload: () => {
    console.log('\n=== TEST 1: Immediate Upload Detection ===');
    console.log('1. Click "Add Photo" button');
    console.log('2. Select a file');
    console.log('3. Watch console for upload activity');
    console.log('Expected: NO upload activity until "Update Log" is clicked');
  },

  // Test 2: Check if upload happens on form submission
  testDeferredUpload: () => {
    console.log('\n=== TEST 2: Deferred Upload Detection ===');
    console.log('1. Select a photo file');
    console.log('2. Click "Update Log" button');
    console.log('3. Watch console for upload activity');
    console.log('Expected: Upload activity ONLY after "Update Log" is clicked');
  },

  // Test 3: Check if new photos appear alongside existing ones
  testPhotoMerging: () => {
    console.log('\n=== TEST 3: Photo Merging Test ===');
    console.log('1. Edit a log that already has photos');
    console.log('2. Add a new photo');
    console.log('3. Click "Update Log"');
    console.log('4. Check if both old and new photos are visible');
    console.log('Expected: All photos (old + new) should be displayed');
  },

  // Helper to clear console and start fresh test
  clearAndStart: () => {
    console.clear();
    console.log('=== PHOTO UPLOAD TIMING TEST - FRESH START ===');
    console.log('Use testPhotoUploadTiming.testImmediateUpload() to start testing');
  }
};

console.log('Test functions available:');
console.log('- testPhotoUploadTiming.testImmediateUpload()');
console.log('- testPhotoUploadTiming.testDeferredUpload()');
console.log('- testPhotoUploadTiming.testPhotoMerging()');
console.log('- testPhotoUploadTiming.clearAndStart()');