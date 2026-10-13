import { MapPin, ExternalLink } from "lucide-react";
import styles from "./ServiceCards.module.css";

type ServiceCardsProps = {
  items: any[];
};

export function ServiceCards({ items }: ServiceCardsProps) {
  return (
    <div className={styles.grid}>
      {items.map((place, index) => {
        const lat = place.latitude ?? place.lat;
        const lon = place.longitude ?? place.lon;

        const query =
          lat != null && lon != null
            ? `${lat},${lon}`
            : encodeURIComponent(`${place.name} ${place.address ?? ""}`.trim());

        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

        return (
          <article
            className={styles.card}
            data-tone={index % 4}
            key={place.id}
          >
            <span className={styles.icon} aria-hidden="true">
              <MapPin size={22} />
            </span>

            <span className={styles.type}>
              {place.placeType?.name ?? "Pet service"}
            </span>

            <h3 className={styles.name}>{place.name}</h3>

            {place.address && <p className={styles.address}>{place.address}</p>}

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              ดูใน Google Maps
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          </article>
        );
      })}
    </div>
  );
}