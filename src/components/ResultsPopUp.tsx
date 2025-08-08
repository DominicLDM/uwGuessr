"use client"

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import mapboxgl from 'mapbox-gl';

// Mapbox token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface ResultsPopUpProps {
  showResults: boolean;
  userGuess: { lat: number; lng: number } | null;
  actualLocation: { lat: number; lng: number };
  distance: number;
  score: number;
  totalScore: number;
  currentRound: number;
  mode?: string;
  onNext: () => void;
}

export default function ResultsPopUp({
  showResults,
  userGuess,
  actualLocation,
  distance,
  score,
  totalScore,
  currentRound,
  mode,
  onNext
}: ResultsPopUpProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const bottomBarRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showBottomBar, setShowBottomBar] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [animatedDistance, setAnimatedDistance] = useState(0);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [animatedTotalScore, setAnimatedTotalScore] = useState(0);
  const lineAnimationRef = useRef<(() => void) | null>(null);
  const isAnimatingRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (!mapContainerRef.current || mapRef.current) return;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-80.5204, 43.4643],
        zoom: 2,
        interactive: false
      });

      map.on('load', () => {
        map.addSource('results-line', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: []
            }
          }
        });

        // Add line layer
        map.addLayer({
          id: 'results-line-layer',
          type: 'line',
          source: 'results-line',
          paint: {
            'line-color': '#ff0000',
            'line-width': 4,
            'line-dasharray': [3, 3]
          }
        });
        
        setIsMapReady(true);
      });

      map.on('error', (e) => {
        console.error('Mapbox error:', e);
      });

      mapRef.current = map;
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setIsMapReady(false);
      }
    };
  }, []);

  useEffect(() => {
    // Don't show if we're in the middle of fading out
    if (isFadingOut) {
      return;
    }
    
    if (showResults && userGuess && mapRef.current && isMapReady) {
      // Prevent multiple simultaneous animations
      if (isAnimatingRef.current) {
        return;
      }
      
      setIsVisible(true);
      setShowBottomBar(false);
      
      // Reset animated counters
      setAnimatedDistance(0);
      setAnimatedScore(0);
      setAnimatedTotalScore(totalScore - score);
      
      // Start the animation sequence
      setTimeout(() => {
        animateToResults();
      }, 100);
    } else {
      setIsVisible(false);
      setShowBottomBar(false);
      isAnimatingRef.current = false;
    }
  }, [showResults, userGuess, actualLocation, distance, score, isMapReady]);

  const animateToResults = () => {
    if (!mapRef.current || !userGuess) {
      return;
    }

    // Set animation flag
    isAnimatingRef.current = true;

    // Clear existing markers
    document.querySelectorAll('.results-marker').forEach(el => el.remove());
    
    // Clear the line
    if (mapRef.current.getSource('results-line')) {
      (mapRef.current.getSource('results-line') as mapboxgl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: []
        }
      });
    }

    // Add markers
    new mapboxgl.Marker({ color: '#ff4444', className: 'results-marker' })
      .setLngLat([userGuess.lng, userGuess.lat])
      .addTo(mapRef.current);

    new mapboxgl.Marker({ color: '#00ff00', className: 'results-marker' })
      .setLngLat([actualLocation.lng, actualLocation.lat])
      .addTo(mapRef.current);

    // Calculate bounds to show both points
    const bounds = new mapboxgl.LngLatBounds()
      .extend([userGuess.lng, userGuess.lat])
      .extend([actualLocation.lng, actualLocation.lat]);

    // Get current map center and calculate distance to new bounds center
    const currentCenter = mapRef.current.getCenter();
    const boundsCenter = bounds.getCenter();
    
    // Calculate distance between current center and new bounds center (in degrees)
    const deltaLat = Math.abs(currentCenter.lat - boundsCenter.lat);
    const deltaLng = Math.abs(currentCenter.lng - boundsCenter.lng);
    const panDistance = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng);
    
    // Calculate zoom time based on pan distance
    // Base time of 600ms, add time based on distance
    // For UW campus scale: 0.01 degrees ≈ ~1km, adjusted for shorter distances
    let zoomTime: number;
    
    if (currentRound === 1) {
      // First round always gets longer time since we're zooming from world view
      zoomTime = 2500;
    } else if (panDistance > 0.015) {
      // Long distance pan within campus (>~1.5km)
      zoomTime = 2000;
    } else if (panDistance > 0.01) {
      // Medium distance pan (~1-1.5km)
      zoomTime = 1700;
    } else if (panDistance > 0.005) {
      // Short distance pan (~500m-1km)
      zoomTime = 1500;
    } else if (panDistance > 0.002) {
      // Very short distance pan (~200-500m)
      zoomTime = 1400;
    } else {
      // Minimal pan distance (<200m)
      zoomTime = 1300;
    }

    // Get dynamic padding based on screen size and bottom bar
    const bottomBarHeight = bottomBarRef.current?.offsetHeight || 120;
    const isMobile = window.innerWidth < 640;
    const padding = {
      top: isMobile ? 50 : 125,
      bottom: bottomBarHeight + (isMobile ? 20 : 100),
      left: isMobile ? 50 : 125,
      right: isMobile ? 50 : 125
    };

    // Fit to bounds with animation
    mapRef.current.fitBounds(bounds, {
      padding,
      duration: zoomTime,
      essential: true
    });

    // Start line animation after zoom
    setTimeout(() => {
      if (lineAnimationRef.current) {
        lineAnimationRef.current();
      }
      lineAnimationRef.current = animateLine() || (() => {});
    }, zoomTime);

    // Show bottom bar after line animation
    setTimeout(() => {
      setShowBottomBar(true);
      startCounterAnimations();
      isAnimatingRef.current = false;
    }, zoomTime + 1500);
  };

  const animateLine = () => {
    if (!mapRef.current || !userGuess) return;

    const startCoord = [userGuess.lng, userGuess.lat];
    const endCoord = [actualLocation.lng, actualLocation.lat];
    
    // Create the full line first (invisible)
    const fullLineData = {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: [startCoord, endCoord]
      }
    };

    const duration = 1000;
    const startTime = Date.now();
    let animationId: number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeInOutQuad = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      // Interpolate coordinates based on eased progress
      const currentCoord = [
        startCoord[0] + (endCoord[0] - startCoord[0]) * easeInOutQuad,
        startCoord[1] + (endCoord[1] - startCoord[1]) * easeInOutQuad
      ];

      const lineData = {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: [startCoord, currentCoord]
        }
      };

      try {
        if (mapRef.current?.getSource('results-line')) {
          (mapRef.current.getSource('results-line') as mapboxgl.GeoJSONSource).setData(lineData);
        }
      } catch (error) {
        console.warn('Error updating line:', error);
        return;
      }

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      } else {
        // Ensure final state is set
        try {
          if (mapRef.current?.getSource('results-line')) {
            (mapRef.current.getSource('results-line') as mapboxgl.GeoJSONSource).setData(fullLineData);
          }
        } catch (error) {
          console.warn('Error setting final line state:', error);
        }
      }
    };

    animationId = requestAnimationFrame(animate);
    
    // Return cleanup function
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  };

  const startCounterAnimations = () => {
    // Animate distance
    animateCounter(0, distance, 800, setAnimatedDistance);
    
    // Animate score (start after 200ms delay)
    setTimeout(() => {
      animateCounter(0, score, 800, setAnimatedScore);
    }, 200);
    
    // Animate total score (start after 400ms delay)
    setTimeout(() => {
      animateCounter(totalScore - score, totalScore, 800, setAnimatedTotalScore);
    }, 400);
  };

  const animateCounter = (start: number, end: number, duration: number, setter: (value: number) => void) => {
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = start + (end - start) * easeOutQuart;
      
      setter(Math.floor(current));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setter(end);
      }
    };
    
    animate();
  };

  const handleNext = () => {
    console.log('handleNext called - updating game state first');
    
    // Handle final results redirect immediately
    if (currentRound >= 5) {
      // Clean up animations first
      isAnimatingRef.current = false;
      if (lineAnimationRef.current) {
        lineAnimationRef.current();
        lineAnimationRef.current = null;
      }
      
      // Save mode info with results for daily completion tracking
      const currentGame = sessionStorage.getItem('uwGuessrCurrentGame');
      if (currentGame) {
        const gameData = JSON.parse(currentGame);
        const key = mode === 'daily' ? 'uwGuessrDailyResults' : 'uwGuessrResults';
        const savedResults = sessionStorage.getItem(key);
        if (savedResults && gameData.mode === 'daily') {
          const nyDate = new Date(
            new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
          );
          const year = nyDate.getFullYear();
          const month = String(nyDate.getMonth() + 1).padStart(2, '0');
          const day = String(nyDate.getDate()).padStart(2, '0');
          const today = `${year}-${month}-${day}`;
          // Save final completion
          localStorage.setItem(`uwGuessrDaily_${today}`, savedResults);
          // Clear progress since they've completed it
          localStorage.removeItem(`uwGuessrDailyProgress_${today}`);
          console.log('Daily challenge completed for', today);
        }
      }
      
      // Clear the current game state but keep results
      sessionStorage.removeItem('uwGuessrCurrentGame');
      if (mode === 'daily') {
        // Get today's date in America/New_York timezone
        const nyDate = new Date(
          new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
        );
        const year = nyDate.getFullYear();
        const month = String(nyDate.getMonth() + 1).padStart(2, '0');
        const day = String(nyDate.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;
        // Try to get daily results from localStorage first
        let results = localStorage.getItem(`uwGuessrDaily_${today}`);
        if (!results) {
          // Fallback to sessionStorage uwGuessrDailyResults
          results = sessionStorage.getItem('uwGuessrDailyResults');
        }
        // Optionally, you could pass results as state or query param if needed
        router.push('/results?mode=daily');
      } else {
        // For random mode, get results from sessionStorage uwGuessrResults
        const results = sessionStorage.getItem('uwGuessrResults');
        // Optionally, you could pass results as state or query param if needed
        router.push('/results?mode=random');
      }
      return;
    }

    // Normal next round logic (only runs if currentRound < 5)
    isAnimatingRef.current = false;
    
    // Clean up any running animations
    if (lineAnimationRef.current) {
      lineAnimationRef.current();
      lineAnimationRef.current = null;
    }
    
    // Clear the line immediately
    if (mapRef.current?.getSource('results-line')) {
      (mapRef.current.getSource('results-line') as mapboxgl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: []
        }
      });
    }
    // Update game state first, then animate out
    onNext();
    setIsFadingOut(true);
    setIsVisible(false);
    setShowBottomBar(false);
    setTimeout(() => {
      setIsFadingOut(false);
    }, 500);
  };

  // Always render the component but make it invisible when not needed
  // This ensures the map can initialize properly
  return (
    <div 
      className={`fixed inset-0 z-[9999] transition-opacity duration-500 ${
        isVisible && showResults && userGuess && !isFadingOut ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{ backgroundColor: '#ffffff' }}
    >
      {/* Map Container */}
      <div 
        ref={mapContainerRef}
        className="w-full h-full"
      />

      {/* Bottom Info Bar */}
      <div 
        ref={bottomBarRef}
        className={`fixed inset-x-0 bottom-0 bg-black/90 w-full text-white h-auto min-h-[64px] p-4 md:p-6 transition-transform duration-500 z-50 ${
          showBottomBar ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex flex-col md:flex-row justify-between items-center max-w-6xl mx-auto gap-4 md:gap-0">
          {/* Stats */}
          <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-8">
            <div className="text-center md:text-left">
              <div className="text-xs md:text-sm text-gray-400 uppercase tracking-wide mb-1">Distance</div>
              <div className="text-2xl md:text-3xl font-bold text-yellow-400">{animatedDistance.toFixed(0)}m</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-xs md:text-sm text-gray-400 uppercase tracking-wide mb-1">Round Score</div>
              <div className="text-2xl md:text-3xl font-bold text-yellow-400">{animatedScore.toLocaleString()}</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-xs md:text-sm text-gray-400 uppercase tracking-wide mb-1">Total Score</div>
              <div className="text-2xl md:text-3xl font-bold text-white">{animatedTotalScore.toLocaleString()}</div>
            </div>
          </div>

          {/* Next Button */}
          <button
            onClick={handleNext}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-6 md:px-8 py-3 md:py-4 text-base md:text-lg rounded-lg transition-colors w-full md:w-auto cursor-pointer"
          >
            {currentRound >= 5 ? 'Final Results' : 'Next Round'}
          </button>
        </div>
      </div>
    </div>
  );
}