"use client"


import Image from "next/image"
import React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useApolloClient, gql } from '@apollo/client'
import { Button } from "@/components/ui/button"
// import { Card, CardContent } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
import { Play, Calendar, Bird } from "lucide-react"
import Link from "next/link"
import TopoBackground from "@/components/TopoBackground"

// GraphQL queries for prewarming
const GET_RANDOM_PHOTOS = gql`
query GetRandomPhotos($count: Int!) {
        randomPhotos(count: $count) {
        id
        url
        lat
        lng
        building
        floor
        added_by
        created_at
        status
        }
}
`;

const GET_DAILY_PHOTOS = gql`
query GetDailyPhotos($count: Int!) {
        dailyPhotos(count: $count) {
        id
        url
        lat
        lng
        building
        floor
        added_by
        created_at
        status
        }
}
`;

// Lightweight ping query to wake up GraphQL server
const PING_QUERY = gql`
  query Ping {
    __typename
  }
`;

export default function Component() {
  const [isGooseMode, setIsGooseMode] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const router = useRouter()
  const client = useApolloClient()

  // Prewarm GraphQL connection when homepage loads
  useEffect(() => {
    // Warm up the connection with a ping
    client.query({ 
      query: PING_QUERY,
      fetchPolicy: 'no-cache'
    }).catch(err => console.log('Homepage ping failed:', err));

    // Prefetch both query types to warm up the cache and server
    client.query({
      query: GET_RANDOM_PHOTOS,
      variables: { count: 5 },
      fetchPolicy: 'cache-first'
    }).catch(err => console.log('Random photos prefetch failed:', err));

    client.query({
      query: GET_DAILY_PHOTOS,
      variables: { count: 5 },
      fetchPolicy: 'cache-first'
    }).catch(err => console.log('Daily photos prefetch failed:', err));
  }, [client]);

  const handleNavigation = (path: string) => {
    setIsNavigating(true)
    
    // If navigating to play page, set fresh start flag and evict cache
    if (path.startsWith('/play/')) {
      sessionStorage.setItem('uwGuessrFreshStart', 'true')
      // Evict both random and daily photos to ensure fresh data
      client.cache.evict({ fieldName: "randomPhotos" });
      client.cache.evict({ fieldName: "dailyPhotos" });
    }
    
    router.push(path)
  }

  return (
    <>
      {/* Main Content */}
      <div 
        className="relative min-h-svh flex flex-col text-slate-900" 
        style={{ backgroundColor: "hsla(46, 86%, 99.5%, 1.00)" }}
      >
      {/* Prevent layout shift during font loading */}
      <style jsx>{`
        h1 {
          font-display: swap;
          text-rendering: optimizeLegibility;
        }
      `}</style>
      
      {/* Enhanced Animated Topographical Background */}
      <TopoBackground />
      {/* Header - Empty for clean look */}
      <header className="p-6 md:p-8"></header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center flex-1 px-6">
        {/* Logo Section */}
        <div className="text-center mb-8 relative z-10">
          <div className="relative inline-block">
            <h1 className="text-[4.3rem] md:text-[7rem] font-black tracking-tight -mb-4 md:-mb-7 flex items-center justify-center">
              <span className="text-yellow-500 mr-0.5">uw</span>
              <span className="text-black flex items-center">
                {isGooseMode ? (
                  <>
                    <img 
                      src="/G.svg" 
                      alt="G" 
                      className="inline-block align-middle md:w-[96px] md:h-[96px] w-[54px] h-[54px]"
                      width="96"
                      height="96"
                    />eesr
                  </>
                ) : (
                  <>
                    <img 
                      src="/G.svg" 
                      alt="G" 
                      className="inline-block align-middle md:w-[96px] md:h-[96px] w-[54px] h-[54px]"
                      width="96"
                      height="96"
                    />uessr
                  </>
                )}
              </span>
            </h1>
          </div>

          <div className="relative w-[250px] h-[50px] md:w-[350px] md:h-[70px] mx-auto mb-5">
            <Image
              src="/underline.png"
              alt="Brush stroke underline"
              fill
              className="object-contain"
              priority
              aria-hidden="true"
              sizes="(max-width: 768px) 250px, 350px"
            />
          </div>

          <p className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed text-slate-900">
            Get ready to explore the &apos;Loo!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 relative z-10">
          <Button
            size="lg"
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-8 py-3 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handleNavigation("/play/random")}
            disabled={isNavigating}
          >
            <Play className="mr-2 h-5 w-5" />
            Start Playing
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="font-semibold px-8 py-3 text-lg rounded-xl border-2 border-black text-yellow-500 hover:bg-black hover:shadow-xl hover:text-yellow-500 transition-all duration-300 hover:scale-105 bg-black cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handleNavigation("/play/daily")}
            disabled={isNavigating}
          >
            <Calendar className="mr-2 h-5 w-5" />
            Daily Challenge
          </Button>
        </div>
        {/* Stats Section */}
        {/* <Card className="w-full max-w-sm transition-all duration-500 bg-white/90 border-black-200 backdrop-blur-4px relative z-5 shadow-lg hover:shadow-xl">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {React.createElement(stats[currentStat].icon, {
                  className: "w-6 h-6 text-yellow-500 mr-2",
                })}
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30 text-xs">
                  Live Stats
                </Badge>
              </div>
              <div className="text-3xl font-bold text-black-600 mb-1">{stats[currentStat].value}</div>
              <div className="text-sm text-slate-700">{stats[currentStat].label}</div>
            </div>
          </CardContent>
        </Card> */}
      </main>

      {/* Footer */}
      <footer className="py-6 px-6 text-center relative z-10">
        <div className="flex justify-center gap-8 mb-4 text-sm">
          <Link href="#" className="text-slate-900 hover:text-yellow-500 transition-colors">
            About
          </Link>
          <Link href="https://www.instagram.com/dom_ldm/" className="text-slate-900 hover:text-yellow-500 transition-colors">
            Contact
          </Link>
          <Link href="#" className="text-slate-900 hover:text-yellow-500 transition-colors" onClick={() => window.location.href = "/upload"}>
            Submit Photos
          </Link>
          <button
            onClick={() => setIsGooseMode(!isGooseMode)}
            className="text-slate-900 hover:text-yellow-500 transition-colors"
            title="Goose Mode"
          >
            <Bird className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-slate-600">
          © 2025 {isGooseMode ? "uwGeesr" : "uwGuessr"}. Made with ❤️ and Slushies.
        </p>
      </footer>
      </div>
    </>
  )
}
