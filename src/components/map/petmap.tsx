"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Place = {
  id: number;
  name: string;
  type: string;
  lat: number;
  lon: number;
};

type OverpassElement = {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: {
    amenity?: string;
    shop?: string;
    leisure?: string;
    name?: string;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOverpassResponse(
  value: unknown
): value is { elements: OverpassElement[] } {
  return (
    isRecord(value) &&
    Array.isArray(value.elements) &&
    value.elements.every((element) => {
      if (!isRecord(element) || typeof element.id !== "number") return false;
      const hasCoordinates =
        (typeof element.lat === "number" && typeof element.lon === "number") ||
        (isRecord(element.center) &&
          typeof element.center.lat === "number" &&
          typeof element.center.lon === "number");
      return hasCoordinates && (element.tags === undefined || isRecord(element.tags));
    })
  );
}

const position: [number, number] = [18.7883, 98.9853];

const placeIcon = L.icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export default function PetMap() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const query = `
      [out:json];
      (
        node["amenity"="veterinary"](around:5000,18.7883,98.9853);
        way["amenity"="veterinary"](around:5000,18.7883,98.9853);

        node["shop"="pet"](around:5000,18.7883,98.9853);
        way["shop"="pet"](around:5000,18.7883,98.9853);

        node["shop"="pet_grooming"](around:5000,18.7883,98.9853);
        way["shop"="pet_grooming"](around:5000,18.7883,98.9853);

        node["leisure"="dog_park"](around:5000,18.7883,98.9853);
        way["leisure"="dog_park"](around:5000,18.7883,98.9853);
      );
      out center;
    `;

    fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: new URLSearchParams({ data: query }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Overpass request failed with status ${response.status}`);
        }
        const data: unknown = await response.json();
        if (!isOverpassResponse(data)) {
          throw new Error("Overpass returned an invalid response");
        }
        return data;
      })
      .then((data) => {
        const results = data.elements.flatMap((element): Place[] => {
          const lat = element.lat ?? element.center?.lat;
          const lon = element.lon ?? element.center?.lon;
          if (lat === undefined || lon === undefined) return [];

          let type = "สถานที่สำหรับสัตว์เลี้ยง";

          if (element.tags?.amenity === "veterinary") {
            type = "คลินิก / โรงพยาบาลสัตว์";
          } else if (element.tags?.shop === "pet") {
            type = "ร้านขายอุปกรณ์สัตว์เลี้ยง";
          } else if (element.tags?.shop === "pet_grooming") {
            type = "ร้านอาบน้ำ / ตัดขน";
          } else if (element.tags?.leisure === "dog_park") {
            type = "สวนสำหรับสุนัข";
          }

          return [{
            id: element.id,
            name: element.tags?.name || "ไม่ระบุชื่อ",
            type,
            lat,
            lon,
          }];
        });

        setPlaces(results);
      })
      .catch((error) => {
        console.error("Failed to load pet facilities:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "420px",
        borderRadius: "20px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <MapContainer
        center={position}
        zoom={14}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {places.map((place) => (
          <Marker
            key={place.id}
            position={[place.lat, place.lon]}
            icon={placeIcon}
          >
            <Popup>
              <strong>{place.name}</strong>
              <br />
              {place.type}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {loading && (
        <div
          style={{
            position: "absolute",
            top: "16px",
            left: "16px",
            zIndex: 1000,
            background: "white",
            padding: "8px 14px",
            borderRadius: "10px",
            fontSize: "14px",
          }}
        >
          กำลังค้นหาสถานที่สำหรับสัตว์เลี้ยง...
        </div>
      )}
    </div>
  );
}