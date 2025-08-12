import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { fileTypeFromBuffer } from 'file-type';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const lat = formData.get('lat') ? parseFloat(formData.get('lat') as string) : null;
    const lng = formData.get('lng') ? parseFloat(formData.get('lng') as string) : null;
    const added_by = formData.get('added_by') as string;
    const status = (formData.get('status') as string) || 'pending';

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Enforce file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB` 
      }, { status: 400 });
    }

    // Convert file to buffer and verify magic number
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const detected = await fileTypeFromBuffer(buffer);
    const allowed = ['image/webp', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!detected || !allowed.includes(detected.mime)) {
      return NextResponse.json({ 
        error: `Unsupported file type. Allowed types: ${allowed.join(', ')}` 
      }, { status: 400 });
    }

    // Basic metadata validation/sanitization
    const safeLat = lat !== null && isFinite(lat) && lat >= -90 && lat <= 90 ? lat : null;
    const safeLng = lng !== null && isFinite(lng) && lng >= -180 && lng <= 180 ? lng : null;
    const safeAddedBy = (added_by || '').toString().slice(0, 40) || 'player';
    const safeStatus = ['pending', 'approved', 'rejected'].includes(status) ? status : 'pending';

    // Random filename
    const { randomUUID } = await import('crypto');
    const fileName = `${randomUUID()}.${detected.ext}`;

    // Upload to Supabase Storage
    const { error: storageError } = await supabase.storage
      .from('images')
      .upload(fileName, buffer, {
        contentType: detected.mime,
        upsert: false
      });

    if (storageError) {
      console.error('Storage error:', storageError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage.from('images').getPublicUrl(fileName);
    const publicUrl = publicUrlData?.publicUrl;

    // Insert into photos table
    const { data: dbData, error: dbError } = await supabase
      .from('photos')
      .insert({
        url: publicUrl,
        lat: safeLat,
        lng: safeLng,
        added_by: safeAddedBy,
        status: safeStatus
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Failed to save photo data' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      photo: dbData 
    }, { status: 201 });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}