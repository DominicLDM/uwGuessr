"use client"

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { campusBoundaries } from './campusBoundaries';

import type { FeatureCollection } from 'geojson';

if (campusBoundaries && campusBoundaries.type !== "FeatureCollection") {
    (campusBoundaries as FeatureCollection).type = "FeatureCollection";
}

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

interface GameMapProps {
  onPlaceGuess: (lat: number, lng: number) => void
  onSubmitGuess?: () => void
  userGuess: { lat: number; lng: number } | null
  disabled?: boolean
  imageWidth?: number
  onToggleMapDetail?: () => void
  mapDetail?: 'high' | 'low'
}

export default function GameMap({ 
  onPlaceGuess, 
  userGuess, 
  disabled = false,
  mapDetail: externalMapDetail,
}: GameMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const initializingRef = useRef(false) // Prevent double initialization
  const currentMapDetailRef = useRef<'high' | 'low'>('high') // Track current map detail to prevent unnecessary changes
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapFullyReady, setMapFullyReady] = useState(false)
  const mapDetail = externalMapDetail

  // Initialize map once and keep it
  useEffect(() => {
    if (!mapContainer.current || mapRef.current || initializingRef.current) {
      return
    }

    initializingRef.current = true

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/standard',
      center: [-80.5460, 43.4703], // UW coordinates
      zoom: 16,
      pitch: 0,
      bearing: -20,
      antialias: false,
      fadeDuration: 0,
      maxTileCacheSize: 50, // Reduce tile cache for faster initial load
    })

    // Wait for map to load and show it quickly
    map.on('load', () => {
      // Add the campus boundaries source
      map.addSource('campus-boundaries', {
          'type': 'geojson',
          'data': campusBoundaries as GeoJSON.FeatureCollection
      });

      // Add the boundary line layer (bold yellow outline)
      map.addLayer({
          'id': 'campus-boundary-line',
          'type': 'line',
          'source': 'campus-boundaries',
          'layout': {},
          'paint': {
              'line-color': '#EAB308',
              'line-width': 4,
              'line-opacity': 0.9
          }
      });

      map.addLayer({
          'id': 'campus-boundary-fill',
          'type': 'fill',
          'source': 'campus-boundaries',
          'layout': {},
          'paint': {
              'fill-color': '#EAB308', 
              'fill-opacity': 0.01
          }
      }, 'campus-boundary-line'); // Add below the line layer

      setMapLoaded(true)
      // Show map after a short delay to ensure initial render
      setTimeout(() => {
        setMapFullyReady(true)
      }, 100)
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
      // Reset states on cleanup
      setMapLoaded(false)
      setMapFullyReady(false)
      initializingRef.current = false
      currentMapDetailRef.current = 'high'
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

  // Handle map resize when container changes (debounced via rAF)
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      const map = mapRef.current
      let start: number | null = null
      let rafId: number | null = null

      const animateResize = (ts: number) => {
        if (!start) start = ts
        // Run for ~300ms
        if (ts - start < 300) {
          map.resize()
          rafId = requestAnimationFrame(animateResize)
        } else {
          map.resize()
        }
      }

      map.resize()
      rafId = requestAnimationFrame(animateResize)

      return () => {
        if (rafId) cancelAnimationFrame(rafId)
      }
    }
  }, [mapLoaded])

  // Handle map style change after map is loaded
  useEffect(() => {
    if (mapRef.current && mapLoaded && mapDetail) {
      // Skip if we're already using the requested detail level
      if (currentMapDetailRef.current === mapDetail) {
        return;
      }

      const style = mapDetail === 'high' ? 'mapbox://styles/mapbox/standard' : 'mapbox://styles/mapbox/streets-v12';
      
      currentMapDetailRef.current = mapDetail;
      
      // Hide map during style change
      setMapFullyReady(false);
      mapRef.current.setStyle(style);
      
      // Wait for the new style to load completely
      mapRef.current.once('idle', () => {
        setTimeout(() => {
          setMapFullyReady(true);
        }, 150);
      });
    }
  }, [mapDetail, mapLoaded])

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
  <div 
    className={`
    absolute inset-0 w-full h-full z-0
    flex flex-col
    transition-all duration-100 ease-in-out
      ${disabled ? 'opacity-50' : ''}
    `}
  >
    {/* Map Container */}
    <div 
      className={`
        w-full h-full
        relative overflow-hidden
        bg-gray-200
      `}
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      {/* Loading overlay */}
      <div className={`
        absolute inset-0 bg-gray-200 flex items-center justify-center
        transition-opacity duration-200
        ${mapFullyReady ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        z-30
      `}>
        <div className={`text-gray-500 text-lg ml-96`}>Loading map...</div>
      </div>
      
      {/* Actual Map */}
      <div 
        ref={mapContainer}
        className={`
          absolute inset-0
          ${disabled ? 'cursor-not-allowed' : 'cursor-crosshair'}
          z-10 bg-gray-100
          transition-opacity duration-400 ease-out
          ${mapFullyReady ? 'opacity-100' : 'opacity-0'}
        `}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  </div>
)
}
