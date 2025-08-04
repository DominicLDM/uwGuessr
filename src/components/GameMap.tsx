"use client"

import { useEffect, useRef, useState } from 'react'
// import { useGameState } from '@/hooks/useGameState'
import mapboxgl from 'mapbox-gl'

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
  const [collapseTimeout, setCollapseTimeout] = useState<NodeJS.Timeout | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/standard',
      center: [-80.5417, 43.4723], // UW coordinates
      zoom: 16,
      pitch: 0,
      bearing: -20,
      antialias: true,
    })

    // Wait for map to fully load before showing
    map.on('load', () => {
      console.log('Map loaded successfully')
      setMapLoaded(true)
    })

    map.on('error', (e) => {
      console.error('Map error:', e)
    })

    // Handle map clicks
    map.on('click', (e) => {
      if (disabled) return
      
      const { lat, lng } = e.lngLat
      
      // Remove existing marker
      if (markerRef.current) {
        markerRef.current.remove()
      }
      
      // Create new marker
      const newMarker = new mapboxgl.Marker({ color: 'red' })
        .setLngLat([lng, lat])
        .addTo(map)
      
      markerRef.current = newMarker
      onPlaceGuess(lat, lng)
    })

    mapRef.current = map

    return () => {
      console.log('Cleaning up map')
      map.remove()
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
    if (!mapRef.current || !userGuess) return

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove()
    }

    // Create new marker at userGuess location
    const marker = new mapboxgl.Marker({ color: 'red' })
      .setLngLat([userGuess.lng, userGuess.lat])
      .addTo(mapRef.current)

    markerRef.current = marker
  }, [userGuess])

  // Handle delayed collapse
  const handleMouseEnter = () => {
    if (collapseTimeout) {
      clearTimeout(collapseTimeout)
      setCollapseTimeout(null)
    }
    if (!isExpanded) {
      onToggleExpanded()
    }
  }

  const handleMouseLeave = () => {
    if (isExpanded) {
      const timeout = setTimeout(() => {
        onToggleExpanded()
      }, 500) // 500ms delay
      setCollapseTimeout(timeout)
    }
  }

return (
  <div 
    className={`
      absolute bottom-8 right-8 z-10 
      flex flex-col
      transition-all duration-300 ease-in-out
      ${disabled ? 'opacity-50' : ''}
    `}
    onMouseEnter={handleMouseEnter}
    onMouseLeave={handleMouseLeave}
  >
    {/* Map Container */}
    <div 
      className={`
        border-4 border-black rounded-xl shadow-2xl
        transition-all duration-300 ease-in-out
        ${isExpanded ? 'w-160 h-128' : 'w-80 h-64'}
        relative overflow-hidden
        bg-gray-200
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

      {/* Expand/Collapse indicator */}
      <div className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded text-xs pointer-events-none z-30">
        {isExpanded ? '📍' : '🗺️'}
      </div>
    </div>

    {/* Submit Button */}
    <div className={`
      mt-2 rounded-xl shadow-2xl border-4 border-black
      transition-all duration-300 ease-in-out
      ${isExpanded ? 'w-160' : 'w-80'}
      ${userGuess ? 'bg-yellow-400' : 'bg-gray-300'}
    `}>
      <button
        onClick={onSubmitGuess}
        disabled={!userGuess}
        className={`
          w-full py-1 px-6 rounded-lg font-bold text-md
          transition-all duration-200 border-2 border-black
          ${userGuess 
            ? 'bg-yellow-400 hover:bg-yellow-500 text-black cursor-pointer' 
            : 'bg-gray-400 text-gray-600 cursor-not-allowed'
          }
        `}
      >
        {userGuess ? 'Submit Guess!' : 'Make a guess'}
      </button>
    </div>
  </div>
)
}
