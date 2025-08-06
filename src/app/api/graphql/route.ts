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
      // Get all approved photos and shuffle them
      const { data, error } = await supabase
        .from('photos')
        .select('id, url, lat, lng')
        .eq('status', 'approved');
      
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) return [];
      
      // Shuffle the array and take the first 'count' items
      const shuffled = data.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    },
    dailyPhotos: async (_: unknown, { count }: { count: number }) => {
      const today = new Date().toISOString().split('T')[0];
      
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
        // Use cached photo IDs
        photoIds = cached.photo_ids;
      } else {
        // No cached photos, generate them by calling the API
        try {
          const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/generate-daily`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to generate daily photos: ${response.statusText}`);
          }
          
          const result = await response.json();
          photoIds = result.photoIds || [];
        } catch (error) {
          console.error('Failed to generate daily photos:', error);
          // Fallback to random photos if daily generation fails
          const { data, error: fallbackError } = await supabase
            .from('photos')
            .select('id')
            .eq('status', 'approved')
            .limit(count);
          
          if (fallbackError) throw new Error(fallbackError.message);
          photoIds = (data || []).map((p: { id: string }) => p.id);
        }
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