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
  const [showAbout, setShowAbout] = useState(false)
  const [isAboutAnimating, setIsAboutAnimating] = useState(false)
  const router = useRouter()
  const client = useApolloClient()

  // Prewarm GraphQL connection when homepage loads
  useEffect(() => {
    // Clean up old daily data (older than 7 days)
    const cleanupOldDailyData = () => {
      const today = new Date();
      const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('uwGuessrDaily_') || key.startsWith('uwGuessrDailyProgress_'))) {
          // Extract date from key (format: uwGuessrDaily_2025-01-15 or uwGuessrDailyProgress_2025-01-15)
          const dateStr = key.split('_')[1];
          if (dateStr) {
            const keyDate = new Date(dateStr);
            if (keyDate < oneWeekAgo) {
              localStorage.removeItem(key);
            }
          }
        }
      }
    };
    
    cleanupOldDailyData();

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
    
    // Check for daily challenge completion before navigation
    if (path === '/play/daily') {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if they've already completed today's challenge
      const dailyCompleted = localStorage.getItem(`uwGuessrDaily_${today}`);
      if (dailyCompleted) {
        // Already completed today's challenge, redirect to results immediately
        sessionStorage.setItem('uwGuessrDailyResults', dailyCompleted);
        router.push('/results');
        return;
      }
      
      // Check if they have partial progress on today's challenge
      const dailyProgress = localStorage.getItem(`uwGuessrDailyProgress_${today}`);
      if (dailyProgress) {
        // They've started today's challenge, continue from where they left off
        sessionStorage.setItem('uwGuessrCurrentGame', dailyProgress);
        router.push(path);
        return;
      } else {
        // Starting fresh daily challenge
        sessionStorage.setItem('uwGuessrFreshStart', 'true');
        // Evict cache for fresh daily photos
        client.cache.evict({ fieldName: "dailyPhotos" });
      }
    } else if (path.startsWith('/play/')) {
      // For non-daily play modes, always start fresh
      sessionStorage.setItem('uwGuessrFreshStart', 'true')
      // Evict random photos cache
      client.cache.evict({ fieldName: "randomPhotos" });
    }
    
    router.push(path)
  }

  const handleShowAbout = () => {
    setShowAbout(true)
    // Use requestAnimationFrame for smoother animation
    requestAnimationFrame(() => {
      setIsAboutAnimating(true)
    })
  }

  const handleCloseAbout = () => {
    setIsAboutAnimating(false)
    setTimeout(() => setShowAbout(false), 200) // Reduced timeout
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
          <button onClick={handleShowAbout} className="text-slate-900 hover:text-yellow-500 transition-colors">
            About
          </button>
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

      {/* About Modal */}
      {showAbout && (
        <div 
          className={`fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4 transition-opacity duration-200 ease-out ${
            isAboutAnimating ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={handleCloseAbout}
        >
          <div 
            className={`bg-white rounded-2xl sm:rounded-3xl border-3 sm:border-4 border-black shadow-2xl max-w-sm sm:max-w-md md:max-w-lg w-full transition-all duration-200 ease-out ${
              isAboutAnimating ? 'scale-100' : 'scale-95'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-3 sm:p-4 pb-2 sm:pb-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-black">
                  About <span className="text-yellow-500">uw</span>{isGooseMode ? "Geesr" : "Guessr"}
                </h2>
                <button
                  onClick={handleCloseAbout}
                  className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 cursor-pointer rounded-full hover:text-yellow-500 flex items-center justify-center transition-colors text-sm sm:text-base md:text-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 text-xs sm:text-sm">
              <p className="text-gray-800 leading-relaxed">
                <span className="font-semibold text-yellow-500">uw</span><span className="font-semibold">Guessr</span> is a geography guessing game where you explore the University of Waterloo campus.
              </p>
              
              <p className="text-gray-700 leading-relaxed">
                Inspired by <span className="text-blue-500 font-semibold">Geoguessr</span> and <span className="text-red-400 font-semibold">Timeguessr</span>, this game challenges you to identify locations around campus based on photos submitted by the community.
              </p>

              <div className="space-y-1 sm:space-y-2">
                <h3 className="font-semibold text-black">How to Play</h3>
                <ul className="text-gray-700 space-y-0.5 sm:space-y-1 ml-3 sm:ml-4">
                  <li>• View a photo from somewhere on campus</li>
                  <li>• Click on the map where you think it was taken</li>
                  <li>• Earn points based on your accuracy</li>
                </ul>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <h3 className="font-semibold text-black">User Content</h3>
                <p className="text-gray-700">
                  Photos are submitted by community members who retain ownership of their images. By uploading content, users grant <span className="font-semibold"><span className="text-yellow-500">uw</span>Guessr</span> permission to display their photos within the game for educational and entertainment purposes.
                </p>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <h3 className="font-semibold text-black">Brand Usage</h3>
                <p className="text-gray-700">
                  This is an unofficial, fan-made project created for educational purposes. Any use of University of Waterloo branding or references is purely for identification and educational context, and is not intended to imply endorsement or official affiliation.
                </p>
              </div>

              {/* Footer */}
              <div className="pt-2 sm:pt-3 mt-3 sm:mt-4 border-t border-gray-200 text-center">
                Made by{" "}
                <a
                  href="https://www.linkedin.com/in/dominic-ldm/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-800 hover:underline font-medium transition-colors cursor-pointer"
                >
                  Dominic
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}
