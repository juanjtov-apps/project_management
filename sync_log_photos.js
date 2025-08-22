// Script to sync photos from project logs to photos table
import { Client } from 'pg';

async function syncLogPhotosToPhotosTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Get all project logs that have images
    const logsResult = await client.query(`
      SELECT id, project_id, user_id, title, images, created_at 
      FROM project_logs 
      WHERE images IS NOT NULL AND array_length(images, 1) > 0
    `);

    console.log(`Found ${logsResult.rows.length} logs with images`);

    for (const log of logsResult.rows) {
      console.log(`\nProcessing log: ${log.title} (${log.images.length} images)`);
      
      for (let i = 0; i < log.images.length; i++) {
        const imageUrl = log.images[i];
        
        // Extract filename/ID from the URL
        let filename = '';
        let originalName = '';
        
        if (imageUrl.includes('/uploads/')) {
          // Extract the UUID from object storage URL
          const urlParts = imageUrl.split('/uploads/')[1];
          const cleanId = urlParts.split('?')[0]; // Remove query parameters
          filename = `${cleanId}.jpg`; // Default extension
          originalName = `log-photo-${i + 1}.jpg`;
        } else {
          // Fallback for other URL formats
          filename = imageUrl.split('/').pop()?.split('?')[0] || `image-${i + 1}.jpg`;
          originalName = filename;
        }

        // Check if this photo already exists in photos table
        const existingPhoto = await client.query(`
          SELECT id FROM photos 
          WHERE filename = $1 OR filename LIKE $2
        `, [filename, `%${filename.split('.')[0]}%`]);

        if (existingPhoto.rows.length === 0) {
          // Insert new photo record
          const insertResult = await client.query(`
            INSERT INTO photos (project_id, user_id, filename, original_name, description, tags, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
          `, [
            log.project_id,
            log.user_id,
            filename,
            originalName,
            log.title,
            ['log-photo'], // Add a tag to identify these as log photos
            log.created_at
          ]);
          
          console.log(`  ✅ Created photo record: ${insertResult.rows[0].id} for ${filename}`);
        } else {
          console.log(`  ⏭️  Photo already exists: ${filename}`);
        }
      }
    }

    console.log('\n✅ Photo sync completed successfully!');
    
  } catch (error) {
    console.error('❌ Error syncing photos:', error);
  } finally {
    await client.end();
  }
}

// Run the sync
syncLogPhotosToPhotosTable();