"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  LoaderCircle,
  MapPin,
  MessageCircle,
  PawPrint,
} from "lucide-react";

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
  media: { mediaUrl: string }[];
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
    } catch (error: unknown) {
      window.alert(
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
      );
    } finally {
      setIsCreatingChat(false);
    }
  }

  return (
    <div className="animal-detail">
      <div className="animal-detail__photo">
        <img
          className="detail-image"
          src={image ?? "/placeholder.jpg"}
          alt={listing.title}
        />
        <span
          className={`animal-detail__status${isAdoption ? " is-adoption" : ""}`}
        >
          <PawPrint size={14} />
          {isAdoption ? "กำลังหาบ้าน" : "ประกาศขาย"}
        </span>
      </div>

      <section className="animal-detail__content" aria-labelledby="listing-title">
        <header className="animal-detail__heading">
          <Eyebrow>
            {listing.status === "AVAILABLE"
              ? "พร้อมติดต่อ"
              : listing.status === "ADOPTED"
                ? "มีผู้รับเลี้ยงแล้ว"
                : "ปิดประกาศ"}
          </Eyebrow>
          <h2 id="listing-title">{listing.title}</h2>
        </header>

        <div className="animal-detail__summary">
          <div className="animal-detail__species">
            <span>ประเภทสัตว์</span>
            <strong>
              <PawPrint size={16} />
              {listing.species}
            </strong>
          </div>
          <div className="animal-detail__price">
            <span>{isAdoption ? "รูปแบบประกาศ" : "ราคา"}</span>
            <strong>
              {isAdoption
                ? "หาบ้าน"
                : `${Number(listing.price).toLocaleString("th-TH")} บาท`}
            </strong>
          </div>
        </div>

        <p className="location-pill">
          <MapPin size={16} />
          <span>ประกาศโดย</span>
          <strong>{listing.user.name}</strong>
        </p>

        <section className="detail-description" aria-labelledby="listing-description-title">
          <h3 id="listing-description-title">รายละเอียด</h3>
          <p>{listing.description.trim() || "ผู้ประกาศไม่ได้ระบุรายละเอียดเพิ่มเติม"}</p>
        </section>

        <div className="hero-actions animal-detail__actions">
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
        </div>

        <div className="trust-box">
          <BadgeCheck size={20} />
          <span>
            <strong>สมาชิกชุมชนรอบมหาวิทยาลัย</strong>
            <small>
              <CalendarDays size={14} />
              ประกาศเมื่อ{" "}
              {new Date(listing.createdAt).toLocaleDateString("th-TH")}
            </small>
          </span>
        </div>
      </section>
    </div>
  );
}