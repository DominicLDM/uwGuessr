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
      // Placeholder for daily photos - same as random for now
      const { data, error } = await supabase
        .from('photos')
        .select('id, url, lat, lng')
        .eq('status', 'approved')
        .limit(count);
      
      if (error) throw new Error(error.message);
      return data || [];
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