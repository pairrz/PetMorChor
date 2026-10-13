"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./petmap.module.css";

type PlaceCategory = "clinic" | "shop" | "grooming" | "park";
type Filter = "all" | PlaceCategory;

type Place = {
  id: number;
  name: string;
  type: string;
  category: PlaceCategory;
  lat: number;
  lon: number;
  address: string;
  openingHours: string;
};

type ApiPlace = {
  id: number;
  name: string;
  address: string;
  latitude: number | string;
  longitude: number | string;
  openingHours: string;
  placeTypeId: number;
  placeType: {
    id: number;
    name: string;
  };
};

const position: [number, number] = [18.7883, 98.9853];

const filters: {
  id: Filter;
  label: string;
  icon: string;
}[] = [
  { id: "all", label: "ทั้งหมด", icon: "📍" },
  { id: "clinic", label: "คลินิกสัตว์", icon: "🏥" },
  { id: "shop", label: "ร้านอาหาร/อุปกรณ์", icon: "🛍️" },
  { id: "grooming", label: "อาบน้ำ/ตัดขน", icon: "🛁" },
  { id: "park", label: "สวนสุนัข", icon: "🌳" },
];

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

function getCategory(place: ApiPlace): {
  category: PlaceCategory;
  type: string;
} {
  const placeTypeName = place.placeType?.name?.toLowerCase() ?? "";

  if (
    placeTypeName.includes("คลินิก") ||
    placeTypeName.includes("โรงพยาบาล") ||
    placeTypeName.includes("veterinary")
  ) {
    return {
      category: "clinic",
      type: "คลินิก / โรงพยาบาลสัตว์",
    };
  }

  if (
    placeTypeName.includes("อาบน้ำ") ||
    placeTypeName.includes("ตัดขน") ||
    placeTypeName.includes("groom")
  ) {
    return {
      category: "grooming",
      type: "ร้านอาบน้ำ / ตัดขน",
    };
  }

  if (
    placeTypeName.includes("สวน") ||
    placeTypeName.includes("dog park") ||
    placeTypeName.includes("park")
  ) {
    return {
      category: "park",
      type: "สวนสำหรับสุนัข",
    };
  }

  return {
    category: "shop",
    type: "ร้านอาหาร / อุปกรณ์สัตว์เลี้ยง",
  };
}

function toPlace(place: ApiPlace): Place | null {
  const lat = Number(place.latitude);
  const lon = Number(place.longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return null;
  }

  const { category, type } = getCategory(place);

  return {
    id: place.id,
    name: place.name || "ไม่ระบุชื่อ",
    type,
    category,
    lat,
    lon,
    address: place.address || "ไม่ระบุที่อยู่",
    openingHours: place.openingHours || "ไม่ระบุเวลาเปิด-ปิด",
  };
}

