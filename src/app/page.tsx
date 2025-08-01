"use client"


import Image from "next/image"
import React from "react"

import { useState, /* useEffect */ } from "react"
import { Button } from "@/components/ui/button"
// import { Card, CardContent } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
import { Play, Calendar, Bird } from "lucide-react"
import Link from "next/link"
import TopoBackground from "@/components/TopoBackground"

export default function Component() {
  const [isGooseMode, setIsGooseMode] = useState(false)

  return (
    <div className="relative min-h-svh flex flex-col text-slate-900" style={{ backgroundColor: "hsla(46, 86%, 99.5%, 1.00)" }}>
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
                    <img src="/G.svg" alt="G" className="inline-block align-middle md:w-[96px] md:h-[96px] w-[54px] h-[54px]" />eesr
                  </>
                ) : (
                  <>
                    <img src="/G.svg" alt="G" className="inline-block align-middle md:w-[96px] md:h-[96px] w-[54px] h-[54px]" />uessr
                  </>
                )}
              </span>
            </h1>
          </div>

          <div className="flex justify-center mb-5">
            <Image
              src="/underline.png"
              alt="Brush stroke underline"
              width={350}
              height={70}
              className="block mx-auto md:w-[350px] md:h-[70px] w-[250px] h-[50px]"
              style={{
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.1)) blur(0.3px)'
              }}
              aria-hidden="true"
              priority
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
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-8 py-3 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
            onClick={() => window.location.href = "/play/random"}
          >
            <Play className="mr-2 h-5 w-5" />
            Start Playing
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="font-semibold px-8 py-3 text-lg rounded-xl border-2 border-black text-yellow-500 hover:bg-black hover:shadow-xl hover:text-yellow-500 transition-all duration-300 hover:scale-105 bg-black cursor-pointer"
            onClick={() => window.location.href = "/play/daily"}
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
  )
}
