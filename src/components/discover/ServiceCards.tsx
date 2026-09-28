import { MapPin } from "lucide-react";

type ServiceCardsProps = {
  items: any[];
};

export function ServiceCards({ items }: ServiceCardsProps) {
  return (
    <div className="service-grid">
      {items.map((place) => (
        <article className="service-card" key={place.id}>
          <span className="service-icon">
            <MapPin />
          </span>

          <h3>{place.name}</h3>

          <p>
            {place.placeType?.name ?? "Pet service"}
          </p>

          <span className="distance">
            {place.address}
          </span>
        </article>
      ))}
    </div>
  );
}