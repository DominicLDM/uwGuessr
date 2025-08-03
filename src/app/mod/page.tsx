"use client"

import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
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

import { useState, useEffect } from "react";

function ModContent() {
  const { isAuthenticated, user, loginWithRedirect, logout } = useAuth0();
  const { data, error, refetch } = useQuery(GET_PHOTOS, { variables: { status: "pending" } });
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [data?.photos?.length]);

  if (!isAuthenticated) {
    return (
      <main className="p-4 flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Admin Login</h1>
        <button
          className="bg-black text-white px-4 py-2 rounded"
          onClick={() => loginWithRedirect()}
        >
          Login with Auth0
        </button>
      </main>
    );
  }
  // Only allow admin email to access the moderation dashboard
  if (user?.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return (
      <main className="p-4 flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <button
          className="bg-black text-white px-4 py-2 rounded"
          onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
        >
          Logout
        </button>
      </main>
    );
  }

  if (error) return <div>Error: {error.message}</div>;

  const photos = data?.photos || [];
  const currentPhoto = photos[currentIndex];

  const handleModerated = async () => {
    await refetch();
    setCurrentIndex(0);
  };

  return (
    <main className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">🛠 Moderation Dashboard</h1>
        <button
          className="bg-black text-white px-4 py-2 rounded ml-4"
          onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
        >
          Logout
        </button>
      </div>
      <div className="space-y-10">
        {currentPhoto ? (
          <ModerationCard key={currentPhoto.id} photo={currentPhoto} onModerated={handleModerated} />
        ) : (
          <div className="text-center text-lg text-green-700 font-semibold py-20">No more pending photos to moderate! 🎉</div>
        )}
      </div>
    </main>
  );
}

export default function ModPage() {
  return (
    <Auth0Provider
      domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN || ""}
      clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || ""}
      authorizationParams={{
        redirect_uri: typeof window !== "undefined" ? window.location.origin + "/mod" : "",
      }}
    >
      <ModContent />
    </Auth0Provider>
  );
}