#!/usr/bin/env python3
"""Simple test script to verify object storage upload functionality."""

import asyncio
import aiohttp
import json

async def test_upload():
    """Test the complete upload flow."""
    
    # Step 1: Get upload URL
    print("🔗 Getting upload URL...")
    async with aiohttp.ClientSession() as session:
        async with session.post('http://localhost:5000/api/objects/upload', 
                               json={}) as response:
            if response.status != 200:
                text = await response.text()
                print(f"❌ Failed to get upload URL: {response.status} - {text}")
                return
            
            data = await response.json()
            upload_url = data['uploadURL']
            print(f"✅ Got upload URL: {upload_url[:100]}...")
        
        # Step 2: Test upload with a small file
        print("📤 Testing file upload...")
        test_content = b"This is a test file for object storage"
        
        async with session.put(upload_url, 
                              data=test_content,
                              headers={'Content-Type': 'text/plain'}) as upload_response:
            print(f"📊 Upload response status: {upload_response.status}")
            response_text = await upload_response.text()
            print(f"📋 Upload response: {response_text}")
            
            if upload_response.status in [200, 201, 204]:
                print("✅ Upload successful!")
            else:
                print(f"❌ Upload failed: {upload_response.status}")

if __name__ == "__main__":
    asyncio.run(test_upload())