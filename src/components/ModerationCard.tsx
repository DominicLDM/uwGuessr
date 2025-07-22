"use client"

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { useMutation, gql } from '@apollo/client';

const APPROVE_PHOTO = gql`
mutation ApprovePhoto($id: ID!, $lat: Float!, $lng: Float!) {
		approvePhoto(id: $id, lat: $lat, lng: $lng) {
		id
		status
		lat
		lng
		}
}
`;

const REJECT_PHOTO = gql`
mutation RejectPhoto($id: ID!) {
		rejectPhoto(id: $id) {
		id
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


mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function ModerationCard({ photo }: { photo: Photo }) {
	const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null);
	const mapContainer = useRef<HTMLDivElement>(null);
	const [approvePhoto] = useMutation(APPROVE_PHOTO);
	const [rejectPhoto] = useMutation(REJECT_PHOTO);

	useEffect(() => {
		if (!mapContainer.current) return;

		const map = new mapboxgl.Map({
			container: mapContainer.current,
			style: 'mapbox://styles/mapbox/standard',
			center: [-80.5417, 43.4723], // Waterloo, ON
			zoom: 16,
			pitch: 0,
			bearing: -20,
			antialias: true,
		});

		map.on('load', () => {
			map.addLayer({
				id: '3d-buildings',
				source: 'composite',
				'source-layer': 'building',
				filter: ['==', 'extrude', 'true'],
				type: 'fill-extrusion',
				minzoom: 15,
				paint: {
					'fill-extrusion-color': '#aaa',
					'fill-extrusion-height': ['get', 'height'],
					'fill-extrusion-base': ['get', 'min_height'],
					'fill-extrusion-opacity': 0.6,
				},
			});
		});
		let currentMarker: mapboxgl.Marker | null = null;

		map.on('click', (e) => {
			const { lat, lng } = e.lngLat;
			if (currentMarker) {
				currentMarker.remove();
			}
			const newMarker = new mapboxgl.Marker({ color: 'red' }).setLngLat([lng, lat]).addTo(map);
			currentMarker = newMarker;
			setMarker({ lat, lng });
		});

		return () => map.remove();
	}, [photo.id]);

	const handleApprove = async () => {
		if (!marker) return alert('Select a location first.');
		await approvePhoto({ variables: { id: photo.id, lat: marker.lat, lng: marker.lng } });
		window.location.reload(); // simple reload to refresh list
	};

	const handleReject = async () => {
		await rejectPhoto({ variables: { id: photo.id } });
		window.location.reload();
	};

	return (
		<div className="border p-4 rounded shadow">
			<img src={photo.url} alt="submission" className="rounded max-w-md mb-4" />
			<div ref={mapContainer} className="w-full h-64 mb-4 rounded" />
			<button onClick={handleApprove} className="bg-green-600 text-white px-4 py-2 rounded mr-2">
				✅ Approve
			</button>
			<button onClick={handleReject} className="bg-red-600 text-white px-4 py-2 rounded">
				❌ Reject
			</button>
		</div>
	);
}
