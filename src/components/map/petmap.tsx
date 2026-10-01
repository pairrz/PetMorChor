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
};

const position: [number, number] = [18.7883, 98.9853];

const filters: { id: Filter; label: string; icon: string }[] = [
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

export default function PetMap() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        if (!response.ok) throw new Error("โหลดข้อมูลสถานที่ไม่สำเร็จ");
        return response.json();
      })
      .then((data) => {
        const results: Place[] = (data.elements ?? [])
          .map((element: any): Place | null => {
            const lat = element.lat ?? element.center?.lat;
            const lon = element.lon ?? element.center?.lon;
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

            let category: PlaceCategory = "shop";
            let type = "ร้านขายอาหารและอุปกรณ์สัตว์เลี้ยง";

            if (element.tags?.amenity === "veterinary") {
              category = "clinic";
              type = "คลินิก / โรงพยาบาลสัตว์";
            } else if (element.tags?.shop === "pet_grooming") {
              category = "grooming";
              type = "ร้านอาบน้ำ / ตัดขน";
            } else if (element.tags?.leisure === "dog_park") {
              category = "park";
              type = "สวนสำหรับสุนัข";
            }

            return {
              id: element.id,
              name: element.tags?.name || "ไม่ระบุชื่อ",
              type,
              category,
              lat,
              lon,
            };
          })
          .filter((place: Place | null): place is Place => place !== null);

        setPlaces(results);
      })
      .catch((loadError: unknown) => {
        console.error("Failed to load pet facilities:", loadError);
        setError("โหลดสถานที่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      })
      .finally(() => setLoading(false));
  }, []);

  const visiblePlaces = useMemo(
    () =>
      filter === "all"
        ? places
        : places.filter((place) => place.category === filter),
    [filter, places],
  );

  return (
    <section className={styles.wrapper} aria-label="สถานที่เกี่ยวกับสัตว์เลี้ยง">
      <div className={styles.filters} aria-label="กรองประเภทสถานที่">
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
          style={{ width: "100%", height: "100%" }}
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
                <strong>{place.name}</strong>
                <br />
                {place.type}
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {loading && <div className={styles.mapMessage}>กำลังค้นหาสถานที่…</div>}
      </div>

      <div className={styles.listHeading}>
        <div>
          <h2>สถานที่ใกล้มหาวิทยาลัย</h2>
          <p>{loading ? "กำลังโหลดข้อมูล" : `พบ ${visiblePlaces.length} แห่ง`}</p>
        </div>
      </div>

      {error ? (
        <p className={styles.empty} role="alert">{error}</p>
      ) : visiblePlaces.length > 0 ? (
        <ul className={styles.placeList}>
          {visiblePlaces.map((place) => (
            <li className={styles.placeCard} key={`${place.category}-${place.id}`}>
              <span className={styles.placeIcon} aria-hidden="true">
                {filters.find((item) => item.id === place.category)?.icon}
              </span>
              <div>
                <h3>{place.name}</h3>
                <p>{place.type}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        !loading && (
          <p className={styles.empty}>ไม่พบสถานที่ในหมวดหมู่นี้</p>
        )
      )}
    </section>
  );
}