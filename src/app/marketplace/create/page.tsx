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
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      formData.set("type", type);

      const response = await fetch("/api/marketplace/listings", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "ลงประกาศไม่สำเร็จ กรุณาลองอีกครั้ง");
      }

      router.push("/marketplace");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง",
      );
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
          <span className={styles.eyebrow}>PETMORCHOR MARKETPLACE</span>
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
              <small>ประกาศหาบ้านฟรีให้ระบุราคาเป็น 0</small>
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

          <p className={styles.note}>
            บัญชีผู้ลงประกาศจะผูกกับผู้ใช้ที่เข้าสู่ระบบ
          </p>

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