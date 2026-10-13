"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Plus, Trash2 } from "lucide-react";
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

type PlaceTypeOption = {
  id?: number;
  name: string;
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

export default function PetMap({ isAdmin = false }: { isAdmin?: boolean }) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [placeTypes, setPlaceTypes] = useState<PlaceTypeOption[]>([]);
  const [placeTypesLoading, setPlaceTypesLoading] = useState(false);
  const [placeTypesError, setPlaceTypesError] = useState("");
  const [savingPlace, setSavingPlace] = useState(false);
  const [createPlaceError, setCreatePlaceError] = useState("");
  const [deletingPlace, setDeletingPlace] = useState(false);
  const [deletePlaceError, setDeletePlaceError] = useState("");

  useEffect(() => {
    if (!isAdmin || !showAddPlace) return;

    const controller = new AbortController();
    async function loadPlaceTypes() {
      setPlaceTypesLoading(true);
      setPlaceTypesError("");
      try {
        const response = await fetch("/api/admin/places", {
          signal: controller.signal,
        });
        const result: {
          success?: boolean;
          data?: PlaceTypeOption[];
          message?: string;
        } = await response.json();

        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.message ?? "โหลดประเภทสถานที่ไม่สำเร็จ");
        }

        setPlaceTypes(result.data);
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === "AbortError") return;
        console.error("Failed to load place types:", loadError);
        setPlaceTypesError(
          loadError instanceof Error ? loadError.message : "โหลดประเภทสถานที่ไม่สำเร็จ",
        );
      } finally {
        if (!controller.signal.aborted) setPlaceTypesLoading(false);
      }
    }

    void loadPlaceTypes();
    return () => controller.abort();
  }, [isAdmin, showAddPlace]);

  useEffect(() => {
    if (!showAddPlace) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowAddPlace(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showAddPlace]);

  async function handleCreatePlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPlace(true);
    setCreatePlaceError("");

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeTypeName: formData.get("placeTypeName"),
          name: formData.get("name"),
          address: formData.get("address"),
          latitude: Number(formData.get("latitude")),
          longitude: Number(formData.get("longitude")),
          openingHours: formData.get("openingHours"),
        }),
      });
      const result: { message?: string; data?: ApiPlace } = await response.json();

      if (!response.ok || !result.data) {
        throw new Error(result.message ?? "เพิ่มสถานที่ไม่สำเร็จ");
      }

      const newPlace = toPlace(result.data);
      if (!newPlace) {
        throw new Error("บันทึกสำเร็จ แต่พิกัดสถานที่ไม่ถูกต้อง");
      }

      setPlaces((currentPlaces) => [...currentPlaces, newPlace]);
      setFilter("all");
      setShowAddPlace(false);
    } catch (submitError) {
      console.error("Failed to create place:", submitError);
      setCreatePlaceError(
        submitError instanceof Error ? submitError.message : "เพิ่มสถานที่ไม่สำเร็จ",
      );
    } finally {
      setSavingPlace(false);
    }
  }

  async function handleDeletePlace() {
    if (!selectedPlace || !window.confirm(`ต้องการลบ "${selectedPlace.name}" ใช่หรือไม่?`)) {
      return;
    }

    setDeletingPlace(true);
    setDeletePlaceError("");
    try {
      const response = await fetch(`/api/admin/places/${selectedPlace.id}`, {
        method: "DELETE",
      });
      const result: { message?: string } = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "ลบสถานที่ไม่สำเร็จ");
      }

      setPlaces((currentPlaces) =>
        currentPlaces.filter((place) => place.id !== selectedPlace.id),
      );
      setSelectedPlace(null);
    } catch (deleteError) {
      console.error("Failed to delete place:", deleteError);
      setDeletePlaceError(
        deleteError instanceof Error ? deleteError.message : "ลบสถานที่ไม่สำเร็จ",
      );
    } finally {
      setDeletingPlace(false);
    }
  }

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
      <div className={styles.filterBar}>
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
        {isAdmin && (
          <button
            className={styles.addPlaceButton}
            type="button"
            onClick={() => {
              setCreatePlaceError("");
              setShowAddPlace(true);
            }}
          >
            <Plus size={17} aria-hidden="true" />
            เพิ่มสถานที่
          </button>
        )}
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
            {isAdmin && (
              <div className={styles.deletePlaceActions}>
                {deletePlaceError && (
                  <p className={styles.formError} role="alert">{deletePlaceError}</p>
                )}
                <button
                  className={styles.deletePlaceButton}
                  type="button"
                  onClick={() => void handleDeletePlace()}
                  disabled={deletingPlace}
                >
                  <Trash2 size={16} aria-hidden="true" />
                  {deletingPlace ? "กำลังลบ..." : "ลบสถานที่"}
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {showAddPlace && isAdmin && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingPlace) {
              setShowAddPlace(false);
            }
          }}
        >
          <section
            className={`${styles.placeDetails} ${styles.addPlaceDialog}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-place-title"
          >
            <button
              type="button"
              className={styles.modalClose}
              onClick={() => setShowAddPlace(false)}
              aria-label="ปิดแบบฟอร์ม"
              disabled={savingPlace}
            >
              ×
            </button>
            <span className={styles.detailsIcon} aria-hidden="true">📍</span>
            <p className={styles.detailsType}>สำหรับผู้ดูแลระบบ</p>
            <h2 id="add-place-title">เพิ่มสถานที่</h2>
            <p className={styles.formIntro}>
              กรอกข้อมูลตามช่องที่มีเครื่องหมาย * ระบบจะสร้างรหัสสถานที่ให้อัตโนมัติ
            </p>

            {placeTypesError ? (
              <p className={styles.formError} role="alert">{placeTypesError}</p>
            ) : (
              <form className={styles.placeForm} onSubmit={handleCreatePlace}>
                <label>
                  ประเภทสถานที่ *
                  <select name="placeTypeName" required disabled={placeTypesLoading || savingPlace}>
                    {placeTypesLoading ? (
                      <option value="">กำลังโหลดประเภทสถานที่...</option>
                    ) : (
                      placeTypes.map((placeType) => (
                        <option key={placeType.id ?? placeType.name} value={placeType.name}>
                          {placeType.name}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <label>
                  ชื่อสถานที่ *
                  <input name="name" required minLength={2} maxLength={200} />
                </label>
                <label>
                  ที่อยู่ *
                  <textarea name="address" required minLength={5} rows={2} />
                </label>
                <div className={styles.coordinateFields}>
                  <label>
                    ละติจูด (Latitude) *
                    <input
                      name="latitude"
                      type="number"
                      required
                      min={-90}
                      max={90}
                      step="any"
                      placeholder="เช่น 18.7883"
                    />
                  </label>
                  <label>
                    ลองจิจูด (Longitude) *
                    <input
                      name="longitude"
                      type="number"
                      required
                      min={-180}
                      max={180}
                      step="any"
                      placeholder="เช่น 98.9853"
                    />
                  </label>
                </div>
                <p className={styles.coordinateHint}>
                  ดูพิกัดได้จาก Google Maps โดยคลิกขวาที่ตำแหน่ง แล้วคัดลอกตัวเลขพิกัด
                </p>
                <label>
                  เวลาเปิด-ปิด *
                  <input
                    name="openingHours"
                    required
                    maxLength={200}
                    placeholder="เช่น ทุกวัน 09:00–18:00"
                  />
                </label>

                {createPlaceError && (
                  <p className={styles.formError} role="alert">{createPlaceError}</p>
                )}

                <div className={styles.formActions}>
                  <button
                    className={styles.cancelButton}
                    type="button"
                    onClick={() => setShowAddPlace(false)}
                    disabled={savingPlace}
                  >
                    ยกเลิก
                  </button>
                  <button
                    className={styles.submitPlaceButton}
                    type="submit"
                    disabled={savingPlace || placeTypesLoading || placeTypes.length === 0}
                  >
                    {savingPlace ? "กำลังบันทึก..." : "บันทึกสถานที่"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </section>
  );
}