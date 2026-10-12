"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";
import { useImageUpload, type UploadedImage } from "@/hooks/useImageUpload";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";

const MAX_IMAGES = 5;
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function CreateListingPage() {
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  // จำรูปที่อัปโหลดสำเร็จแล้ว กดลงประกาศซ้ำตอน API พลาดจะไม่อัปโหลดใหม่
  const uploadedCache = useRef(new Map<File, UploadedImage>());

  const [type, setType] = useState<"SALE" | "ADOPTION">("SALE");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const upload = useImageUpload("listing");

  // สร้าง/คืนค่า preview URL ทุกครั้งที่รายการไฟล์เปลี่ยน
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  function handleFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = ""; // ให้เลือกไฟล์เดิมซ้ำได้

    const invalid = picked.find(
      (file) => !ALLOWED_TYPES.includes(file.type) || file.size > MAX_SIZE,
    );
    if (invalid) {
      setMessage("รองรับเฉพาะ JPG, PNG, WEBP ขนาดไม่เกิน 5MB ต่อรูป");
      return;
    }

    const next = [...files, ...picked];
    setMessage(
      next.length > MAX_IMAGES ? `แนบรูปได้สูงสุด ${MAX_IMAGES} รูป` : "",
    );
    setFiles(next.slice(0, MAX_IMAGES));
  }

  function removeFile(index: number) {
    uploadedCache.current.delete(files[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadAll(): Promise<UploadedImage[]> {
    const results: UploadedImage[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let result = uploadedCache.current.get(file);
      if (!result) {
        setProgress(`กำลังอัปโหลดรูป ${i + 1}/${files.length}`);
        result = await upload.mutateAsync(file);
        uploadedCache.current.set(file, result);
      }
      results.push(result);
    }
    return results;
  }

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

      let media: { publicId: string; width?: number; height?: number }[] = [];
      try {
        const uploaded = await uploadAll();
        media = uploaded.map(({ publicId, width, height }) => ({
          publicId,
          width,
          height,
        }));
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "อัปโหลดรูปภาพไม่สำเร็จ",
        );
        return;
      } finally {
        setProgress("");
      }

      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          species,
          price,
          type,
          media,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors) {
          const firstError = Object.values(result.errors).flat().find(Boolean);
          setMessage(String(firstError ?? "ข้อมูลไม่ถูกต้อง"));
        } else {
          setMessage(result.message ?? "สร้างประกาศไม่สำเร็จ");
        }
        return;
      }

      setMessage("ลงประกาศสำเร็จ");

      form.reset();
      setType("SALE");
      setFiles([]);
      uploadedCache.current.clear();

      router.push("/marketplace");
      router.refresh();
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
                maxLength={100}
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
                minLength={10}
                placeholder="อธิบายรายละเอียดของสัตว์เลี้ยง"
              />
            </label>
          </section>

          <section className={styles.section}>
            <h2>รูปภาพสัตว์เลี้ยง</h2>

            <div className={styles.field}>
              <span>
                เลือกรูปภาพ ({files.length}/{MAX_IMAGES})
              </span>

              {files.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
                    gap: 10,
                  }}
                >
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${file.size}-${index}`}
                      style={{
                        position: "relative",
                        aspectRatio: "1 / 1",
                        overflow: "hidden",
                        border: "1px solid #ded2ef",
                        borderRadius: 8,
                        background: "#f5f1fb",
                      }}
                    >
                      {previews[index] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={previews[index]}
                          alt={file.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        disabled={isSubmitting}
                        aria-label={`ลบรูป ${file.name}`}
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          width: 24,
                          height: 24,
                          border: 0,
                          borderRadius: "50%",
                          color: "#fff",
                          background: "rgba(0,0,0,0.6)",
                          cursor: "pointer",
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || files.length >= MAX_IMAGES}
                style={{
                  alignSelf: "flex-start",
                  padding: "8px 14px",
                  border: 0,
                  borderRadius: 6,
                  color: "#fff",
                  background: "#6840c6",
                  cursor: "pointer",
                  opacity: files.length >= MAX_IMAGES ? 0.5 : 1,
                }}
              >
                เพิ่มไฟล์
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
                onChange={handleFilesChange}
              />
              <small>JPG, PNG, WEBP ไม่เกิน 5MB ต่อรูป</small>
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
            {isSubmitting ? progress || "กำลังลงประกาศ..." : "ลงประกาศ"}
          </button>
        </form>
      </main>
    </SiteShell>
  );
}