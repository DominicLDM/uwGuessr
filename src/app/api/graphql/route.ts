import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const typeDefs = `
  type Photo {
    id: ID!
    url: String
    lat: Float
    lng: Float
    building: String
    floor: Int
    added_by: String
    created_at: String
    status: String
  }
  type Query {
    photos(status: String): [Photo]
    randomPhotos(count: Int!): [Photo]
    dailyPhotos(count: Int!): [Photo]
  }
  type Mutation {
    approvePhoto(id: ID!, lat: Float!, lng: Float!): Photo
    rejectPhoto(id: ID!): Photo
  }
`;

const resolvers = {
  Query: {
    photos: async (_: unknown, { status }: { status?: string }) => {
      let query = supabase.from('photos').select('*');
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    },
    randomPhotos: async (_: unknown, { count }: { count: number }) => {
      const { data, error } = await supabase
        .from('photos')
        .select('id, url, lat, lng')
        .eq('status', 'approved');

      if (error) throw new Error(error.message);
      if (!data || data.length === 0) return [];

      // Fisher-Yates shuffle
      const shuffled = [...data];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled.slice(0, count);
    },
    dailyPhotos: async (_: unknown, { count }: { count: number }) => {
      // Always use America/New_York (EDT/EST) for daily photo cache
      const nyDate = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
      );
      // Extract year, month, day from EDT-localized date
      const year = nyDate.getFullYear();
      const month = String(nyDate.getMonth() + 1).padStart(2, '0');
      const day = String(nyDate.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;
      
      // Get cached daily photos
      const { data: cached, error: cacheError } = await supabase
        .from('daily_photo_cache')
        .select('photo_ids')
        .eq('date', today)
        .single();

      let photoIds: string[] = [];
      
      if (cacheError && cacheError.code !== 'PGRST116') {
        // Real error, not just no rows found
        throw new Error(`Cache error: ${cacheError.message}`);
      }
      
      if (cached) {
        photoIds = cached.photo_ids;
      } else {
        // Generate and persist today's selection directly
        const { data: allPhotos, error: photosError } = await supabase
          .from('photos')
          .select('id')
          .eq('status', 'approved');

        if (photosError) throw new Error(photosError.message);
        if (!allPhotos || allPhotos.length < count) return [];

        const ids = allPhotos.map((p: { id: string }) => p.id);
        // Fisher–Yates
        for (let i = ids.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [ids[i], ids[j]] = [ids[j], ids[i]];
        }
        photoIds = ids.slice(0, count);

        await supabase
          .from('daily_photo_cache')
          .insert({ date: today, photo_ids: photoIds });
        const sevenDaysAgo = new Date(nyDate.getTime() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        await supabase
          .from('daily_photo_cache')
          .delete()
          .lt('date', sevenDaysAgo);
      }

      if (photoIds.length === 0) {
        return [];
      }

      // Get full photo data for the selected IDs
      const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select('id, url, lat, lng, building, floor, added_by, created_at, status')
        .in('id', photoIds)
        .eq('status', 'approved');
      
      if (photosError) throw new Error(photosError.message);
      
      // Return photos in the same order as photoIds
      const orderedPhotos = photoIds.map(id => 
        photos?.find(p => p.id === id)
      ).filter(Boolean);
      
      return orderedPhotos.slice(0, count);
    },
  },
  Mutation: {
    approvePhoto: async (_: unknown, { id, lat, lng }: { id: string, lat: number, lng: number }) => {
      const { data, error } = await supabase
        .from('photos')
        .update({ status: 'approved', lat, lng })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    rejectPhoto: async (_: unknown, { id }: { id: string }) => {
      const { data, error } = await supabase
        .from('photos')
        .update({ status: 'rejected' })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

const handler = startServerAndCreateNextHandler(server);

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}