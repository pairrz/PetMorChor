import Link from "next/link";
import { MapPin } from "lucide-react";

import { Eyebrow } from "@/components/layout/Eyebrow";

export function AnimalDetail({ pet }: { pet: any }) {
  return (
    <div className="animal-detail">
      <img
        className="detail-image"
        src={pet.image}
        alt={`${pet.name}, ${pet.breed}`}
      />

      <div>
        <Eyebrow>{pet.status} · NEARBY</Eyebrow>

        <h1>{pet.name}</h1>

        <p className="lead">
          {pet.breed} · {pet.age}
        </p>

        <p className="location-pill">
          <MapPin size={14} />
          {pet.place} · {pet.distance}
        </p>

        <p>
          Mochi is a gentle companion who loves sunny windows and quiet
          afternoons. Looking for a caring home close to campus.
        </p>

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
          Nearby · Member since 2026
        </div>
      </div>
    </div>
  );
}