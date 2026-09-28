
import Link from "next/link";
import { Heart, MapPin } from "lucide-react";

export function PetCard({ pet }: { pet: any }) {
  const image =
    pet.media?.[0]?.url ||
    pet.media?.[0]?.path ||
    "/placeholder-pet.jpg";

  const isAdoption =
    pet.type?.toUpperCase() === "ADOPTION";

  return (
    <Link className="pet-card" href={`/marketplace/${pet.id}`}>
      <div className="pet-image">
        <img
          src={image}
          alt={pet.title}
        />

        <span
          className={`pet-badge ${
            isAdoption ? "adoption" : "sale"
          }`}
        >
          {isAdoption ? "หาบ้าน" : "ประกาศขาย"}
        </span>

        <button
          onClick={(e) => e.preventDefault()}
          aria-label={`บันทึก ${pet.title}`}
        >
          <Heart size={17} />
        </button>
      </div>

      <div className="pet-info">
        <h3>{pet.title}</h3>

        <p>
          {pet.species}
          {pet.price
            ? ` · ${Number(pet.price).toLocaleString("th-TH")} บาท`
            : ""}
        </p>

        <p className="pet-meta">
          <MapPin size={13} />
          ประกาศโดยผู้ใช้ #{pet.userId}
        </p>

        <strong>
          {isAdoption ? "หาบ้าน" : "ประกาศขาย"}
        </strong>
      </div>
    </Link>
  );
}

