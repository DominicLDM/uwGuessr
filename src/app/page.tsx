"use client"

import React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Calendar, Trophy, Users, MapPin, Bird } from "lucide-react"
import Link from "next/link"

export default function Component() {
  const [mounted, setMounted] = useState(false)
  const [currentStat, setCurrentStat] = useState(0)
  const [isGooseMode, setIsGooseMode] = useState(false)

  const stats = [
    { label: "Players", value: "2,847", icon: Users },
    { label: "Games Played", value: "15,293", icon: Play },
    { label: "Locations", value: "500+", icon: MapPin },
    { label: "Champions", value: "127", icon: Trophy },
  ]

  useEffect(() => {
    setMounted(true)
    const interval = setInterval(() => {
      setCurrentStat((prev) => (prev + 1) % stats.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen flex flex-col text-slate-900" style = {{ backgroundColor : "#FFFFF7" }}>
      {/* Header - Empty for clean look */}
      <header className="p-6 md:p-8"></header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center flex-1 px-6">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-3">
              <span className="text-yellow-500">uw</span>
              <span className="text-slate-900">{isGooseMode ? "Geesr" : "Guessr"}</span>
            </h1>
          </div>

          <div className="flex justify-center mb-6">
            <div className="h-1 w-24 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full" />
          </div>

          <p className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed text-slate-600">
            Get ready to explore the &apos;Loo!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Button
            size="lg"
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-8 py-3 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <Play className="mr-2 h-5 w-5" />
            Start Playing
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="font-semibold px-8 py-3 text-lg rounded-xl border-2 border-yellow-600 text-yellow-600 hover:bg-yellow-600 hover:text-white transition-all duration-300 hover:scale-105 bg-transparent"
          >
            <Calendar className="mr-2 h-5 w-5" />
            Daily Challenge
          </Button>
        </div>

        {/* Stats Section */}
        <Card className="w-full max-w-sm transition-all duration-500 bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {React.createElement(stats[currentStat].icon, {
                  className: "w-5 h-5 text-yellow-600 mr-2",
                })}
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30 text-xs">
                  Live Stats
                </Badge>
              </div>
              <div className="text-2xl font-bold text-yellow-600 mb-1">{stats[currentStat].value}</div>
              <div className="text-sm text-slate-700">{stats[currentStat].label}</div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="py-6 px-6 text-center">
        <div className="flex justify-center gap-8 mb-4 text-sm">
          <Link href="#" className="text-slate-900 hover:text-yellow-500 transition-colors">
            About
          </Link>
          <Link href="#" className="text-slate-900 hover:text-yellow-500 transition-colors">
            Contact
          </Link>
          <Link href="#" className="text-slate-900 hover:text-yellow-500 transition-colors">
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
          © 2025 {isGooseMode ? "uwGoosr" : "uwGuessr"}. Made with ❤️ and Slushies.
        </p>
      </footer>
    </div>
  )
}
