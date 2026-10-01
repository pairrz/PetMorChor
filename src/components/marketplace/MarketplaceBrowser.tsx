"use client";

import { useMemo, useRef, useState } from "react";
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

type Props = {
  initialListings: Listing[];
  initialCursor: number | null;
};

export function MarketplaceBrowser({ initialListings, initialCursor }: Props) {
  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [cursor, setCursor] = useState<number | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [sort, setSort] = useState<Sort>("newest");

  // กันผลลัพธ์ของ request เก่าไปทับ request ใหม่ (กดเปลี่ยนตัวกรองรัวๆ)
  const requestId = useRef(0);

  async function fetchListings(opts: {
    type: Filter;
    cursor: number | null;
    reset: boolean;
  }) {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: "12" });
      if (opts.type !== "ALL") params.set("type", opts.type);
      if (opts.cursor) params.set("cursor", String(opts.cursor));

      const res = await fetch(`/api/listings?${params}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message ?? "โหลดข้อมูลไม่สำเร็จ");
      }
      if (id !== requestId.current) return; // มี request ใหม่กว่าแล้ว ทิ้งอันนี้

      setListings((prev) =>
        opts.reset ? json.data : [...prev, ...json.data]
      );
      setCursor(json.pagination.nextCursor);
    } catch (e) {
      if (id !== requestId.current) return;
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  function handleFilterChange(next: Filter) {
    if (next === filter) return;
    setFilter(next);
    fetchListings({ type: next, cursor: null, reset: true });
  }

  function handleLoadMore() {
    if (!cursor) return;
    fetchListings({ type: filter, cursor, reset: false });
  }

  // search + sort ทำฝั่ง client บนรายการที่โหลดมาแล้ว (เหมือนเดิม)
  const visibleListings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...listings]
      .filter((listing) => {
        const text = [
          listing.title,
          listing.species,
          listing.description ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return !query || text.includes(query);
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
  }, [listings, search, sort]);

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
            disabled={loading}
            onClick={() => handleFilterChange(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <p className={styles.resultCount}>
        พบ {visibleListings.length} ประกาศ
      </p>

      {error && <p role="alert">{error}</p>}

      {visibleListings.length > 0 ? (
        <PetGrid items={visibleListings} />
      ) : (
        !loading && (
          <div className={styles.empty}>
            <span aria-hidden="true">🐾</span>
            <h2>ไม่พบประกาศที่ตรงกับการค้นหา</h2>
            <p>ลองเปลี่ยนคำค้นหาหรือตัวกรองดูครับ</p>
          </div>
        )
      )}

      {cursor && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={loading}
        >
          {loading ? "กำลังโหลด..." : "โหลดเพิ่ม"}
        </button>
      )}
    </main>
  );
}