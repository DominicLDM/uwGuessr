"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation';
import mapboxgl from 'mapbox-gl'
import imageCompression from 'browser-image-compression';
// Use heic-to for HEIC/HEIF detection and conversion
import { isHeic, heicTo } from 'heic-to';

import { Upload, MapPin, Image as ImageIcon, Send, ArrowLeft } from 'lucide-react';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function UploadPage() {
    const router = useRouter();
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isDragActive, setIsDragActive] = useState(false);
    const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null);
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [compressedImage, setCompressedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [showMap, setShowMap] = useState(false);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isHeicFile, setIsHeicFile] = useState(false);


    // Convert HEIC/HEIF to JPEG, then compress to WebP
    const processImage = async (file: File) => {
        setIsProcessing(true);
        let processedFile = file;
        try {
            // Step 1: Convert HEIC/HEIF to JPEG first if needed
            if (isHeicFile) {
                console.log('Converting HEIC/HEIF to JPEG...');
                const convertedBlob = await heicTo({
                    blob: file,
                    type: 'image/jpeg',
                    quality: 0.9
                });
                processedFile = new File([convertedBlob],
                    file.name.replace(/\.(heic|heif)$/i, '.jpg'),
                    { type: 'image/jpeg' }
                );
                console.log('HEIC conversion successful');
            }
            // Step 2: Compress to WebP (works for JPEG, PNG, etc.)
            const options = {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 2400,
                useWebWorker: true,
                fileType: 'image/webp',
            };
            console.log('Compressing to WebP...');
            const compressed = await imageCompression(processedFile, options);
            console.log('WebP compression successful');
            return compressed;
        } catch (error) {
            console.error('Image processing failed:', error);
            throw new Error(`Failed to process image: ${error}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // Memoized map initialization
    const initializeMap = useCallback(() => {
        if (!mapContainer.current || mapRef.current) return;

        const map = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12', // Faster loading style
            center: [-80.5417, 43.4723], // Waterloo, ON
            zoom: 16,
            pitch: 0,
            bearing: -20,
            antialias: false,
            // Performance optimizations
            preserveDrawingBuffer: false,
            refreshExpiredTiles: false,
            maxTileCacheSize: 50
        });

        mapRef.current = map;

        // Set mapLoaded to true when map is ready
        map.on('load', () => {
            setMapLoaded(true);
        });

        map.on('error', (e) => {
            console.error('Map error:', e);
            setMapLoaded(true);
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

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (showMap) {
            // Small delay to ensure DOM is ready
            const timer = setTimeout(initializeMap, 100);
            return () => clearTimeout(timer);
        }
    }, [showMap, initializeMap]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Use Next.js router for client-side navigation
    const handleBackToHome = () => {
        router.push('/');
    };

    // Helper to handle a File directly
    const handleFile = async (file: File) => {
        console.log('Selected file:', file);
        const heic = await isHeic(file);
        setIsHeicFile(heic);
        if (!file.type.startsWith('image/') && !heic) {
            alert('Please select an image file');
            return;
        }
        setSelectedFile(file);
        setImagePreview(URL.createObjectURL(file));
        try {
            // Process the image (HEIC conversion + WebP compression)
            const compressed = await processImage(file);
            setCompressedImage(compressed);
            console.log('Original size:', file.size, 'bytes');
            console.log('Processed size:', compressed.size, 'bytes');
            console.log('Size reduction:', Math.round((1 - compressed.size / file.size) * 100) + '%');
        } catch (error) {
            console.error('Error processing image:', error);
            alert('Error processing image: ' + error);
            return;
        }
        setShowMap(true);
    };

    // Drag-and-drop handlers must be top-level, not inside handleFileSelect
    const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragActive(false);
        const file = event.dataTransfer.files?.[0];
        if (!file) return;
        await handleFile(file);
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        setIsDragActive(true);
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragActive(false);
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        await handleFile(file);
    };

    const handleUpload = async () => {
        if (!selectedFile || !compressedImage || !marker) {
            alert('Please select an image and mark a location on the map');
            return;
        }

        setIsUploading(true);

        const formData = new FormData();
        formData.append('file', compressedImage);
        formData.append('lat', String(marker.lat));
        formData.append('lng', String(marker.lng));
        formData.append('added_by', 'player'); // temp
        formData.append('status', 'pending');

        const response = await fetch('/api/upload-photo', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            setSuccessMessage('Photo uploaded successfully!');
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setSuccessMessage(null);
                setSelectedFile(null);
                setCompressedImage(null);
                setMarker(null);
                setImagePreview(null);
                setShowMap(false);
                setMapLoaded(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                if (mapRef.current) {
                    mapRef.current.remove();
                    mapRef.current = null;
                }
                setIsUploading(false);
            }, 2000);
        } else {
            setIsUploading(false);
            alert('Upload failed. Please try again.');
        }
    };

    return (
        <div className="min-h-screen" style={{ backgroundColor: "hsla(46, 86%, 99.5%, 1.00)" }}>
            {successMessage && (
                <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg text-lg animate-in fade-in">
                    {successMessage}
                </div>
            )}
            
            {/* Back Button */}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
                <button
                    onClick={handleBackToHome}
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-yellow-500 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm sm:text-base font-medium">Back to Home</span>
                </button>
            </div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-4 lg:py-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header - Responsive typography and spacing */}
                    <div className="text-center mb-8 sm:mb-12 lg:mb-16">
                        <h1 className="text-3xl sm:text-4xl lg:text-6xl xl:text-7xl font-bold mb-3 sm:mb-4 lg:mb-6">
                            <span className="text-black">Upload a Photo</span>
                        </h1>
                        <p className="text-slate-900 text-base sm:text-lg lg:text-xl max-w-2xl lg:max-w-4xl mx-auto leading-relaxed px-4">
                            Help expand the <span className="font-medium"><span className="font-medium text-yellow-500">uw</span>Guessr</span> database! Upload a photo from around campus and mark its location on the map.
                        </p>
                        <p className="text-slate-700 mt-2 text-sm sm:text-base">
                            Need help or have questions? <a href="https://www.instagram.com/dom_ldm/" className="text-yellow-500 font-medium cursor-pointer hover:underline" target="_blank" rel="noopener noreferrer">Contact me!</a>
                        </p>
                    </div>

                    {/* Main Upload Card - Responsive layout */}
                    <div className="bg-white backdrop-blur-sm rounded-2xl lg:rounded-3xl shadow-xl lg:shadow-2xl border-black border-5 overflow-hidden">
                        {/* Two-column layout on large screens */} 
                        <div className="lg:grid lg:grid-cols-2 lg:gap-0">
                            {/* Image Upload Section */}
                            <div className="p-4 sm:p-6 lg:p-8 xl:p-10 border-b lg:border-b-0 lg:border-r border-gray-100">
                                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                                        <ImageIcon className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                                    </div>
                                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-black">Select Your Photo</h2>
                                </div>

                                <p className="text-gray-600 mb-4 text-sm sm:text-base">
                                    Please ensure the image is guessable and relevant! HEIC/HEIF files are now supported.
                                </p>
                                
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                
                                {!selectedFile ? (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                        onDragEnter={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        className={`border-2 sm:border-3 border-dashed rounded-xl p-6 sm:p-8 lg:p-12 text-center cursor-pointer transition-all duration-300 group w-full h-64 sm:h-80 lg:h-96 xl:h-[400px] flex flex-col justify-center bg-gray-100 ${isDragActive ? 'border-yellow-500 bg-yellow-50/70' : 'border-gray-300 hover:border-yellow-500 hover:bg-yellow-50/50'}`}
                                    >
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                                            <Upload className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
                                        </div>
                                        <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-800 mb-2">Drop your photo here</h3>
                                        <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">or click to browse files</p>
                                        <p className="text-xs sm:text-sm text-gray-500">JPEG, PNG, WEBP, HEIC, HEIF up to 10MB</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="relative rounded-xl overflow-hidden shadow-lg w-full h-64 sm:h-80 lg:h-96 xl:h-[400px] bg-gray-100">
                                            <img 
                                                src={imagePreview ?? undefined}
                                                alt="Selected photo" 
                                                className="w-full h-full object-contain bg-black/90"
                                            />
                                            {isProcessing && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                    <div className="text-center text-white">
                                                        <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                                        <p className="text-sm">
                                            {isHeicFile ? 'Converting HEIC/HEIF...' : 'Processing image...'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-center space-y-3">
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isProcessing}
                                                className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors inline-flex items-center gap-2 text-sm sm:text-base"
                                            >
                                                <ImageIcon className="w-4 h-4" />
                                                Choose Different Photo
                                            </button>
                                            {isHeicFile && !isProcessing && compressedImage && (
                                                <p className="text-green-600 text-sm">
                                                    ✓ HEIC/HEIF converted successfully
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Map Section */}
                            <div className={`p-4 sm:p-6 lg:p-8 xl:p-10 transition-all duration-500 ${showMap && !isProcessing ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                                        <MapPin className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                                    </div>
                                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-black">Mark the Location</h2>
                                </div>
                                <p className="text-gray-600 mb-4 text-sm sm:text-base">
                                    {showMap && !isProcessing ? 'Click on the map where this photo was taken' : 'Upload and process a photo first to enable map selection'}
                                </p>
                                
                                <div className="relative">
                                    <div 
                                        ref={mapContainer} 
                                        className="w-full h-64 sm:h-80 lg:h-96 xl:h-[400px] rounded-xl overflow-hidden shadow-inner bg-gray-100"
                                    />
                                    {showMap && !mapLoaded && (
                                        <div className="absolute inset-0 bg-gray-100 rounded-xl flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="w-8 h-8 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                                <p className="text-gray-600 text-sm">Loading map...</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {marker && (
                                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 sm:p-3 animate-in fade-in duration-300">
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                                            </div>
                                            <p className="text-green-800 font-medium text-sm sm:text-base break-all">
                                                Location: {marker.lat.toFixed(6)}, {marker.lng.toFixed(6)}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Upload Button - Full width bottom section */}
                        <div className="p-4 sm:p-6 lg:p-8 border-t border-gray-100 bg-gray-50/50">
                            <div className="max-w-md mx-auto lg:max-w-2xl">
                                <button
                                    onClick={handleUpload}
                                    disabled={!selectedFile || !compressedImage || !marker || isUploading || isProcessing}
                                    className={`w-full py-3 sm:py-4 px-6 sm:px-8 rounded-xl font-bold text-base sm:text-lg transition-all duration-300 ${
                                        !selectedFile || !compressedImage || !marker || isUploading || isProcessing
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                                    }`}
                                >
                                    {isUploading ? (
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 sm:border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Uploading your photo...</span>
                                        </div>
                                    ) : isProcessing ? (
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 sm:border-3 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                                            <span>Processing image...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-3">
                                            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                                            <span>Upload Photo to Database</span>
                                        </div>
                                    )}
                                </button>
                                
                                {(!selectedFile || !marker || isProcessing) && selectedFile && (
                                    <p className="text-center text-gray-500 mt-3 text-sm sm:text-base">
                                        {isProcessing ? 'Processing your image...' : !marker ? 'Please mark the location on the map to continue' : ''}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}