#!/usr/bin/env node

/**
 * Photo Migration Script: Local Storage to Google Cloud Storage
 * 
 * This script migrates all existing photos from local /uploads directory
 * to Google Cloud Storage for professional workflow consistency.
 * 
 * Professional Benefits:
 * - Reliable cloud storage with 99.9% uptime
 * - Automatic backups and disaster recovery
 * - Scalable storage without server disk limits
 * - CDN-powered global delivery
 * - Consistent storage architecture
 */

import fs from 'fs';
import path from 'path';
import { Storage } from '@google-cloud/storage';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Replit Object Storage Configuration
const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const BUCKET_ID = "replit-objstore-19d9abdb-d40b-44f2-b96f-7b47591275d4";
const PHOTOS_DIR = "/.private/photos";

const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

async function migratePhotosToCloud() {
  console.log('🚀 Starting photo migration to Google Cloud Storage...');
  console.log('📋 Professional Benefits: Reliable storage, automatic backups, global CDN');
  
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const bucket = objectStorageClient.bucket(BUCKET_ID);
  
  try {
    // Check if uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      console.log('❌ No uploads directory found. Migration not needed.');
      return;
    }

    // Get list of files in uploads directory
    const files = fs.readdirSync(uploadsDir);
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(file)
    );
    
    console.log(`📸 Found ${imageFiles.length} image files to migrate`);
    
    if (imageFiles.length === 0) {
      console.log('✅ No image files found in uploads directory');
      return;
    }

    let migrated = 0;
    let errors = 0;

    for (const filename of imageFiles) {
      try {
        console.log(`📤 Migrating: ${filename}`);
        
        const localFilePath = path.join(uploadsDir, filename);
        const cloudFilePath = `${PHOTOS_DIR}/${filename}`;
        
        // Upload to Google Cloud Storage
        const file = bucket.file(cloudFilePath);
        
        // Check if file already exists in cloud
        const [exists] = await file.exists();
        if (exists) {
          console.log(`⏭️  File already exists in cloud: ${filename}`);
          continue;
        }
        
        // Upload the file
        await bucket.upload(localFilePath, {
          destination: cloudFilePath,
          metadata: {
            metadata: {
              source: 'migration',
              originalPath: localFilePath,
              migratedAt: new Date().toISOString(),
            },
          },
        });
        
        console.log(`✅ Migrated: ${filename} → ${cloudFilePath}`);
        migrated++;
        
        // Optional: Remove local file after successful upload (commented for safety)
        // fs.unlinkSync(localFilePath);
        // console.log(`🗑️  Removed local file: ${filename}`);
        
      } catch (error) {
        console.error(`❌ Failed to migrate ${filename}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully migrated: ${migrated} photos`);
    console.log(`❌ Failed migrations: ${errors}`);
    console.log(`📁 Cloud storage path: gs://${BUCKET_ID}${PHOTOS_DIR}`);
    
    if (errors === 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('🔧 All photos are now stored professionally in Google Cloud Storage');
      console.log('💡 Benefits: Reliable storage, automatic backups, global delivery');
    } else {
      console.log('\n⚠️  Migration completed with some errors. Check logs above.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migratePhotosToCloud()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { migratePhotosToCloud };