'use client';

/**
 * LocationPicker — Google Places autocomplete via the Maps JS API directly.
 *
 * Loads `@react-google-maps/api`'s places library with our own Maps key.
 * No external proxy needed (the hipop proxy is CORS-restricted to hipop's
 * own domain).
 *
 * Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in env and the Maps JavaScript API
 * + Places API to be enabled in GCP for that key.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { MapPin, Crosshair } from 'lucide-react';
import { useJsApiLoader } from '@react-google-maps/api';
import { ATLANTA_CENTER } from '@/lib/constants';

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
const LIBRARIES: 'places'[] = ['places'];

export interface PlaceDetails {
  address: string;
  neighborhood: string | null;
  city: string;
  state: string;
  zipCode: string | null;
  latitude: number;
  longitude: number;
  placeId: string | null;
}

interface Prediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface LocationPickerProps {
  onLocationSelected: (details: PlaceDetails) => void;
  onInputChange?: (value: string) => void;
  initialAddress?: string;
  placeholder?: string;
  className?: string;
}

export default function LocationPicker({
  onLocationSelected,
  onInputChange,
  initialAddress = '',
  placeholder = 'Search an address in Atlanta...',
  className = '',
}: LocationPickerProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: MAPS_KEY,
    libraries: LIBRARIES,
  });

  const [inputValue, setInputValue] = useState(initialAddress);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Lazily-created services (created when API loads).
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    if (initialAddress) setInputValue(initialAddress);
  }, [initialAddress]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Initialize Google services once API is loaded.
  useEffect(() => {
    if (!isLoaded) return;
    autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
    // PlacesService requires a node — a detached div works fine.
    const node = document.createElement('div');
    placesServiceRef.current = new google.maps.places.PlacesService(node);
    geocoderRef.current = new google.maps.Geocoder();
    sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
  }, [isLoaded]);

  /** Build PlaceDetails from a Google address-components array + lat/lng. */
  function parseToPlaceDetails(
    addressComponents: google.maps.GeocoderAddressComponent[],
    formattedAddress: string,
    lat: number,
    lng: number,
    placeId: string | null,
  ): PlaceDetails {
    let city = '';
    let state = '';
    let zipCode: string | null = null;
    let neighborhood: string | null = null;
    for (const c of addressComponents) {
      const types: string[] = c.types || [];
      if (types.includes('neighborhood') && !neighborhood) neighborhood = c.long_name;
      if (types.includes('sublocality') && !neighborhood) neighborhood = c.long_name;
      if (types.includes('locality') && !city) city = c.long_name;
      if (types.includes('administrative_area_level_1')) state = c.short_name || c.long_name;
      if (types.includes('postal_code')) zipCode = c.long_name;
    }
    return {
      address: formattedAddress,
      neighborhood,
      city: city || 'Atlanta',
      state: state || 'GA',
      zipCode,
      latitude: lat,
      longitude: lng,
      placeId,
    };
  }

  const fetchPredictions = useCallback(
    (input: string) => {
      if (input.length < 3 || !autocompleteServiceRef.current) {
        setPredictions([]);
        return;
      }
      setIsLoading(true);
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input,
          sessionToken: sessionTokenRef.current ?? undefined,
          componentRestrictions: { country: 'us' },
          // Bias toward Atlanta.
          location: new google.maps.LatLng(ATLANTA_CENTER.lat, ATLANTA_CENTER.lng),
          radius: 50_000,
        },
        (results, status) => {
          setIsLoading(false);
          if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
            setPredictions([]);
            return;
          }
          const preds: Prediction[] = results.map((p) => ({
            placeId: p.place_id,
            description: p.description,
            mainText: p.structured_formatting?.main_text || p.description,
            secondaryText: p.structured_formatting?.secondary_text || '',
          }));
          setPredictions(preds);
          setShowDropdown(preds.length > 0);
        },
      );
    },
    [],
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setInputValue(value);
    onInputChange?.(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(value), 250);
  }

  function handleSelectPlace(prediction: Prediction) {
    setInputValue(prediction.description);
    setShowDropdown(false);
    setPredictions([]);
    setLocationError(null);

    if (!placesServiceRef.current) return;

    placesServiceRef.current.getDetails(
      {
        placeId: prediction.placeId,
        fields: ['address_components', 'formatted_address', 'geometry', 'name', 'place_id'],
        sessionToken: sessionTokenRef.current ?? undefined,
      },
      (result, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !result) return;
        const lat = result.geometry?.location?.lat() ?? 0;
        const lng = result.geometry?.location?.lng() ?? 0;
        const details = parseToPlaceDetails(
          result.address_components || [],
          result.formatted_address || prediction.description,
          lat,
          lng,
          prediction.placeId,
        );
        // Refresh the session token — a session ends after a getDetails call.
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        onLocationSelected(details);
      },
    );
  }

  /** "Use my current location" — geolocation + reverse geocode. */
  function useMyLocation() {
    setLocationError(null);

    if (!('geolocation' in navigator)) {
      setLocationError("This device doesn't support location services.");
      return;
    }
    if (!geocoderRef.current) {
      setLocationError('Map service still loading — try again in a sec.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        geocoderRef.current!.geocode(
          { location: { lat: latitude, lng: longitude } },
          (results, status) => {
            setLocating(false);
            if (status !== google.maps.GeocoderStatus.OK || !results || results.length === 0) {
              // Still pin the raw coords if we got them, even without a pretty address.
              const fallbackAddress = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
              setInputValue(fallbackAddress);
              setShowDropdown(false);
              onLocationSelected({
                address: fallbackAddress,
                neighborhood: null,
                city: 'Atlanta',
                state: 'GA',
                zipCode: null,
                latitude,
                longitude,
                placeId: null,
              });
              return;
            }
            // Prefer the first street-address result if present, else the first overall.
            const street = results.find((r) => r.types.includes('street_address'));
            const best = street ?? results[0];
            const details = parseToPlaceDetails(
              best.address_components || [],
              best.formatted_address || '',
              latitude,
              longitude,
              best.place_id || null,
            );
            setInputValue(details.address);
            setShowDropdown(false);
            setPredictions([]);
            onLocationSelected(details);
          },
        );
      },
      (err) => {
        setLocating(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setLocationError('Location permission denied. Type your address instead.');
            break;
          case err.POSITION_UNAVAILABLE:
            setLocationError("Couldn't determine your location.");
            break;
          case err.TIMEOUT:
            setLocationError('Location request timed out. Try again.');
            break;
          default:
            setLocationError("Couldn't get your location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 30_000,
      },
    );
  }

  if (loadError) {
    return (
      <div className={`relative ${className}`}>
        <input type="text" className="input" style={{ paddingLeft: '2.75rem' }} disabled placeholder="Map service failed to load" />
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] z-10 text-[#9A9A93] pointer-events-none" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] z-10 text-[#6B6B66] pointer-events-none" />
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => predictions.length > 0 && setShowDropdown(true)}
          placeholder={isLoaded ? placeholder : 'Loading places…'}
          disabled={!isLoaded || locating}
          className="input"
          style={{ paddingLeft: '2.75rem' }}
        />
        {(isLoading || locating) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-[#EAE6DA] border-t-[#0A0A0A] rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Use-my-location button + error */}
      <div className="mt-2 flex items-center justify-between gap-3 text-xs">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={!isLoaded || locating}
          className="inline-flex items-center gap-1.5 font-semibold ink-2 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Crosshair className="w-3.5 h-3.5" style={{ color: '#E94E1B' }} />
          {locating ? 'Locating…' : 'Use my current location'}
        </button>
        {locationError && (
          <span className="text-right" style={{ color: '#991B1B' }}>
            {locationError}
          </span>
        )}
      </div>

      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-[#EAE6DA] rounded-xl shadow-md overflow-hidden">
          {predictions.map((p) => (
            <button
              key={p.placeId}
              type="button"
              onClick={() => handleSelectPlace(p)}
              className="w-full text-left px-4 py-3 hover:bg-[#FAFAF7] border-b border-[#EAE6DA] last:border-b-0 flex items-center gap-3"
            >
              <MapPin className="w-4 h-4 text-[#6B6B66] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{p.mainText}</div>
                <div className="text-xs ink-3 truncate">{p.secondaryText}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
