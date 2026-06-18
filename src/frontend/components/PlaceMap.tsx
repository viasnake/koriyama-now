import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Place } from "../../shared/types";

type PlaceMapProps = {
  place: Place;
};

export default function PlaceMap({ place }: PlaceMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || place.lat === undefined || place.lng === undefined) {
      return;
    }

    const position: [number, number] = [place.lat, place.lng];
    if (!mapRef.current) {
      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false
      }).setView(position, 16);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);

      const marker = L.marker(position, {
        icon: makePlaceIcon(place),
        title: place.name
      }).addTo(map);

      mapRef.current = map;
      markerRef.current = marker;
      window.setTimeout(() => map.invalidateSize(), 80);
      return;
    }

    mapRef.current.setView(position, 16, { animate: false });
    markerRef.current?.setLatLng(position).setIcon(makePlaceIcon(place));
  }, [place]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="place-map" aria-label={`${place.name}の地図`} />;
}

function makePlaceIcon(place: Place): L.DivIcon {
  const category = markerCategory(place);

  return L.divIcon({
    className: `map-pin map-pin--${category} is-selected`,
    html: '<span class="map-pin__glyph"></span>',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

function markerCategory(place: Place): string {
  const values = [place.category, place.subcategory].filter((value): value is string => Boolean(value));

  if (values.includes("aed") || values.includes("safety")) {
    return "aed";
  }
  if (values.includes("public_wifi") || values.includes("wifi")) {
    return "public_wifi";
  }
  if (values.includes("public_toilets") || values.includes("toilets")) {
    return "public_toilets";
  }
  if (values.includes("medical") || values.includes("medical_institutions")) {
    return "medical";
  }
  if (values.includes("education") || values.includes("schools")) {
    return "education";
  }
  if (values.includes("childcare") || values.includes("childcare_facilities")) {
    return "childcare";
  }
  if (values.includes("facility") || values.includes("public_facilities")) {
    return "facility";
  }

  return "other";
}
