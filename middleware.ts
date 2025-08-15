import { NextRequest, NextResponse } from 'next/server';

const rateLimit = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(clientIP: string): boolean {
  const key = `daily_${clientIP}`;
  const now = Date.now();
  
  const current = rateLimit.get(key);
  
  if (!current || now > current.resetTime) {
    // First request or window expired - reset to 1 request
    rateLimit.set(key, { count: 1, resetTime: now + 60 * 1000 }); // 1 minute for testing
    console.log(`Rate limit: First request for IP ${clientIP}`);
    return false;
  }

  current.count++;
  rateLimit.set(key, current);
  
  console.log(`Rate limit: Request ${current.count} for IP ${clientIP}`);
  
  return current.count > 2; // Allow only 2 requests per minute for testing
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (pathname !== '/api/graphql') {
    return NextResponse.next();
  }
  
  // Just log GraphQL requests for debugging
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  
  console.log(`Middleware: GraphQL request from IP ${clientIP} - ${request.method}`);
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/graphql'
  ],
};
