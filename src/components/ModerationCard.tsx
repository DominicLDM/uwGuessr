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

type ModerationCardProps = { photo: Photo; onModerated?: () => void; adminEmail?: string };

export default function ModerationCard({ photo, onModerated, adminEmail }: ModerationCardProps) {
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
	photo.lat != null && photo.lng != null ? { lat: photo.lat, lng: photo.lng } : null
  );
  const mapContainer = useRef<HTMLDivElement>(null);
  const [approvePhoto] = useMutation(APPROVE_PHOTO);
  const [rejectPhoto] = useMutation(REJECT_PHOTO);

	useEffect(() => {
	if (!mapContainer.current) return;

	const map = new mapboxgl.Map({
	  container: mapContainer.current,
	  style: 'mapbox://styles/mapbox/standard',
	  center: photo.lat != null && photo.lng != null ? [photo.lng, photo.lat] : [-80.5417, 43.4723],
	  zoom: 16,
	  pitch: 0,
	  bearing: -20,
	  antialias: true,
	});

	map.on('load', () => {
	  // Place initial marker if photo has lat/lng
	  if (photo.lat != null && photo.lng != null) {
		const initialMarker = new mapboxgl.Marker({ color: 'red' })
		  .setLngLat([photo.lng, photo.lat])
		  .addTo(map);
		// Keep reference to remove if changed
		currentMarker = initialMarker;
	  }
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
  }, [photo.id, photo.lat, photo.lng]);

  const handleApprove = async () => {
	if (!marker) return alert('Select a location first.');
	await approvePhoto({
	  variables: { id: photo.id, lat: marker.lat, lng: marker.lng },
	  context: {
		headers: {
		  'x-admin-email': adminEmail || ''
		}
	  }
	});
	if (onModerated) onModerated();
  };

  const handleReject = async () => {
	await rejectPhoto({
	  variables: { id: photo.id },
	  context: {
		headers: {
		  'x-admin-email': adminEmail || ''
		}
	  }
	});
	if (onModerated) onModerated();
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
