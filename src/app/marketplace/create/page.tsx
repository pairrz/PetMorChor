"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { SiteShell } from "@/components/layout/SiteShell";

import styles from "./page.module.css";

export default function CreateListingPage() {
  const [type, setType] = useState<"SALE" | "ADOPTION">("SALE");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;

    setMessage("");
    setIsSubmitting(true);

    try {
      const formData = new FormData(form);

      const title = String(formData.get("title") ?? "").trim();
      const species = String(formData.get("species") ?? "").trim();
      const description = String(formData.get("description") ?? "").trim();
      const price = Number(formData.get("price") ?? 0);

      const mediaUrls = formData
        .getAll("mediaUrl")
        .map((value) => String(value).trim())
        .filter(Boolean);

      if (mediaUrls.length === 0) {
        setMessage("กรุณาเพิ่ม URL รูปภาพอย่างน้อย 1 รูป");
        return;
      }

      const response = await fetch("/api/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          species,
          price,
          type,
          mediaUrls,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors) {
          const firstError = Object.values(result.errors)
            .flat()
            .find(Boolean);

          setMessage(String(firstError ?? "ข้อมูลไม่ถูกต้อง"));
        } else {
          setMessage(result.message ?? "สร้างประกาศไม่สำเร็จ");
        }

        return;
      }

      setMessage("ลงประกาศสำเร็จ");

      form.reset();
      setType("SALE");
    } catch (error) {
      console.error("Create listing error:", error);
      setMessage("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SiteShell>
      <main className={styles.page}>
        <Link href="/marketplace" className={styles.back}>
          ← กลับไปหน้าตลาดสัตว์เลี้ยง
        </Link>

        <header className={styles.heading}>
          <span className={styles.eyebrow}>
            PETMORCHOR MARKETPLACE
          </span>

          <h1>สร้างประกาศสัตว์เลี้ยง</h1>

          <p>กรอกข้อมูลน้องให้ครบถ้วนก่อนลงประกาศ</p>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <section className={styles.section}>
            <h2>ประเภทประกาศ</h2>

            <div className={styles.typeOptions}>
              <label className={styles.typeOption}>
                <input
                  type="radio"
                  name="type"
                  value="SALE"
                  checked={type === "SALE"}
                  onChange={() => setType("SALE")}
                />

                <span>ขาย</span>
              </label>

              <label className={styles.typeOption}>
                <input
                  type="radio"
                  name="type"
                  value="ADOPTION"
                  checked={type === "ADOPTION"}
                  onChange={() => setType("ADOPTION")}
                />

                <span>หาบ้าน / ให้รับเลี้ยง</span>
              </label>
            </div>
          </section>

          <section className={styles.section}>
            <h2>ข้อมูลประกาศ</h2>

            <label className={styles.field}>
              ชื่อประกาศ

              <input
                name="title"
                type="text"
                maxLength={120}
                placeholder="เช่น ลูกแมวกำลังหาบ้าน"
                required
              />
            </label>

            <label className={styles.field}>
              ประเภทสัตว์

              <input
                name="species"
                type="text"
                placeholder="เช่น แมว, สุนัข, กระต่าย"
                required
              />
            </label>

            <label className={styles.field}>
              ราคา (บาท)

              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={type === "ADOPTION" ? "0" : ""}
                placeholder="ระบุราคา หรือ 0 หากให้รับเลี้ยงฟรี"
                required
              />

              <small>
                ประกาศหาบ้านฟรีให้ระบุราคาเป็น 0
              </small>
            </label>

            <label className={styles.field}>
              รายละเอียด

              <textarea
                name="description"
                rows={6}
                placeholder="อธิบายรายละเอียดของสัตว์เลี้ยง"
                required
              />
            </label>
          </section>

          <section className={styles.section}>
            <h2>รูปภาพ</h2>

            <p className={styles.helper}>
              เพิ่ม URL ของรูปภาพอย่างน้อย 1 รูป
            </p>

            {[1, 2, 3].map((number) => (
              <label className={styles.field} key={number}>
                URL รูปภาพ {number}
                {number === 1 ? " (จำเป็น)" : ""}

                <input
                  name="mediaUrl"
                  type="url"
                  required={number === 1}
                  placeholder="https://example.com/pet-photo.jpg"
                />
              </label>
            ))}
          </section>

          <p className={styles.note}>
            สถานะประกาศเริ่มต้นเป็น “พร้อมใช้งาน”
            และบัญชีผู้ลงประกาศจะผูกกับผู้ใช้ที่เข้าสู่ระบบ
          </p>

          {message && (
            <p className={styles.message} role="status">
              {message}
            </p>
          )}

          <button
            className={styles.submit}
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "กำลังลงประกาศ..." : "ลงประกาศ"}
          </button>
        </form>
      </main>
    </SiteShell>
  );
}
