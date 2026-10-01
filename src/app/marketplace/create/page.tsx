"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/layout/SiteShell";
import styles from "./page.module.css";

export default function CreateListingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
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

      const mediaFiles = formData
        .getAll("mediaFiles")
        .filter((value): value is File => value instanceof File && value.size > 0);

      let mediaUrls: string[] = [];
      if (mediaFiles.length > 0) {
        const uploadData = new FormData();
        mediaFiles.forEach((file) => uploadData.append("files", file));

        const uploadResponse = await fetch("/api/uploads", {
          method: "POST",
          body: uploadData,
        });
        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok) {
          setMessage(uploadResult.message ?? "อัปโหลดรูปภาพไม่สำเร็จ");
          return;
        }

        mediaUrls = uploadResult.urls;
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
          <p>กรอกข้อมูลน้องก่อนลงประกาศ</p>
        </header>

        <form
          className={styles.form}
          onSubmit={handleSubmit}
          aria-busy={isSubmitting}
        >
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
                key={type}
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
              รายละเอียด (ไม่บังคับ)
              <textarea
                name="description"
                rows={6}
                placeholder="อธิบายรายละเอียดของสัตว์เลี้ยง"
              />
            </label>
          </section>

          <section className={styles.section}>
            <h2>รูปภาพสัตว์เลี้ยง</h2>

            <div className={styles.field}>
              <span>เลือกรูปภาพ</span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  border: "1px solid #ded2ef",
                  borderRadius: 8,
                  background: "#fff",
                }}
              >
                <span
                  aria-live="polite"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    color: "#716b80",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedFiles.length
                    ? selectedFiles.join(", ")
                    : "ยังไม่ได้เลือกไฟล์"}
                </span>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    flexShrink: 0,
                    padding: "8px 14px",
                    border: 0,
                    borderRadius: 6,
                    color: "#fff",
                    background: "#6840c6",
                    cursor: "pointer",
                  }}
                >
                  เพิ่มไฟล์
                </button>

                <input
                  ref={fileInputRef}
                  name="mediaFiles"
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(event) =>
                    setSelectedFiles(
                      Array.from(event.target.files ?? []).map(
                        (file) => file.name,
                      ),
                    )
                  }
                />
              </div>
              <small>เลือกได้หลายรูป</small>
            </div>
          </section>

          {message && (
            <p className={styles.message} role="alert">
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
