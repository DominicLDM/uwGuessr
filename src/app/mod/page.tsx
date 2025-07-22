"use client"

type Photo = {
id: string;
url: string;
lat: number | null;
lng: number | null;
building: string;
floor: number;
added_by: string;
created_at: string;
status: string;
};

import { useQuery, gql } from "@apollo/client";
import ModerationCard from '@/components/ModerationCard';

const GET_PHOTOS = gql`
query GetPhotos($status: String) {
	photos(status: $status) {
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

export default function ModPage() {
const { data, loading, error } = useQuery(GET_PHOTOS, { variables: { status: "pending" } });

if (loading) return <div>Loading...</div>;
if (error) return <div>Error: {error.message}</div>;

return (
	<main className="p-4">
	<h1 className="text-2xl font-bold mb-6">🛠 Moderation Dashboard</h1>
	<div className="space-y-10">
			{data?.photos?.map((photo: Photo) => (
			<ModerationCard key={photo.id} photo={photo} />
			))}
	</div>
	</main>
);
}