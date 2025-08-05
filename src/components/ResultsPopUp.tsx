"use client"

import React, { useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (!mapContainerRef.current || mapRef.current) return;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v11',
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

    // Get dynamic padding based on screen size and bottom bar
    const bottomBarHeight = bottomBarRef.current?.offsetHeight || 120;
    const isMobile = window.innerWidth < 640;
    const padding = {
      top: isMobile ? 50 : 125,
      bottom: bottomBarHeight + (isMobile ? 20 : 100),
      left: isMobile ? 50 : 125,
      right: isMobile ? 50 : 125
    };

    const zoomTime = currentRound === 1 ? 2500 : distance > 500 ? 2000 : distance > 100 ? 1600 : 1200;

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
    
    // Reset animation flag
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
        className={`absolute bottom-0 left-0 right-0 bg-black/90 text-white p-4 md:p-6 transition-transform duration-500 z-50 ${
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
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-6 md:px-8 py-3 md:py-4 text-base md:text-lg rounded-lg transition-colors w-full md:w-auto"
          >
            {currentRound >= 5 ? 'Final Results' : 'Next Round'}
          </button>
        </div>
      </div>
    </div>
  );
}