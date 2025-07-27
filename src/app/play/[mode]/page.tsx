"use client"

import { useParams } from "next/navigation";
import { useEffect, useState } from 'react'
// import mapboxgl from 'mapbox-gl'
import { useQuery, gql } from '@apollo/client';
// import { Button } from "@/components/ui/button"
// import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"

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

type Photo = {
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

export default function PlayPage() {
    const [images, setImages] = useState<Photo[]>([]);
    // const [isMapExpanded, setIsMapExpanded] = useState(false);
    const [currentRound, /* setCurrentRound */] = useState(1);
    const [score, /* setScore */] = useState(10000);

    const params = useParams();
    const { mode } = params; // will be "random" or "daily"

    const { data, loading, error } = useQuery(
        mode === "random" ? GET_RANDOM_PHOTOS : GET_DAILY_PHOTOS,
        { variables: { count: 5 }, skip: !mode }
    );

    useEffect(() => {
        if (data) {
            setImages(mode === "random" ? data.randomPhotos : data.dailyPhotos);
        }
    }, [data, mode]);

    if (loading) return <main className="p-4">Loading...</main>;

    if (error) {
        return <main className="p-4 text-red-600">Error: {error.message}</main>;
    }

    return (
        <main className="h-screen flex flex-col" style={{ backgroundColor: "hsla(46, 86%, 99.5%, 1.00)" }}>
            <header className="flex justify-between items-center p-4">
                <div className="flex items-center">
                    <h1 className="text-4xl sm:text-6xl font-bold font-black tracking-tight flex items-center justify-center -mt-1 sm:-mt-3">
                        <span className="text-yellow-500 mr-0.5">uw</span>
                        <span className="text-black flex items-center">
                            <Image src="/G.svg" alt="G" width={30} height={30} className="inline-block align-middle mx-0 -mr-0.25 sm:w-[52px] sm:h-[52px] w-[30px] h-[30px]" />
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
                            {currentRound}<span className="text-yellow-400">/5</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-yellow-400 sm:text-[0.8rem] text-[0.6rem] font-semibold uppercase tracking-wider mb-1">Score</div>
                            <div className="sm:text-3xl text-1xl font-bold text-white">{score.toLocaleString()}</div>
                        </div>
                        </div>
                    </div>
                </div>
            </header>
            <div className="flex flex-1 flex-row relative">
                {/* Image area */}
                <div className="flex-1 flex items-center justify-center">
                    <div className="relative w-full h-full max-w-4xl max-h-[80vh] flex items-center justify-center bg-gray-100 rounded-lg">
                        {images[currentRound - 1]?.url ? (
                            <Image
                                src={images[currentRound - 1].url}
                                alt="Level"
                                fill
                                className="object-contain transition-opacity duration-300 opacity-100"
                                sizes="(max-width: 1200px) 100vw, 50vw"
                            />
                        ) : (
                            <div className="w-24 h-24 animate-pulse bg-gray-200 rounded" />
                        )}
                    </div>
                </div>
                {/* Right-side design space */}
                <div className="w-32 lg:w-48"></div>
                {/* Mapbox map (absolutely positioned) */}
                <div className="absolute bottom-8 right-8 w-80 h-64 z-10">

                </div>
            </div>
        </main>
    );
}