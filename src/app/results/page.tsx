"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApolloClient } from '@apollo/client'
import mapboxgl from 'mapbox-gl'
import { RotateCcw, Home, Camera } from 'lucide-react'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface RoundResult {
    round: number;
    photo: {
        id: string;
        url: string;
        lat: number;
        lng: number;
    }
    userGuess: { lat: number; lng: number }
    actualLocation: { lat: number; lng: number }
    distance: number;
    score: number;
    timeSpent: number;
}

export default function ResultsPage() {
    const router = useRouter();
    const apolloClient = useApolloClient();
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const [results, setResults] = useState<RoundResult[] | null>(null);
    const [totalScore, setTotalScore] = useState<number>(0);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [selectedRound, setSelectedRound] = useState<number | null>(null);
    const markersRef = useRef<{ [key: number]: { guess: mapboxgl.Marker, actual: mapboxgl.Marker } }>({});

    useEffect(() => {
        // Try both mode-specific keys, preferring daily if both exist
        let savedResults = sessionStorage.getItem('uwGuessrDailyResults');
        let wasDaily = true;
        
        if (!savedResults) {
            savedResults = sessionStorage.getItem('uwGuessrResults');
            wasDaily = false;
        }
        
        const savedResultsHistory = sessionStorage.getItem('uwGuessrResultsHistory');
        
        if (savedResults) {
            // Current results exist
            const parsedResults: RoundResult[] = JSON.parse(savedResults);
            setResults(parsedResults);
            setTotalScore(parsedResults.reduce((sum, result) => sum + result.score, 0));
            
            // Check if this was a daily challenge by checking the URL referrer or stored mode
            const currentGame = sessionStorage.getItem('uwGuessrCurrentGame');
            const gameDataDaily = currentGame && JSON.parse(currentGame).mode === 'daily';
            
            // Also check if we came from daily play page
            const referrer = document.referrer;
            const fromDaily = referrer.includes('/play/daily');
            
            if (wasDaily || gameDataDaily || fromDaily) {
                const nyDate = new Date(
                  new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
                );
                const year = nyDate.getFullYear();
                const month = String(nyDate.getMonth() + 1).padStart(2, '0');
                const day = String(nyDate.getDate()).padStart(2, '0');
                const today = `${year}-${month}-${day}`;
                localStorage.setItem(`uwGuessrDaily_${today}`, savedResults);
                // Clear progress since they've completed it
                localStorage.removeItem(`uwGuessrDailyProgress_${today}`);
                console.log('Saved daily completion for', today);
            }
        } else if (savedResultsHistory) {
            // Show last completed game results
            const parsedResults: RoundResult[] = JSON.parse(savedResultsHistory);
            setResults(parsedResults);
            setTotalScore(parsedResults.reduce((sum, result) => sum + result.score, 0));
        } else {
            // No results found, redirect to home
            router.push('/');
            return;
        }
    }, [router])

    // Initialize map with all round data
    useEffect(() => {
        if (mapContainer.current && !mapRef.current && results && results.length > 0) {
            const map = new mapboxgl.Map({
                container: mapContainer.current,
                style: 'mapbox://styles/mapbox/streets-v12',
                center: [-80.5417, 43.4723], // Default center
                zoom: 16,
                antialias: false,
                preserveDrawingBuffer: false,
                refreshExpiredTiles: false,
                maxTileCacheSize: 50
            });

            map.on('load', () => {
                // Add all markers and lines
                const bounds = new mapboxgl.LngLatBounds()
                
                // Clear any existing markers
                document.querySelectorAll('.results-marker').forEach(el => el.remove());
                
                results.forEach((result, index) => {
                    // Add guess marker (red)
                    const guessMarker = new mapboxgl.Marker({ color: '#ff4444', className: 'results-marker' })
                        .setLngLat([result.userGuess.lng, result.userGuess.lat])
                        .addTo(map)

                    // Add actual location marker (green)
                    const actualMarker = new mapboxgl.Marker({ color: '#00ff00', className: 'results-marker' })
                        .setLngLat([result.actualLocation.lng, result.actualLocation.lat])
                        .addTo(map)
                    
                    // Store markers for highlighting
                    markersRef.current[index] = {
                        guess: guessMarker,
                        actual: actualMarker
                    }
                        
                    bounds.extend([result.actualLocation.lng, result.actualLocation.lat])
                    bounds.extend([result.userGuess.lng, result.userGuess.lat])
                })

            const lineFeatures = results.map((result, index) => ({
                type: 'Feature' as const,
                properties: { round: index + 1, roundIndex: index },
                geometry: {
                    type: 'LineString' as const,
                    coordinates: [
                        [result.userGuess.lng, result.userGuess.lat],
                        [result.actualLocation.lng, result.actualLocation.lat]
                    ]
                }
            }))

            map.addSource('result-lines', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: lineFeatures
                }
            })

            map.addLayer({
                id: 'result-lines',
                type: 'line',
                source: 'result-lines',
                paint: {
                    'line-color': '#000000', // Default black
                    'line-width': 4,
                    'line-dasharray': [3, 3]
                }
            })

            // Fit map to show all points
                map.fitBounds(bounds, { padding: 50 })
                setMapLoaded(true)
            })

            mapRef.current = map

            return () => {
                map.remove()
                mapRef.current = null
            }
        }
    }, [results])

    const formatTime = (milliseconds: number) => {
        const seconds = Math.floor(milliseconds / 1000);
        return `${seconds}s`;
    }

    const formatDistance = (meters: number) => {
        return `${Math.round(meters)}m`;
    }

    const handlePlayAgain = () => {
        // Move current results to history before clearing
        let currentResults = sessionStorage.getItem('uwGuessrDailyResults');
        if (!currentResults) {
            currentResults = sessionStorage.getItem('uwGuessrResults');
        }
        
        if (currentResults) {
            sessionStorage.setItem('uwGuessrResultsHistory', currentResults);
        }
        
        // Clear both mode-specific session storage keys
        sessionStorage.removeItem('uwGuessrResults');
        sessionStorage.removeItem('uwGuessrDailyResults');
        sessionStorage.removeItem('uwGuessrCurrentGame');
        
        // Evict photo cache to force fresh images (safer than clearStore)
        apolloClient.cache.evict({ fieldName: "randomPhotos" });
        apolloClient.cache.evict({ fieldName: "dailyPhotos" });
        
        // Set fresh start flag for new game
        sessionStorage.setItem('uwGuessrFreshStart', 'true');
        
        router.push('/play/random');
    }

    const handleMainMenu = () => {
        router.push('/');
    }

    const handleUploadImage = () => {
        router.push('/upload');
    }

    const handleRoundClick = (roundIndex: number) => {
        if (!mapRef.current) return;

        if (selectedRound === roundIndex) {
            // Deselect if clicking the same round
            setSelectedRound(null);
            // Reset all lines to black
            mapRef.current.setPaintProperty('result-lines', 'line-color', '#000000');
            // Zoom back to fit all points
            const bounds = new mapboxgl.LngLatBounds();
            results?.forEach((result) => {
                bounds.extend([result.actualLocation.lng, result.actualLocation.lat]);
                bounds.extend([result.userGuess.lng, result.userGuess.lat]);
            });
            mapRef.current.fitBounds(bounds, { padding: 50 });
        } else {
            setSelectedRound(roundIndex);
            // Set selected line to red, all others to black
            mapRef.current.setPaintProperty('result-lines', 'line-color', [
                'case',
                ['==', ['get', 'roundIndex'], roundIndex],
                '#ff0000', // Selected line is red
                '#000000'  // All other lines stay black
            ]);
            // Zoom to the selected round's markers using bounds
            if (results && results[roundIndex]) {
                const result = results[roundIndex];
                const bounds = new mapboxgl.LngLatBounds();
                bounds.extend([result.actualLocation.lng, result.actualLocation.lat]);
                bounds.extend([result.userGuess.lng, result.userGuess.lat]);
                const padding = window.innerWidth >= 640 ? 100 : 50;
                mapRef.current.fitBounds(bounds, { padding, duration: 1000 });
            }
        }
    }

    // Show nothing while loading (no spinner)
    if (!results || results.length === 0) {
        return null;
    }

    return (
        <div className="h-screen w-screen flex flex-col" style={{ backgroundColor: "hsla(46, 86%, 99.5%, 1.00)", height: "100svh" }}>
            {/* Header */}
            <div className="flex justify-center items-center py-3 px-4 flex-shrink-0">
                <div className="text-center">
                    <h1 className="text-xl sm:text-4xl font-bold mb-1 text-black">Game Results</h1>
                    <div className="text-base sm:text-2xl text-lg font-bold text-yellow-600">Total Score: {totalScore.toLocaleString()}</div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col sm:flex-row gap-3 px-4 pb-4 overflow-hidden min-h-0">
                {/* Map Section */}
                <div className="flex-1 sm:flex-[2] flex-shrink-0">
                    <div className="h-full relative bg-white rounded-3xl border-4 border-black overflow-hidden shadow-lg">
                        <div 
                            ref={mapContainer} 
                            className="w-full h-full"
                        />
                        {!mapLoaded && (
                            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="w-8 h-8 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                    <p className="text-gray-600 text-sm">Loading map...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Results Panel */}
                <div className="flex-shrink-0 sm:flex-1 lg:w-auto flex flex-col min-h-0">
                    {/* Round Results */}
                    <div className="flex-1 bg-white rounded-3xl border-4 border-black p-3 mb-3 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto max-h-36 sm:max-h-none">
                            <div className="space-y-3 lg:space-y-4 pb-2">
                                {results.map((result, index) => (
                                    <div 
                                        key={result.round} 
                                        onClick={() => handleRoundClick(index)}
                                        className={`rounded-xl p-4 sm:p-5 border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                                            selectedRound === index 
                                                ? 'bg-yellow-100 border-yellow-400 shadow-md' 
                                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4 sm:gap-6">
                                            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 border border-black">
                                                <img 
                                                    src={result.photo.url} 
                                                    alt={`Round ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-base sm:text-lg text-black mb-2">Round {index + 1}</div>
                                                <div className="text-sm sm:text-base text-gray-700 mb-2">
                                                    <div className="flex flex-col sm:flex-row sm:gap-4">
                                                        <span>Distance: <span className="font-medium">{formatDistance(result.distance)}</span></span>
                                                        <span>Time: <span className="font-medium">{formatTime(result.timeSpent)}</span></span>
                                                    </div>
                                                </div>
                                                <div className="text-lg sm:text-xl font-bold text-yellow-600">{result.score.toLocaleString()} pts</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                        <button 
                            onClick={handlePlayAgain}
                            className="w-full px-4 py-3 bg-yellow-400 hover:bg-yellow-500 rounded-2xl font-bold text-black border-4 border-black transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <RotateCcw size={16} /> Play Again
                        </button>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={handleMainMenu}
                                className="flex-1 px-3 py-2 bg-white hover:bg-gray-100 rounded-2xl font-bold text-black border-4 border-black transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-1 cursor-pointer"
                            >
                                <Home size={14} /> Home
                            </button>
                            
                            <button 
                                onClick={handleUploadImage}
                                className="flex-1 px-3 py-2 bg-black hover:bg-gray-900 rounded-2xl font-bold text-white border-4 border-black transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-1 cursor-pointer"
                            >
                                <Camera size={14} /> Upload
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}