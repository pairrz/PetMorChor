import { Eyebrow } from "@/components/layout/Eyebrow";

export function MarketplaceCards() {
  const products = [
    ["Cat Food 1.5kg", "฿250", "1.4 km away"],
    ["Cloud Nap Bed", "฿690", "2.1 km away"],
    ["Walkies Set", "฿450", "0.9 km away"],
  ];

  return (
    <div className="product-grid">
      {products.map((product) => (
        <article className="product-card" key={product[0]}>
          <div className="product-copy">
            <Eyebrow>NEARBY</Eyebrow>

            <h3>{product[0]}</h3>

            <p>Pet essentials · Local seller</p>

            <strong>{product[1]}</strong>

            <span className="distance">{product[2]}</span>
          </div>
        </article>
      ))}
    </div>
  );
}