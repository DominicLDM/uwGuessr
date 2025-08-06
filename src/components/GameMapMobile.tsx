"use client"

import { useEffect, useRef, useState } from 'react'
// import { useGameState } from '@/hooks/useGameState'
import mapboxgl from 'mapbox-gl'
import { ChevronUp, X } from 'lucide-react'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

interface GameMapProps {
  onPlaceGuess: (lat: number, lng: number) => void
  onSubmitGuess?: () => void
  userGuess: { lat: number; lng: number } | null
  isExpanded: boolean
  onToggleExpanded: () => void
  disabled?: boolean
  showSubmitButton?: boolean
}

export default function GameMap({ 
  onPlaceGuess, 
  onSubmitGuess,
  userGuess, 
  isExpanded, 
  onToggleExpanded,
  disabled = false,
}: GameMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const initializingRef = useRef(false) // Prevent double initialization
  const [mapLoaded, setMapLoaded] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current || initializingRef.current) {
      return
    }

    initializingRef.current = true

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/standard',
      center: [-80.5417, 43.4723], // UW coordinates
      zoom: 16,
      pitch: 0,
      bearing: -20,
      antialias: false,
    })

    // Wait for map to fully load before showing
    map.on('load', () => {
      setMapLoaded(true)
    })

    map.on('error', (e) => {
      console.error('Map error:', e)
    })

    mapRef.current = map

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      initializingRef.current = false
    }
  }, []) // Only initialize once

  useEffect(() => {
    if (!mapRef.current) return

    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      if (disabled) return
      
      const { lat, lng } = e.lngLat
      
      // Remove existing marker
      if (markerRef.current) {
        markerRef.current.remove()
      }
      
      // Create new marker
      const newMarker = new mapboxgl.Marker({ color: 'red' })
        .setLngLat([lng, lat])
        .addTo(mapRef.current!)
      
      markerRef.current = newMarker
      onPlaceGuess(lat, lng)
    }

    mapRef.current.on('click', handleMapClick)

    return () => {
      if (mapRef.current) {
        mapRef.current.off('click', handleMapClick)
      }
    }
  }, [disabled, onPlaceGuess])

  // Handle map resize when container changes
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      const map = mapRef.current
      
      // Resize immediately
      map.resize()
      
      // Resize every 5ms during the transition
      const resizePoints = []
      for (let i = 5; i <= 350; i += 5) {
        resizePoints.push(i)
      }
      
      const timeouts = resizePoints.map(delay => 
        setTimeout(() => {
          if (map) {
            map.resize()
          }
        }, delay)
      )
      
      return () => {
        timeouts.forEach(timeout => clearTimeout(timeout))
      }
    }
  }, [isExpanded, mapLoaded])

  // Handle userGuess prop changes
  useEffect(() => {
    if (!mapRef.current) return

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }

    // Create new marker at userGuess location if userGuess exists
    if (userGuess) {
      const marker = new mapboxgl.Marker({ color: 'red' })
        .setLngLat([userGuess.lng, userGuess.lat])
        .addTo(mapRef.current)

      markerRef.current = marker
    }
  }, [userGuess])

return (
  <>
    {/* Show Map Button - Only visible when map is closed */}
    {!isExpanded && (
      <div 
        className={`
          fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30
          ${disabled ? 'opacity-50' : ''}
        `}
      >
        <button
          className="w-[95vw] max-w-md mx-auto px-0 py-2.5 rounded-xl font-bold text-lg bg-yellow-400 hover:bg-yellow-500 text-black border-4 border-black shadow-lg transition-all duration-200 flex items-center justify-center"
          onClick={onToggleExpanded}
        >
          <ChevronUp className="w-6 h-6 mr-2" />
          Show Map
        </button>
      </div>
    )}
    
    {/* Slide-up Map Container */}
    {isExpanded && (
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onToggleExpanded}
      />
    )}
    
    <div
      className={`
        fixed left-0 bottom-0 w-full z-50
        transition-all duration-300
        ${isExpanded ? 'h-[60vh] opacity-100' : 'h-0 opacity-0 pointer-events-none'}
        bg-gray-200
        rounded-t-xl
        shadow-2xl
        overflow-hidden
      `}
    >
      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center z-20">
          <div className="text-gray-500 text-sm">Loading map...</div>
        </div>
      )}
      
      {/* Actual Map */}
      <div 
        ref={mapContainer}
        className={`
          absolute inset-0
          ${disabled ? 'cursor-not-allowed' : 'cursor-crosshair'}
          z-10
        `}
        style={{
          width: '100%',
          height: '100%',
        }}
      />

      {/* Close Button - Bottom Left */}
      <button
        onClick={onToggleExpanded}
        className="absolute bottom-4 left-4 z-50 bg-black/80 hover:bg-red-600 text-white rounded-full p-3 border-2 border-white shadow-lg transition-all duration-200"
      >
        <X className="w-7 h-7" />
      </button>

      {/* Submit Button - Bottom Right (only when guess is placed) */}
      {userGuess && (
        <button
          onClick={() => {
            onSubmitGuess?.();
            onToggleExpanded();
          }}
          className="absolute bottom-4 right-4 z-50 bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2.5 rounded-xl font-bold text-xl border-4 border-black shadow-lg transition-all duration-200"
        >
          Submit Guess!
        </button>
      )}

      {/* Instruction text when no guess is placed */}
      {!userGuess && (
        <div className="absolute bottom-4 right-4 z-50 bg-black/80 text-white px-4 py-2.5 rounded-xl text-xl">
          Tap to place your guess
        </div>
      )}
    </div>
  </>
)
}
