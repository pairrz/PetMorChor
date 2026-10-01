import { PetCard } from "./PetCard";

type PetGridProps = {
  items: any[];
};

export function PetGrid({ items }: PetGridProps) {
  return (
    <div className="pet-grid">
      {items.map((pet) => (
        <PetCard key={pet.id} pet={pet} />
      ))}
    </div>
  );
}