"use client"; // ใส่บรรทัดบนสุดเพื่อให้เป็น Client Component

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";

export function PetGrid() {
  // ดึงข้อมูลผ่าน TanStack Query ตามสไลด์ T10[cite: 8]
  const { data: listings, isLoading, error } = useQuery({
    queryKey: ["home-listings"],
    queryFn: async () => {
      const res = await axios.get("/api/listings?limit=4&status=AVAILABLE");
      return res.data.data;
    },
  });

  if (isLoading) return <div className="p-4 text-center">กำลังโหลดข้อมูลน้อง ๆ...</div>;
  if (error) return <div className="p-4 text-center text-red-500">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>;
  if (!listings || listings.length === 0) return <div className="p-4 text-center">ยังไม่มีประกาศสัตว์เลี้ยงในขณะนี้</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
      {listings.map((pet: any) => (
        <div key={pet.id} className="border rounded-xl p-3 shadow-sm bg-white flex flex-col justify-between">
          <div>
            <img
              src={pet.media?.[0]?.mediaUrl || "/placeholder.png"}
              alt={pet.title}
              className="w-full h-40 object-cover rounded-lg mb-2"
            />
            <h4 className="font-bold text-base text-gray-800 truncate">{pet.title}</h4>
            <p className="text-xs text-gray-500 mb-1">{pet.species}</p>
            <p className="text-sm font-semibold text-emerald-600">
              {pet.price === "0" || pet.price === 0 ? "รับเลี้ยงฟรี" : `฿${Number(pet.price).toLocaleString()}`}
            </p>
          </div>
          <Link
            href={`/marketplace/${pet.id}`}
            className="mt-3 block text-center bg-amber-500 hover:bg-amber-600 text-white text-xs py-2 rounded-lg font-medium transition"
          >
            ดูรายละเอียด
          </Link>
        </div>
      ))}
    </div>
  );
}