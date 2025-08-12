import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

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
  type Score {
    uid: String
    day: String
    name: String
    score: Int
    timetaken: Int
  }
  type DailyScore {
    id: ID
    date: String
    name: String
    score: Int
    time_taken: Int
    created_at: String
  }
  type Query {
    photos(status: String): [Photo]
    randomPhotos(count: Int!): [Photo]
    dailyPhotos(count: Int!): [Photo]
    allScores(day: String!): [Score]
  }
  type Mutation {
    approvePhoto(id: ID!, lat: Float!, lng: Float!): Photo
    rejectPhoto(id: ID!): Photo
    addDailyScore(date: String!, name: String!, score: Int!, time_taken: Int!): DailyScore
  }
`;

type DailyScoreRow = {
  id: string | null;
  date: string;
  name: string;
  score: number;
  time_taken: number;
  created_at?: string | null;
};

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
    allScores: async (_: unknown, { day }: { day: string }) => {
      // Get all scores for the given day
      const { data, error } = await supabase
        .from('daily_scores')
        .select('id, date, name, score, time_taken')
        .eq('date', day)
        .order('score', { ascending: false })
        .order('time_taken', { ascending: true });
      if (error) throw new Error(error.message);
      const rows = (data as DailyScoreRow[]) ?? [];
      const mapped = rows.map((row) => ({
        uid: row.id ?? null,
        day: row.date,
        name: row.name,
        score: row.score,
        timetaken: row.time_taken,
      }));
      return mapped;
    },
  },
  Mutation: {
    approvePhoto: async (
      _: unknown,
      { id, lat, lng }: { id: string; lat: number; lng: number },
      ctx: { request: NextRequest }
    ) => {
      // Check for admin email in request headers
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      const email = ctx.request.headers.get('x-admin-email');
      if (!email || email !== adminEmail) throw new Error('Unauthorized');
      const { data, error } = await supabase
        .from('photos')
        .update({ status: 'approved', lat, lng })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    rejectPhoto: async (
      _: unknown,
      { id }: { id: string },
      ctx: { request: NextRequest }
    ) => {
      // Check for admin email in request headers
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      const email = ctx.request.headers.get('x-admin-email');
      if (!email || email !== adminEmail) throw new Error('Unauthorized');
      const { data, error } = await supabase
        .from('photos')
        .update({ status: 'rejected' })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    addDailyScore: async (
      _: unknown,
      { date, name, score, time_taken }: { date: string; name: string; score: number; time_taken: number }
    ) => {
      const safeName = (name || '').toString().slice(0, 50);
      const clampedScore = Math.max(0, Math.min(score, 100000));
      const clampedTime = Math.max(0, Math.min(time_taken, 24 * 60 * 60));

      const { data, error } = await supabase
        .from('daily_scores')
        .insert({ date, name: safeName, score: clampedScore, time_taken: clampedTime })
        .select()
        .single();

      if (error) throw new Error(error.message);
      const row = data as DailyScoreRow;
      return {
        id: row?.id ?? null,
        date: row?.date ?? date,
        name: row?.name ?? safeName,
        score: row?.score ?? clampedScore,
        time_taken: row?.time_taken ?? clampedTime,
        created_at: row?.created_at ?? null,
      };
    },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

const handler = startServerAndCreateNextHandler(server, {
  context: async (request: NextRequest) => ({ request }),
});

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

export async function POST(request: NextRequest) {
  const cl = request.headers.get('content-length');
  if (cl && Number(cl) > 100_000) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }
  return handler(request);
}