'use client'

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import mapboxgl from 'mapbox-gl';
import { ArrowLeft } from 'lucide-react';
import { campusBoundaries } from '../../components/campusBoundaries';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function ModalImage({ src, onClose }: { src: string; onClose: () => void }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (imageLoaded && (e.target as HTMLElement).id === 'photo-modal-bg') {
        onClose();
      }
    }
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [imageLoaded, onClose]);

  return (
    <>
      {imageLoaded ? (
        <div className="relative bg-white border-4 border-black rounded-lg shadow-2xl max-w-4xl max-h-full overflow-hidden">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-black/80 border border-black shadow-lg cursor-pointer text-white hover:text-yellow-500 text-2xl transition-colors flex items-center justify-center"
            aria-label="Close photo"
          >
            ✕
          </button>
          <img
            src={src}
            alt="Photo"
            className={`block max-w-full max-h-[90vh] object-contain transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ minWidth: '300px', minHeight: '200px' }}
          />
        </div>
      ) : null}
      {!imageLoaded && (
        <img
          src={src}
          alt="Photo"
          style={{ display: 'none' }}
          onLoad={() => setImageLoaded(true)}
        />
      )}
    </>
  );
}

export default function MapPage() {
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [photos, setPhotos] = useState<{ url: string; lat: number; lng: number }[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchPhotos() {
      const { data } = await supabase
        .from('photos')
        .select('url, lat, lng')
        .eq('status', 'approved');
      if (data) {
        setPhotos(data);
      }
    }
    fetchPhotos();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-80.5417, 43.4723],
      zoom: 16,
      pitch: 0,
      bearing: -20,
      antialias: false,
      maxTileCacheSize: 50,
    });
    
    mapRef.current = map;
    
    map.on('load', () => {
      setMapLoaded(true);
      if (campusBoundaries && campusBoundaries.type === "FeatureCollection") {
        try {
          map.addSource('campus-boundaries', {
            'type': 'geojson',
            'data': campusBoundaries as GeoJSON.FeatureCollection
          });

          map.addLayer({
            'id': 'campus-boundary-line',
            'type': 'line',
            'source': 'campus-boundaries',
            'layout': {},
            'paint': {
              'line-color': '#EAB308',
              'line-width': 4,
              'line-opacity': 0.9
            }
          });

          map.addLayer({
            'id': 'campus-boundary-fill',
            'type': 'fill',
            'source': 'campus-boundaries',
            'layout': {},
            'paint': {
              'fill-color': '#EAB308', 
              'fill-opacity': 0.01
            }
          }, 'campus-boundary-line');
        } catch (error) {
          console.warn('Error adding campus boundaries to map:', error);
        }
      }
    });
    
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded || photos.length === 0) return;

    const win = window as Window & { photoMarkers?: mapboxgl.Marker[] };
    if (win.photoMarkers && Array.isArray(win.photoMarkers)) {
      win.photoMarkers.forEach((marker: mapboxgl.Marker) => marker.remove());
    }
    win.photoMarkers = [];

    // Add markers for each photo
    photos.forEach(photo => {
      const marker = new mapboxgl.Marker({ color: 'red' })
        .setLngLat([photo.lng, photo.lat])
        .addTo(mapRef.current!);
      marker.getElement().style.cursor = 'pointer';
      marker.getElement().title = `${photo.lat.toFixed(6)}, ${photo.lng.toFixed(6)}`;
      win.photoMarkers!.push(marker);
      marker.getElement().addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation();
        setActivePhoto(photo.url);
      });
    });
  }, [photos, mapLoaded]);

  return (
    <div className="w-screen h-screen flex flex-col bg-[hsla(46,86%,99.5%,1.00)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b-2 border-black" style={{ minHeight: '56px' }}>
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-yellow-500 transition-colors group cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 cursor-pointer group-hover:-translate-x-1 transition-transform" />
          <span className="text-base font-medium">Back to Home</span>
        </button>
        <span className="text-lg font-bold text-black">Map</span>
      </div>
      
      <div className="flex-1 w-full h-full relative">
        <div ref={mapContainer} className="absolute inset-0 w-full h-full rounded-none bg-gray-100" />
        
        {!mapLoaded && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="w-8 h-8 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">Loading map...</p>
            </div>
          </div>
        )}
        
        {activePhoto && (
          <div id="photo-modal-bg" className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background: 'rgba(0,0,0,0.3)'}}>
            <ModalImage src={activePhoto} onClose={() => setActivePhoto(null)} />
          </div>
        )}
      </div>
    </div>
  );
}