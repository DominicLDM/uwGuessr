"use client"

// import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function ResultsPage() {
  return (
    <div>
      <h1>Results</h1>
      <div id="map" style={{ width: '100%', height: '400px' }} />
    </div>
  )
}