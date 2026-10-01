import Link from "next/link";
import { MapPin } from "lucide-react";

import { Eyebrow } from "@/components/layout/Eyebrow";

type ListingDetail = {
  title: string;
  description: string;
  species: string;
  price: string | number;
  type: string;
  status: string;
  createdAt: string;
  user: { name: string };
  media: { mediaUrl: string; mediaType: string }[];
};

export function AnimalDetail({ listing }: { listing: ListingDetail }) {
  const image = listing.media[0]?.mediaUrl;
  const isAdoption = listing.type === "ADOPTION";

  return (
    <div className="animal-detail">
      <img
        className="detail-image"
        src={image ?? "/placeholder.jpg"}
        alt={listing.title}
      />

      <div>
        <Eyebrow>{isAdoption ? "ADOPTION" : "FOR SALE"} · {listing.status}</Eyebrow>

        <h1>{listing.title}</h1>

        <p className="lead">
          {listing.species} · {isAdoption ? "หาบ้าน" : `${Number(listing.price).toLocaleString("th-TH")} บาท`}
        </p>

        <p className="location-pill">
          <MapPin size={14} />
          ประกาศโดย {listing.user.name}
        </p>

        <p>{listing.description}</p>

        <div className="hero-actions">
          <Link className="primary-cta" href="/chat">
            Chat with owner
          </Link>

          <button className="secondary-cta">
            ♡ Save
          </button>
        </div>

        <div className="trust-box">
          ✓ Campus community member
          <br />
          ประกาศเมื่อ {new Date(listing.createdAt).toLocaleDateString("th-TH")}
        </div>
      </div>
    </div>
  );
}