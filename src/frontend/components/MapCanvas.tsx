import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { FeatureCollection, PointFeature } from "../../shared/types";

type MapCanvasProps = {
  collection: FeatureCollection;
  category: string;
  selectedId?: string;
  onSelect: (id: string) => void;
};

const center: [number, number] = [37.4005, 140.3597];

export default function MapCanvas({ collection, category, selectedId, onSelect }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markerByIdRef = useRef<Map<string, MarkerEntry>>(new Map());

  const features = useMemo(() => {
    if (category === "all") {
      return collection.features;
    }

    return collection.features.filter((feature) => featureMatchesCategory(feature, category));
  }, [category, collection.features]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true
    }).setView(center, 12);

    L.control.zoom({ position: "topright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    const cluster = L.markerClusterGroup({
      maxClusterRadius: 42,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true
    });

    map.addLayer(cluster);
    mapRef.current = map;
    clusterRef.current = cluster;

    const invalidateTimer = window.setTimeout(() => {
      if (mapRef.current === map) {
        map.invalidateSize();
      }
    }, 80);

    return () => {
      window.clearTimeout(invalidateTimer);
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
    };
  }, []);

  useEffect(() => {
    const cluster = clusterRef.current;
    const map = mapRef.current;
    if (!cluster || !map) {
      return;
    }

    cluster.clearLayers();
    markerByIdRef.current.clear();
    const bounds = L.latLngBounds([]);

    features.forEach((feature) => {
      const marker = makeMarker(feature, false);
      marker.on("click", () => {
        if (feature.id !== undefined) {
          onSelect(String(feature.id));
        }
      });
      cluster.addLayer(marker);
      bounds.extend(marker.getLatLng());

      if (feature.id !== undefined) {
        markerByIdRef.current.set(String(feature.id), {
          feature,
          marker,
          selected: false
        });
      }
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [28, 28],
        maxZoom: 14,
        animate: false
      });
    }
  }, [features, onSelect]);

  useEffect(() => {
    markerByIdRef.current.forEach((entry, id) => {
      const nextSelected = id === selectedId;
      if (entry.selected === nextSelected) {
        return;
      }

      entry.marker.setIcon(makeIcon(entry.feature, nextSelected));
      entry.selected = nextSelected;
    });
  }, [features, selectedId]);

  return <div ref={containerRef} className="map-canvas" aria-label="施設マップ" />;
}

type MarkerEntry = {
  feature: PointFeature;
  marker: L.Marker;
  selected: boolean;
};

function makeMarker(feature: PointFeature, selected: boolean): L.Marker {
  const [lng, lat] = feature.geometry.coordinates;

  return L.marker([lat, lng], {
    icon: makeIcon(feature, selected),
    title: feature.properties.name
  });
}

function makeIcon(feature: PointFeature, selected: boolean): L.DivIcon {
  const category = markerCategory(feature);

  return L.divIcon({
    className: `map-pin map-pin--${category}${selected ? " is-selected" : ""}`,
    html: '<span class="map-pin__glyph"></span>',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

function featureMatchesCategory(feature: PointFeature, category: string): boolean {
  return categoryCandidates(feature).includes(category);
}

function markerCategory(feature: PointFeature): string {
  const candidates = categoryCandidates(feature);

  if (candidates.includes("aed")) {
    return "aed";
  }

  if (candidates.includes("public_wifi")) {
    return "public_wifi";
  }

  if (candidates.includes("public_toilets")) {
    return "public_toilets";
  }

  if (candidates.includes("medical")) {
    return "medical";
  }

  if (candidates.includes("education")) {
    return "education";
  }

  if (candidates.includes("childcare")) {
    return "childcare";
  }

  if (candidates.includes("facility")) {
    return "facility";
  }

  return "other";
}

function categoryCandidates(feature: PointFeature): string[] {
  const values = [feature.properties.category, feature.properties.dataset_id, ...(feature.properties.categories ?? [])].filter(
    (value): value is string => Boolean(value)
  );
  const candidates = new Set(values);

  values.forEach((value) => {
    if (value === "aed" || value === "safety") {
      candidates.add("aed");
    }
    if (value === "public_wifi" || value === "wifi") {
      candidates.add("public_wifi");
    }
    if (value === "public_toilets" || value === "toilets") {
      candidates.add("public_toilets");
    }
    if (value === "medical" || value === "medical_institutions") {
      candidates.add("medical");
    }
    if (value === "education" || value === "schools") {
      candidates.add("education");
    }
    if (value === "childcare" || value === "childcare_facilities") {
      candidates.add("childcare");
    }
    if (value === "facility" || value === "public_facilities") {
      candidates.add("facility");
    }
  });

  return Array.from(candidates);
}
