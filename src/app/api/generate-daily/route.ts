import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function POST() {
  try {
    // Always use America/New_York (EDT/EST) for daily photo cache
    const nyDate = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
    );
    // Extract year, month, day from EDT-localized date
    const year = nyDate.getFullYear();
    const month = String(nyDate.getMonth() + 1).padStart(2, '0');
    const day = String(nyDate.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    
    // Check if today's photos are already generated
    const { data: existing, error: checkError } = await supabase
      .from('daily_photo_cache')
      .select('photo_ids')
      .eq('date', today)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking existing daily photos:', checkError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ 
        success: true, 
        message: 'Daily photos already exist',
        date: today,
        photoIds: existing.photo_ids
      });
    }

    // Generate new daily selection - get all approved photos then randomly select 5
    const { data: allPhotos, error: photosError } = await supabase
      .from('photos')
      .select('id')
      .eq('status', 'approved');

    if (photosError) {
      console.error('Error fetching photos:', photosError);
      return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
    }

    if (!allPhotos || allPhotos.length === 0) {
      return NextResponse.json({ error: 'No approved photos found' }, { status: 404 });
    }

    if (allPhotos.length < 5) {
      return NextResponse.json({ error: 'Not enough approved photos available' }, { status: 400 });
    }

    // Randomly select 5 photos using Fisher-Yates shuffle
    const shuffled = [...allPhotos];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const photos = shuffled.slice(0, 5);

    const photoIds = photos.map((p: { id: string }) => p.id);
    
    // Store the daily selection
    const { error: insertError } = await supabase
      .from('daily_photo_cache')
      .insert({
        date: today,
        photo_ids: photoIds
      });

    if (insertError) {
      console.error('Error storing daily photos:', insertError);
      return NextResponse.json({ error: 'Failed to store daily selection' }, { status: 500 });
    }

    // Optional: Clean up old cache entries (keep last 7 days)
    const sevenDaysAgo = new Date(nyDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const cleanupYear = sevenDaysAgo.getFullYear();
    const cleanupMonth = String(sevenDaysAgo.getMonth() + 1).padStart(2, '0');
    const cleanupDay = String(sevenDaysAgo.getDate()).padStart(2, '0');
    const cleanupDate = `${cleanupYear}-${cleanupMonth}-${cleanupDay}`;
    
    await supabase
      .from('daily_photo_cache')
      .delete()
      .lt('date', cleanupDate);

    return NextResponse.json({ 
      success: true, 
      message: 'Daily photos generated',
      date: today,
      photoIds,
      count: photoIds.length
    });

  } catch (error) {
    console.error('Generate daily photos error:', error);
    return NextResponse.json({ error: 'Failed to generate daily photos' }, { status: 500 });
  }
}