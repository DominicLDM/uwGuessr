"use client"

import { useEffect, useRef, useState } from 'react'
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
  imageWidth?: number
}

export default function GameMap({ 
  onPlaceGuess, 
  onSubmitGuess,
  userGuess, 
  isExpanded, 
  onToggleExpanded,
  disabled = false,
  imageWidth = 600, // Default fallback
}: GameMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const [collapseTimeout, setCollapseTimeout] = useState<NodeJS.Timeout | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapDetail, setMapDetail] = useState<'high' | 'low'>('high')
  const [styleChanged, setStyleChanged] = useState(false)

  // Initialize map once and keep it
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

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

    mapRef.current = map

    return () => {
      console.log('Cleaning up map')
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
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

  // Handle map style change after map is loaded (only when user changes it)
  useEffect(() => {
    if (mapRef.current && mapLoaded && styleChanged) {
      const style = mapDetail === 'high' ? 'mapbox://styles/mapbox/standard' : 'mapbox://styles/mapbox/streets-v12';
      console.log('Changing map style to:', mapDetail);
      mapRef.current.setStyle(style);
    }
  }, [mapDetail, mapLoaded, styleChanged])

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

  // Calculate available space based on actual image width
  const getExpandedWidth = () => {
    if (!isExpanded) return '20rem'
    
    const availableSpace = window.innerWidth - (imageWidth + 80 + 64) // imageWidth + margins + padding (4rem = 64px)
    const minDesiredWidth = 600 // Minimum width for good aspect ratio
    
    if (availableSpace < minDesiredWidth) {
      // If not enough space, expand to a larger fixed size that might overlap slightly
      return `${minDesiredWidth}px`
    }
    
    return `calc(100vw - ${imageWidth + 80}px - 4rem)`
  }

  // Calculate a proportional height that maintains good aspect ratio
  const getExpandedHeight = () => {
    if (!isExpanded) return '16rem'
    
    const availableSpace = window.innerWidth - (imageWidth + 80 + 64)
    const mapWidth = availableSpace < 600 ? 600 : availableSpace
    
    const aspectRatioHeight = mapWidth * 0.75 // 4:3 ratio
    const maxReasonableHeight = window.innerHeight * 0.67 // Max 6 7 *hands*
    const minHeight = 400 // Minimum useful height
    
    const calculatedHeight = Math.min(aspectRatioHeight, maxReasonableHeight)
    return `${Math.max(calculatedHeight, minHeight)}px`
  }

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
        relative overflow-hidden
        bg-gray-200
      `}
      style={{
        width: getExpandedWidth(),
        height: isExpanded ? getExpandedHeight() : '16rem',
        maxWidth: isExpanded ? 'none' : getExpandedWidth(), // Remove maxWidth constraint when expanded
        maxHeight: isExpanded ? 'none' : '16rem', // Remove maxHeight constraint when expanded
        minWidth: isExpanded ? '600px' : '20rem', // Ensure good aspect ratio
        minHeight: isExpanded ? '400px' : '16rem', // Ensure minimum usable height
      }}
    >
      {/* Loading overlay */}
      <div className={`
        absolute inset-0 bg-gray-200 flex items-center justify-center
        transition-opacity duration-300
        ${mapLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        z-20
      `}>
        <div className="text-gray-500 text-sm">Loading map...</div>
      </div>
      
      {/* Actual Map */}
      <div 
        ref={mapContainer}
        className={`
          absolute inset-0
          ${disabled ? 'cursor-not-allowed' : 'cursor-crosshair'}
          z-10 bg-gray-100
        `}
        style={{
          width: '100%',
          height: '100%',
        }}
      />

      {/* Change quality */}
      <button 
      onClick={() => {
        setMapDetail(mapDetail === 'high' ? 'low' : 'high');
        setStyleChanged(true);
      }} 
        className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded text-xs hover:bg-black/90 cursor-pointer z-30"
      style={{ pointerEvents: 'auto' }}>
        {mapDetail === 'high' ? '3D' : '2D'}
      </button>
    </div>

    {/* Submit Button */}
    <div 
      className={`
        mt-2 rounded-xl shadow-2xl border-4 border-black
        transition-all duration-300 ease-in-out
        ${userGuess ? 'bg-yellow-400' : 'bg-gray-300'}
      `}
      style={{
        width: getExpandedWidth(),
        maxWidth: isExpanded ? 'none' : getExpandedWidth(), // Remove maxWidth constraint when expanded  
        minWidth: isExpanded ? '600px' : '20rem', // Ensure good aspect ratio
      }}
    >
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
