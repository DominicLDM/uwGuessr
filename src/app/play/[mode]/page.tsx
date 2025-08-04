"use client"

import { useParams } from "next/navigation";
import { useEffect, useState } from 'react'
import { useQuery, gql, useApolloClient } from '@apollo/client';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useGameState } from '@/hooks/useGameState'
import { Photo } from '@/types/game'
import GameMap from '@/components/GameMap'
import GameMapMobile from '@/components/GameMapMobile';

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

// Lightweight ping query to wake up GraphQL server
const PING_QUERY = gql`
  query Ping {
    __typename
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
    
    const { gameState, actions } = useGameState()
    const client = useApolloClient()

    const params = useParams();
    const { mode } = params;

    // Connection warming and prefetching
    useEffect(() => {
        // Warm up the connection with a ping
        client.query({ 
            query: PING_QUERY,
            fetchPolicy: 'no-cache'
        }).catch(err => console.log('Ping failed:', err));

        // Prefetch both query types to warm up the cache
        if (mode) {
            const otherMode = mode === "random" ? "daily" : "random";
            const otherQuery = otherMode === "random" ? GET_RANDOM_PHOTOS : GET_DAILY_PHOTOS;
            
            client.query({
                query: otherQuery,
                variables: { count: 5 },
                fetchPolicy: 'cache-first'
            }).catch(err => console.log('Prefetch failed:', err));
        }
    }, [client, mode]);

    const { data, error } = useQuery(
        mode === "random" ? GET_RANDOM_PHOTOS : GET_DAILY_PHOTOS,
        { variables: { count: 5 }, skip: !mode }
    );

    useEffect(() => {
        if (data) {
            setImages(mode === "random" ? data.randomPhotos : data.dailyPhotos);
            actions.startRound(); // Start the round timer
        }
    }, [data, mode]);

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
        <main className="h-svh w-screen flex flex-col" style={{ backgroundColor: "hsla(46, 86%, 99.5%, 1.00)" }}>
            <header className="flex w-screen justify-between items-center p-4">
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
                    <div className="absolute inset-0 shadow-xl transform sm:translate-x-2.5 sm:translate-y-2.5 translate-x-1.5 translate-y-1.5"
                        style={{ clipPath: 'polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 22px 100%, 0 calc(100% - 22px))' }}>
                        <div className="h-full flex">
                            <div className="flex-1 bg-yellow-400"></div>
                        </div>
                    </div>
                    <div className="absolute inset-0 shadow-xl transform sm:translate-x-1.25 sm:translate-y-1.25 translate-x-0.75 translate-y-0.75"
                        style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))' }}>
                        <div className="h-full flex">
                            <div className="flex-1 bg-yellow-300"></div>
                        </div>
                    </div>
                    <div className="relative bg-black text-white p-2.5 sm:p-4.5 shadow-2xl"
                        style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}>
                        <div className="flex items-center justify-between sm:gap-x-16 gap-x-8">
                        <div className="text-left">
                            <div className="text-yellow-400 sm:text-[0.8rem] text-[0.6rem] font-semibold uppercase tracking-wider mb-1">Round</div>
                            <div className="sm:text-3xl text-1xl font-bold text-white">
                            {gameState.currentRound}<span className="text-yellow-400">/5</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-yellow-400 sm:text-[0.8rem] text-[0.6rem] font-semibold uppercase tracking-wider mb-1">Score</div>
                            <div className="sm:text-3xl text-1xl font-bold text-white">{gameState.totalScore.toLocaleString()}</div>
                        </div>
                        </div>
                    </div>
                </div>
            </header>
            <div className="flex flex-1 flex-row relative">
                {/* Image container - 80% width desktop, 95% mobile */}
                <div className="">
                    {/* Image positioned at leftmost part of container */}
                    <div className="h-full w-screen flex items-center sm:items-center items-start pt-0">
                        <div
                            className={`relative rounded-2xl m-4 sm:m-6 overflow-hidden bg-white ${imageLoaded ? 'border-4 border-black' : ''}`}
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
                                    
                                    <TransformWrapper
                                minScale={1}
                                maxScale={4}
                                limitToBounds={true}
                                centerOnInit={true}
                                wheel={{ smoothStep: 0.005}}
                                doubleClick={{ mode: 'toggle' }}
                                panning={{ velocityDisabled: false }}
                                smooth={true}
                                disabled={isMobile ? true : false}
                                >
                                <TransformComponent>
                                <img
                                    src={images[gameState.currentRound - 1].url}
                                    alt="Level"
                                    className={`block w-auto h-auto max-w-none max-h-none object-contain transition-opacity duration-500 ${
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
                </div>
                
                {/* Interactive Game Map with Submit Button */}
                {isMobile !== null && (
                    !isMobile ? (
                        <GameMap 
                            onPlaceGuess={actions.placeGuess}
                            onSubmitGuess={() => actions.submitGuess(images[gameState.currentRound - 1])}
                            userGuess={gameState.userGuess}
                            isExpanded={gameState.isMapExpanded}
                            onToggleExpanded={actions.toggleMapExpanded}
                            disabled={gameState.gamePhase === 'results'}
                        />
                    ) : (
                        <GameMapMobile 
                            onPlaceGuess={actions.placeGuess}
                            onSubmitGuess={() => actions.submitGuess(images[gameState.currentRound - 1])}
                            userGuess={gameState.userGuess}
                            isExpanded={gameState.isMapExpanded}
                            onToggleExpanded={actions.toggleMapExpanded}
                            disabled={gameState.gamePhase === 'results'}
                        />
                    )
                )}
                
                {/* Results Modal */}
                {gameState.showResults && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-2xl border-4 border-black shadow-2xl max-w-md w-full mx-4">
                      <h2 className="text-2xl font-bold mb-4">Round {gameState.currentRound} Results</h2>
                      <div className="space-y-2">
                        <p><span className="font-semibold">Distance:</span> {gameState.roundResults[gameState.currentRound - 1]?.distance.toFixed(0)}m</p>
                        <p><span className="font-semibold">Score:</span> {gameState.roundScore.toLocaleString()} points</p>
                        <p><span className="font-semibold">Total Score:</span> {gameState.totalScore.toLocaleString()} points</p>
                      </div>
                      <button
                        onClick={actions.nextRound}
                        className="mt-6 w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded-xl border-2 border-black transition-colors"
                      >
                        {gameState.currentRound >= 5 ? 'View Final Results' : 'Next Round'}
                      </button>
                    </div>
                  </div>
                )}
            </div>
        </main>
    );
}