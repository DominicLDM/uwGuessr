import { useState, useCallback, useMemo, useEffect } from 'react'
import { GameState, Photo, RoundResult } from '@/types/game'

const INITIAL_GAME_STATE: GameState = {
  currentRound: 1,
  totalScore: 0,
  roundScore: 0,
  userGuess: null,
  isMapExpanded: false,
  showResults: false,
  gamePhase: 'playing',
  roundResults: [],
  startTime: null
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180
  const φ2 = lat2 * Math.PI/180
  const Δφ = (lat2-lat1) * Math.PI/180
  const Δλ = (lng2-lng1) * Math.PI/180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c // Distance in meters
}

// Calculate score based on distance with exponential decay from SLC Tim Hortons
function calculateScore(distance: number): number {
  const maxScore = 5000 // 50k points for perfect guesses
  const maxDistance = 1000 // 1km radius for scoring
  
  // Perfect score for guesses within 30 meters
  if (distance <= 30) return maxScore
  
  // No points beyond 1km
  if (distance >= maxDistance) return 0
  
  // Tuned so that 100m gives ~2.5k points, 500m gives ~500 points
  const decayConstant = 0.004 // Adjust this to change curve steepness
  const score = maxScore * Math.exp(-decayConstant * distance)
  
  return Math.round(score)
}

function saveRoundResultToSession(roundResult: RoundResult) {
  const key = 'uwGuessrResults';
  const existing = sessionStorage.getItem(key);
  const results: RoundResult[] = existing ? JSON.parse(existing) : [];
  results.push(roundResult);
  sessionStorage.setItem(key, JSON.stringify(results));
}

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE)

  // Clear session storage when component mounts (new game starts)
  useEffect(() => {
    sessionStorage.removeItem('uwGuessrResults')
  }, [])

  const placeGuess = useCallback((lat: number, lng: number) => {
    setGameState(prev => ({
      ...prev,
      userGuess: { lat, lng },
      gamePhase: 'guessing'
    }))
  }, [])

  const submitGuess = useCallback((photo: Photo) => {
    if (!gameState.userGuess || !photo.lat || !photo.lng) return

    const distance = calculateDistance(
      gameState.userGuess.lat,
      gameState.userGuess.lng,
      photo.lat,
      photo.lng
    )
    
    const roundScore = calculateScore(distance)
    const timeSpent = gameState.startTime ? Date.now() - gameState.startTime : 0

    const roundResult: RoundResult = {
      round: gameState.currentRound,
      photo,
      userGuess: gameState.userGuess,
      actualLocation: { lat: photo.lat, lng: photo.lng },
      distance,
      score: roundScore,
      timeSpent
    }

    saveRoundResultToSession(roundResult);

    setGameState(prev => ({
      ...prev,
      roundScore,
      totalScore: prev.totalScore + roundScore,
      roundResults: [...prev.roundResults, roundResult],
      showResults: true,
      gamePhase: 'results'
    }))
  }, [gameState.userGuess, gameState.startTime, gameState.currentRound])

  const nextRound = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      currentRound: prev.currentRound + 1,
      userGuess: null,
      showResults: false,
      gamePhase: prev.currentRound >= 5 ? 'complete' : 'playing',
      startTime: Date.now(),
      roundScore: 0
    }))
  }, [])

  const toggleMapExpanded = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isMapExpanded: !prev.isMapExpanded
    }))
  }, [])

  const startRound = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      startTime: Date.now(),
      gamePhase: 'playing'
    }))
  }, [])

  const resetGame = useCallback(() => {
    setGameState(INITIAL_GAME_STATE)
  }, [])

  const actions = useMemo(() => ({
    placeGuess,
    submitGuess,
    nextRound,
    toggleMapExpanded,
    startRound,
    resetGame
  }), [placeGuess, submitGuess, nextRound, toggleMapExpanded, startRound, resetGame])

  return {
    gameState,
    actions
  }
}