function getGoogleMapsUrl(place: Place) {
  const query = encodeURIComponent(`${place.name} ${place.address}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export default function PetMap() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPlaces() {
      try {
        setLoading(true);

        const response = await fetch("/api/places?radiusKm=5", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`โหลดสถานที่ไม่สำเร็จ (${response.status})`);
        }

        const result: {
          success: boolean;
          data?: ApiPlace[];
          message?: string;
        } = await response.json();

        if (!result.success) {
          throw new Error(result.message ?? "โหลดสถานที่ไม่สำเร็จ");
        }

        const results = (result.data ?? [])
          .map(toPlace)
          .filter((place): place is Place => place !== null);

        setPlaces(results);
        setError("");
      } catch (loadError) {
        if (
          loadError instanceof Error &&
          loadError.name === "AbortError"
        ) {
          return;
        }

        console.error("Failed to load pet facilities:", loadError);
        setError("โหลดสถานที่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadPlaces();

    return () => controller.abort();
  }, []);

  const visiblePlaces = useMemo(
    () =>
      filter === "all"
        ? places
        : places.filter((place) => place.category === filter),
    [filter, places],
  );

  return (
    <section
      className={styles.wrapper}
      aria-label="สถานที่เกี่ยวกับสัตว์เลี้ยง"
    >
      <div
        className={styles.filters}
        aria-label="กรองประเภทสถานที่"
      >
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.filterButton} ${
              filter === item.id ? styles.active : ""
            }`}
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      <div className={styles.map}>
        <MapContainer
          center={position}
          zoom={14}
          scrollWheelZoom
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {visiblePlaces.map((place) => (
            <Marker
              key={`${place.category}-${place.id}`}
              position={[place.lat, place.lon]}
              icon={placeIcon}
            >
              <Popup>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <strong>{place.name}</strong>
                  <span style={{ fontSize: "0.85rem", color: "#666" }}>{place.type}</span>
                  <span style={{ fontSize: "0.8rem", color: "#666" }}>{place.address}</span>
                  <span style={{ fontSize: "0.8rem", color: "#666" }}>เวลา: {place.openingHours}</span>
                  
                  <a
                    href={getGoogleMapsUrl(place)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: "4px",
                      padding: "4px 8px",
                      backgroundColor: "#2563eb",
                      color: "#fff",
                      textDecoration: "none",
                      borderRadius: "4px",
                      fontSize: "0.8rem",
                      textAlign: "center",
                    }}
                  >
                    📍 เปิดใน Google Maps ↗
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {loading && (
          <div className={styles.mapMessage}>
            กำลังค้นหาสถานที่…
          </div>
        )}
      </div>

      <div className={styles.listHeading}>
        <div>
          <h2>สถานที่ใกล้มหาวิทยาลัย</h2>
          <p>
            {loading
              ? "กำลังโหลดข้อมูล"
              : `พบ ${visiblePlaces.length} แห่ง`}
          </p>
        </div>
      </div>

      {error ? (
        <p className={styles.empty} role="alert">
          {error}
        </p>
      ) : visiblePlaces.length > 0 ? (
        <ul className={styles.placeList}>
          {visiblePlaces.map((place) => (
            <li
              className={styles.placeCard}
              key={`${place.category}-${place.id}`}
            >
              <button
                type="button"
                className={styles.placeCardButton}
                onClick={() => setSelectedPlace(place)}
                aria-label={`ดูรายละเอียด ${place.name}`}
              >
                <span className={styles.placeIcon} aria-hidden="true">
                  {filters.find((item) => item.id === place.category)?.icon}
                </span>
                <span className={styles.placeCardText}>
                  <strong>{place.name}</strong>
                  <span>{place.type}</span>
                </span>
                <span className={styles.placeCardArrow} aria-hidden="true">›</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        !loading && (
          <p className={styles.empty}>
            ไม่พบสถานที่ในหมวดหมู่นี้
          </p>
        )
      )}

      {selectedPlace && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedPlace(null);
          }}
        >
          <section
            className={styles.placeDetails}
            role="dialog"
            aria-modal="true"
            aria-labelledby="place-details-title"
          >
            <button
              type="button"
              className={styles.modalClose}
              onClick={() => setSelectedPlace(null)}
              aria-label="ปิดรายละเอียดสถานที่"
            >
              ×
            </button>
            <span className={styles.detailsIcon} aria-hidden="true">
              {filters.find((item) => item.id === selectedPlace.category)?.icon}
            </span>
            <p className={styles.detailsType}>{selectedPlace.type}</p>
            <h2 id="place-details-title">{selectedPlace.name}</h2>
            <dl className={styles.detailsList}>
              <div>
                <dt>ที่อยู่</dt>
                <dd>{selectedPlace.address}</dd>
              </div>
              <div>
                <dt>เวลาเปิด-ปิด</dt>
                <dd>{selectedPlace.openingHours}</dd>
              </div>
            </dl>
            <a
              className={styles.mapsButton}
              href={getGoogleMapsUrl(selectedPlace)}
              target="_blank"
              rel="noopener noreferrer"
            >
              📍 เปิดเส้นทางใน Google Maps ↗
            </a>
          </section>
        </div>
      )}
    </section>
  );
}