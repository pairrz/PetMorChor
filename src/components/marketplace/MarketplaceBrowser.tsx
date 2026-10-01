"use client";

import { useMemo, useState } from "react";
import { PetGrid } from "./PetGrid";
import styles from "./MarketplaceBrowser.module.css";

type Listing = {
  id: number;
  title: string;
  species: string;
  description?: string | null;
  type: string;
  price: number | string | null;
  createdAt: string | Date;
  [key: string]: unknown;
};

type Filter = "ALL" | "SALE" | "ADOPTION";
type Sort = "newest" | "price-low" | "price-high";

export function MarketplaceBrowser({ listings }: { listings: Listing[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [sort, setSort] = useState<Sort>("newest");

  const visibleListings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return listings
      .filter((listing) => {
        const matchesType =
          filter === "ALL" || listing.type.toUpperCase() === filter;

        const text = [
          listing.title,
          listing.species,
          listing.description ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return matchesType && (!query || text.includes(query));
      })
      .sort((a, b) => {
        if (sort === "price-low") {
          return Number(a.price ?? 0) - Number(b.price ?? 0);
        }

        if (sort === "price-high") {
          return Number(b.price ?? 0) - Number(a.price ?? 0);
        }

        return (
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
        );
      });
  }, [listings, search, filter, sort]);

  return (
    <main className={styles.marketplace}>
      <header className={styles.heading}>
        <span className={styles.eyebrow}>PETMORCHOR MARKETPLACE</span>
        <h1>ประกาศสัตว์เลี้ยง</h1>
        <p>ค้นหาสัตว์เลี้ยงและประกาศหาบ้านในชุมชน มช.</p>
      </header>

      <div className={styles.controls}>
        <label className={styles.search}>
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาชื่อหรือประเภทสัตว์..."
            aria-label="ค้นหาประกาศ"
          />
        </label>

        <label className={styles.sort}>
          <span>เรียงตาม</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
            aria-label="เรียงประกาศ"
          >
            <option value="newest">มาใหม่ล่าสุด</option>
            <option value="price-low">ราคาต่ำไปสูง</option>
            <option value="price-high">ราคาสูงไปต่ำ</option>
          </select>
        </label>
      </div>

      <div className={styles.filters} aria-label="กรองประเภทประกาศ">
        {(
          [
            ["ALL", "ทั้งหมด"],
            ["SALE", "ประกาศขาย"],
            ["ADOPTION", "หาบ้าน"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={
              filter === value ? styles.activeFilter : styles.filter
            }
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <p className={styles.resultCount}>
        พบ {visibleListings.length} ประกาศ
      </p>

      {visibleListings.length > 0 ? (
        <PetGrid items={visibleListings} />
      ) : (
        <div className={styles.empty}>
          <span aria-hidden="true">🐾</span>
          <h2>ไม่พบประกาศที่ตรงกับการค้นหา</h2>
          <p>ลองเปลี่ยนคำค้นหาหรือตัวกรองดูครับ</p>
        </div>
      )}
    </main>
  );
}