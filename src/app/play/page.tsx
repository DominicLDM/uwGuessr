"use client"

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from 'react'
// import mapboxgl from 'mapbox-gl'
import { useQuery, gql } from '@apollo/client';

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
    const searchParams = useSearchParams();
    const mode = searchParams.get("mode"); // will be "random" or "daily"

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
        <main className="p-4">
            <div>Mode: {mode}</div>
            <div>Images fetched: {images.length}</div>
            {/* Render your game UI here */}
        </main>
    );
}