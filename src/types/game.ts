export type Photo = {
  id: string
  url: string
  lat: number | null
  lng: number | null
  building: string
  floor: number
  added_by: string
  created_at: string
  status: string
}

export type GameGuess = {
  lat: number
  lng: number
}

export type RoundResult = {
  round: number
  photo: Photo
  userGuess: GameGuess
  actualLocation: GameGuess
  distance: number
  score: number
  timeSpent: number
}

export type GamePhase = 'playing' | 'guessing' | 'results' | 'complete'

export type GameState = {
  currentRound: number
  totalScore: number
  roundScore: number
  userGuess: GameGuess | null
  isMapExpanded: boolean
  showResults: boolean
  gamePhase: GamePhase
  roundResults: RoundResult[]
  startTime: number | null
}

export type GameMode = 'random' | 'daily'
