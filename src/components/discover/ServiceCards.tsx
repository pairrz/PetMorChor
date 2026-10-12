import { MapPin, ExternalLink } from "lucide-react";

type ServiceCardsProps = {
  items: any[];
};

export function ServiceCards({ items }: ServiceCardsProps) {
  return (
    <div className="service-grid">
      {items.map((place) => {
        // เช็คว่ามีพิกัด lat/lon หรือไม่ ถ้ามีให้ใช้พิกัด ถ้าไม่มีให้ค้นหาด้วยชื่อและที่อยู่
        const lat = place.latitude ?? place.lat;
        const lon = place.longitude ?? place.lon;

        const query =
          lat && lon
            ? `${lat},${lon}`
            : encodeURIComponent(`${place.name} ${place.address ?? ""}`.trim());

        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

        return (
          <article className="service-card" key={place.id}>
            <span className="service-icon">
              <MapPin />
            </span>

            <h3>{place.name}</h3>

            <p>{place.placeType?.name ?? "Pet service"}</p>

            <span className="distance">{place.address}</span>

            {/* ปุ่มกดดูรายละเอียด / นำทางไปยัง Google Maps */}
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="map-link"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                marginTop: "8px",
                fontSize: "0.875rem",
                color: "#2563eb",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              ดูรายละเอียดใน Google Maps
              <ExternalLink size={14} />
            </a>
          </article>
        );
      })}
    </div>
  );
}