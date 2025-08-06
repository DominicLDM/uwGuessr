"use client"

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from 'react'
import { useQuery, gql } from '@apollo/client';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useGameState } from '@/hooks/useGameState'
import { Photo } from '@/types/game'
import GameMap from '@/components/GameMap'
import GameMapMobile from '@/components/GameMapMobile';
import ResultsPopUp from '@/components/ResultsPopUp';
import { Home } from 'lucide-react';

const GET_RANDOM_PHOTOS = gql`
query GetRandomPhotos($count: Int!) {
        randomPhotos(count: $count) {
        id
        url
        lat
        lng
        building
        floor
        added_by
        created_at
        status
        }
}
`;

const GET_DAILY_PHOTOS = gql`
query GetDailyPhotos($count: Int!) {
        dailyPhotos(count: $count) {
        id
        url
        lat
        lng
        building
        floor
        added_by
        created_at
        status
        }
}
`;

// type GameState = {
//   currentRound: number
//   totalScore: number
//   roundScore: number
//   userGuess: { lat: number; lng: number } | null
//   isMapExpanded: boolean
//   showResults: boolean
//   gamePhase: 'playing' | 'guessing' | 'results' | 'complete'
// }

export default function PlayPage() {
    const [images, setImages] = useState<Photo[]>([]);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isMobile, setIsMobile] = useState<boolean | null>(null); // Start as null to prevent flickering
    const [mapDetail, setMapDetail] = useState<'high' | 'low'>('high'); // Map detail state for desktop background
    
    const { gameState, actions } = useGameState()
    const router = useRouter();

    const params = useParams();
    const { mode } = params;

    // Game state persistence functions
    const saveGameState = (gameState: any, images: Photo[]) => {
        sessionStorage.setItem('uwGuessrCurrentGame', JSON.stringify({
            gameState,
            images,
            mode
        }));
    };

    const loadGameState = () => {
        const saved = sessionStorage.getItem('uwGuessrCurrentGame');
        if (saved) {
            return JSON.parse(saved);
        }
        return null;
    };

    const { data, error, refetch } = useQuery(
        mode === "random" ? GET_RANDOM_PHOTOS : GET_DAILY_PHOTOS,
        { 
            variables: { count: 5 }, 
            skip: !mode,
            fetchPolicy: 'cache-and-network', // Always check for fresh data
            notifyOnNetworkStatusChange: true
        }
    );

    useEffect(() => {
        // Check if this is a fresh start (navigated from home page or results)
        const isFreshStart = sessionStorage.getItem('uwGuessrFreshStart');
        
        if (isFreshStart) {
            // Clear the fresh start flag and any existing game data
            sessionStorage.removeItem('uwGuessrFreshStart');
            sessionStorage.removeItem('uwGuessrCurrentGame');
            
            // Force refetch of fresh data
            refetch().then((result) => {
                const newImages = mode === "random" ? result.data.randomPhotos : result.data.dailyPhotos;
                setImages(newImages);
                actions.resetGame();
                actions.startRound();
                
                // Save initial state
                saveGameState(gameState, newImages);
            }).catch((err) => {
                console.error('Failed to fetch fresh images:', err);
            });
            return;
        }
        
        // Try to restore existing game state (page refresh scenario)
        const savedGame = loadGameState();
        if (savedGame && savedGame.mode === mode && data) {
            // Restore images first
            setImages(savedGame.images);
            
            // Restore the saved game state (this contains the roundResults)
            actions.restoreGameState(savedGame.gameState);
            return;
        }
        
        if (data) {
            const newImages = mode === "random" ? data.randomPhotos : data.dailyPhotos;
            setImages(newImages);
            actions.startRound();
            
            // Save initial state
            saveGameState(gameState, newImages);
        }
    }, [data, mode, refetch]);

    // Save game state whenever it changes
    useEffect(() => {
        if (images.length > 0) {
            saveGameState(gameState, images);
        }
    }, [gameState, images]);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 640);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    if (error) {
        return <main className="p-4 text-red-600">Error: {error.message}</main>;
    }

    return (
        <main className="h-svh w-screen relative">
            {/* Desktop: Full Background Map */}
            {isMobile !== null && !isMobile && (
                <div className="absolute inset-0 w-full h-full z-0">
                    <GameMap 
                        onPlaceGuess={actions.placeGuess}
                        onSubmitGuess={() => actions.submitGuess(images[gameState.currentRound - 1])}
                        userGuess={gameState.userGuess}
                        disabled={gameState.gamePhase === 'results'}
                        onToggleMapDetail={() => setMapDetail(mapDetail === 'high' ? 'low' : 'high')}
                        mapDetail={mapDetail}
                    />
                </div>
            )}

            {/* Desktop: Floating score card */}
            {isMobile !== null && !isMobile && (
                <div className="absolute top-4 right-4 z-20">
                    <div className="relative">
                        {/* Angular offset shadows */}
                        <div className="absolute inset-0 shadow-xl transform translate-x-2.5 translate-y-2.5"
                            style={{ clipPath: 'polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 22px 100%, 0 calc(100% - 22px))' }}>
                            <div className="h-full flex">
                                <div className="flex-1 bg-yellow-400"></div>
                            </div>
                        </div>
                        <div className="absolute inset-0 shadow-xl transform translate-x-1.25 translate-y-1.25"
                            style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))' }}>
                            <div className="h-full flex">
                                <div className="flex-1 bg-yellow-300"></div>
                            </div>
                        </div>
                        <div className="relative bg-black text-white p-3 sm:p-4 shadow-2xl"
                            style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}>
                            <div className="flex items-center justify-between gap-x-12 sm:gap-x-16">
                                <div className="text-left">
                                    <div className="text-yellow-400 text-xs sm:text-sm font-semibold uppercase tracking-wider mb-1">Round</div>
                                    <div className="text-xl sm:text-2xl font-bold text-white">
                                        {gameState.currentRound}<span className="text-yellow-400">/5</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-yellow-400 text-xs sm:text-sm font-semibold uppercase tracking-wider mb-1">Score</div>
                                    <div className="text-xl sm:text-2xl font-bold text-white">{gameState.totalScore.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* 2D/3D Toggle and Home button */}
                    <div className="mt-3.5 flex justify-end gap-2">
                        <button 
                            onClick={() => {
                                router.push('/');
                            }}
                            className="bg-black/70 text-white px-2.5 py-2 rounded-lg text-lg font-bold hover:bg-black/90 cursor-pointer shadow-2xl border-2 border-white/20 flex items-center gap-1"
                        >
                            <Home size={16} />
                        </button>
                        <button 
                            onClick={() => setMapDetail(mapDetail === 'high' ? 'low' : 'high')} 
                            className="bg-black/70 text-white px-2.5 py-2 rounded-lg text-sm font-bold hover:bg-black/90 cursor-pointer shadow-2xl border-2 border-white/20"
                        >
                            {mapDetail === 'high' ? '3D' : '2D'}
                        </button>
                    </div>
                </div>
            )}

            {/* Desktop: Floating image */}
            {isMobile !== null && !isMobile && (
                <div className="absolute top-4 left-4 bottom-4 z-10 flex items-center">
                    <div
                        className={`relative rounded-2xl overflow-hidden bg-gray-200 ${imageLoaded ? 'border-4 border-black' : ''}`}
                        style={{
                            transform: 'scale(1)',
                            transformOrigin: 'left center',
                            transition: 'transform 0.1s ease'
                        }}
                    >
                        {images[gameState.currentRound - 1]?.url ? (
                            <>  
                                <TransformWrapper
                                    minScale={1}
                                    maxScale={4}
                                    limitToBounds={true}
                                    centerOnInit={true}
                                    wheel={{ smoothStep: 0.005}}
                                    doubleClick={{ mode: 'toggle' }}
                                    panning={{ velocityDisabled: false }}
                                    smooth={true}
                                    disabled={false}
                                >
                                    <TransformComponent>
                                        <img
                                            src={images[gameState.currentRound - 1].url}
                                            alt="Level"
                                            className={`block w-auto h-auto max-w-none max-h-none object-contain transition-opacity duration-500 ${
                                                imageLoaded ? 'opacity-100' : 'opacity-0'
                                            }`}
                                            style={{
                                                maxWidth: 'calc(50vw)', // Account for margins and score card
                                                maxHeight: 'calc(100vh - 32px)', // Full height minus margins
                                                width: 'auto',
                                                height: 'auto'
                                            }}
                                            onLoad={() => {
                                                setImageLoaded(true)
                                            }}
                                            onError={() => setImageLoaded(false)}
                                        />
                                    </TransformComponent>
                                </TransformWrapper>
                            </>
                        ) : (
                            <div className="w-96 h-72 flex items-center justify-center animate-pulse rounded-2xl">
                                <div className="w-24 h-24 rounded" />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Desktop: Submit button */}
            {isMobile !== null && !isMobile && (
                <div className="absolute bottom-8 right-8 z-30">
                    <div className={`
                        rounded-xl shadow-2xl border-4 border-black
                        transition-all duration-300 ease-in-out
                        w-80
                        ${gameState.userGuess ? 'bg-yellow-400' : 'bg-gray-300'}
                    `}>
                        <button
                            onClick={() => actions.submitGuess(images[gameState.currentRound - 1])}
                            disabled={!gameState.userGuess}
                            className={`
                                w-full py-3 px-6 rounded-lg font-bold text-lg
                                transition-all duration-200 border-2 border-black
                                ${gameState.userGuess 
                                    ? 'bg-yellow-400 hover:bg-yellow-500 text-black cursor-pointer' 
                                    : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                }
                            `}
                        >
                            {gameState.userGuess ? 'Submit Guess!' : 'Make a guess'}
                        </button>
                    </div>
                </div>
            )}

            {/* Mobile: Logo and score navbar with image and slide in map */}
            {isMobile !== null && isMobile && (
                <div className="h-full w-full flex flex-col" style={{ backgroundColor: "hsla(46, 86%, 99.5%, 1.00)" }}>
                    <header className="flex w-screen justify-between items-center p-4 px-5">
                        <div className="flex items-center cursor-pointer" onClick={() => window.location.href = "/"}>
                            <h1 className="text-4xl sm:text-6xl font-bold font-black tracking-tight flex items-center justify-center -mt-1 sm:-mt-3">
                                <span className="text-yellow-500 mr-0.5">uw</span>
                                <span className="text-black flex items-center">
                                    <img src="/G.svg" alt="G" className="inline-block align-middle mx-0 -mr-0.25 sm:w-[52px] sm:h-[52px] w-[28px] h-[28px]" />
                                    uessr
                                </span>
                            </h1>
                        </div>
                        {/* Round and Score Indicator */}
                        <div className="relative">
                            {/* Angular offset shadows */}
                            <div className="absolute inset-0 shadow-xl transform translate-x-1.5 translate-y-1.5"
                                style={{ clipPath: 'polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 22px 100%, 0 calc(100% - 22px))' }}>
                                <div className="h-full flex">
                                    <div className="flex-1 bg-yellow-400"></div>
                                </div>
                            </div>
                            <div className="absolute inset-0 shadow-xl transform translate-x-0.75 translate-y-0.75"
                                style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))' }}>
                                <div className="h-full flex">
                                    <div className="flex-1 bg-yellow-300"></div>
                                </div>
                            </div>
                            <div className="relative bg-black text-white p-2.5 shadow-2xl"
                                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}>
                                <div className="flex items-center justify-between gap-x-8">
                                    <div className="text-left">
                                        <div className="text-yellow-400 text-[0.6rem] font-semibold uppercase tracking-wider mb-1">Round</div>
                                        <div className="text-1xl font-bold text-white">
                                            {gameState.currentRound}<span className="text-yellow-400">/5</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-yellow-400 text-[0.6rem] font-semibold uppercase tracking-wider mb-1">Score</div>
                                        <div className="text-1xl font-bold text-white">{gameState.totalScore.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>
                    <div className="flex flex-1 flex-row relative">
                        {/* Image container */}
                        <div className="">
                            {/* Image positioned at leftmost part of container */}
                            <div className="h-full w-screen flex items-center items-start pt-0">
                                <div
                                    className={`relative rounded-2xl m-4 overflow-hidden bg-white ${imageLoaded ? 'border-4 border-black' : ''}`}
                                    style={{
                                        transform: 'scale(1)',
                                        transformOrigin: 'left center',
                                        transition: 'transform 0.1s ease'
                                    }}
                                >
                                    {images[gameState.currentRound - 1]?.url ? (
                                        <>
                                            {/* Simple Loading Skeleton */}
                                            {!imageLoaded && (
                                                <div className="absolute inset-0 bg-gray-200 animate-pulse">
                                                    <div className="h-full w-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" />
                                                </div>
                                            )}
                                            
                                            <img
                                                src={images[gameState.currentRound - 1].url}
                                                alt="Level"
                                                className={`block w-auto h-auto object-contain transition-opacity duration-500 ${
                                                    imageLoaded ? 'opacity-100' : 'opacity-0'
                                                }`}
                                                style={{
                                                    maxWidth: 'calc(100vw)',
                                                    maxHeight: 'calc(100svh - 200px)',
                                                    width: 'auto',
                                                    height: 'auto'
                                                }}
                                                onLoad={() => setImageLoaded(true)}
                                                onError={() => setImageLoaded(false)}
                                            />
                                        </>
                                    ) : (
                                        <div className="w-96 h-72 flex items-center justify-center animate-pulse rounded-2xl">
                                            <div className="w-24 h-24 rounded" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Mobile Game Map */}
                        <GameMapMobile 
                            onPlaceGuess={actions.placeGuess}
                            onSubmitGuess={() => actions.submitGuess(images[gameState.currentRound - 1])}
                            userGuess={gameState.userGuess}
                            isExpanded={gameState.isMapExpanded}
                            onToggleExpanded={actions.toggleMapExpanded}
                            disabled={gameState.gamePhase === 'results'}
                        />
                    </div>
                </div>
            )}
                
            {/* Results Modal */}
            <ResultsPopUp
                showResults={gameState.showResults}
                userGuess={gameState.userGuess}
                actualLocation={{
                    lat: images[gameState.currentRound - 1]?.lat || 0,
                    lng: images[gameState.currentRound - 1]?.lng || 0
                }}
                distance={gameState.roundResults[gameState.currentRound - 1]?.distance || 0}
                score={gameState.roundScore}
                totalScore={gameState.totalScore}
                currentRound={gameState.currentRound}
                onNext={actions.nextRound}
            />
        </main>
    );
}