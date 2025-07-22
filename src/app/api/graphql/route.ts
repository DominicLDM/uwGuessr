
import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { createClient } from '@supabase/supabase-js';

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
  }
  type Mutation {
    approvePhoto(id: ID!, lat: Float!, lng: Float!): Photo
    rejectPhoto(id: ID!): Photo
  }
`;

const resolvers = {
  Query: {
    photos: async (_: {}, { status }: { status?: string }) => {
      let query = supabase.from('photos').select('*');
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    },
  },
  Mutation: {
    approvePhoto: async (_: {}, { id, lat, lng }: { id: string, lat: number, lng: number }) => {
      const { data, error } = await supabase
        .from('photos')
        .update({ status: 'approved', lat, lng })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    rejectPhoto: async (_: {}, { id }: { id: string }) => {
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

export const GET = startServerAndCreateNextHandler(server);
export const POST = startServerAndCreateNextHandler(server);
