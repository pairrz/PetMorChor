"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, MapPin, MessageCircle } from "lucide-react";

import { Eyebrow } from "@/components/layout/Eyebrow";

type ListingDetail = {
  id: number; // เพิ่ม id ของ listing
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
  const router = useRouter();
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const image = listing.media[0]?.mediaUrl;
  const isAdoption = listing.type === "ADOPTION";

  async function handleStartChat() {
    if (isCreatingChat) return;
    setIsCreatingChat(true);

    try {
      // เรียก API สร้างห้องแชท (หรือคืนค่าห้องเดิมถ้ามีอยู่แล้ว)
      const res = await fetch("/api/chats/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "ไม่สามารถเริ่มการสนทนาได้");
      }

      // วิ่งไปหน้าแชท พร้อมส่ง roomId ไปเปิดห้องนั้นทันที
      const roomId = data.data?.id ?? data.id;
      if (roomId) {
        router.push(`/chat?roomId=${roomId}`);
      } else {
        router.push("/chat");
      }
    } catch (error: any) {
      alert(error.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsCreatingChat(false);
    }
  }

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
          <button
            type="button"
            className="primary-cta"
            onClick={handleStartChat}
            disabled={isCreatingChat}
          >
            {isCreatingChat ? (
              <>
                <LoaderCircle className="spinner" size={16} />
                กำลังเปิดห้องแชท...
              </>
            ) : (
              <>
                <MessageCircle size={16} />
                Chat with owner
              </>
            )}
          </button>

          <button type="button" className="secondary-cta">
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