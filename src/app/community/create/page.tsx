"use client";

import { useRef, useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/layout/SiteShell";
import styles from "./page.module.css";
import { useImageUpload } from "@/hooks/useImageUpload";

type UploadedImage = {
  publicId: string;
  width?: number;
  height?: number;
};

const MAX_IMAGES = 5;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function CreateCommunityPostPage() {
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  // แคชรูปที่อัปโหลดสำเร็จแล้ว ป้องกันการอัปโหลดซ้ำเมื่อส่งฟอร์มใหม่
  const uploadedCache = useRef(new Map<File, UploadedImage>());

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const upload = useImageUpload("post");

  // สร้างและคืนค่า preview URL เมื่อรายการไฟล์เปลี่ยนแปลง
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  function handleFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = ""; // รีเซ็ตเพื่อให้เลือกไฟล์เดิมซ้ำได้

    const invalid = picked.find(
      (file) => !ALLOWED_TYPES.includes(file.type) || file.size > MAX_SIZE
    );
    if (invalid) {
      setError("รองรับเฉพาะไฟล์ JPG, PNG, WEBP ขนาดไม่เกิน 5MB ต่อรูป");
      return;
    }

    const next = [...files, ...picked];
    setError(
      next.length > MAX_IMAGES ? `แนบรูปได้สูงสุด ${MAX_IMAGES} รูป` : ""
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
        setProgress(`กำลังอัปโหลดรูป ${i + 1}/${files.length}...`);
        result = await upload.mutateAsync(file);
        uploadedCache.current.set(file, result);
      }
      results.push(result);
    }
    return results;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const caption = String(formData.get("caption") ?? "").trim();
      const description = String(formData.get("description") ?? "").trim();
      const category = (formData.get("category") as string) || "GENERAL";

      // อัปโหลดรูปภาพทั้งหมด
      let media: { publicId: string; width?: number; height?: number }[] = [];
      try {
        const uploaded = await uploadAll();
        media = uploaded.map(({ publicId, width, height }) => ({
          publicId,
          mediaType: "IMAGE",
          width,
          height,
        }));
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "อัปโหลดรูปภาพไม่สำเร็จ"
        );
        return;
      } finally {
        setProgress("");
      }

      // ส่งข้อมูลไปที่ API
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caption,
          description,
          category,
          media,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }

        throw new Error(
          result.message || result.error || "สร้างโพสต์ไม่สำเร็จ"
        );
      }

      // ล้างสถานะเมื่อสำเร็จ
      form.reset();
      setFiles([]);
      uploadedCache.current.clear();

      router.push("/community");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "เกิดข้อผิดพลาด กรุณาลองใหม่"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SiteShell>
      <main className={styles.page}>
        <Link href="/community" className={styles.back}>
          ← กลับไปชุมชน
        </Link>

        <header className={styles.heading}>
          <span className={styles.eyebrow}>PETMORCHOR COMMUNITY</span>
          <h1>สร้างโพสต์</h1>
          <p>แบ่งปันเรื่องราวกับชุมชนคนรักสัตว์</p>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            หมวดหมู่
            <select name="category" defaultValue="GENERAL" required>
              <option value="GENERAL">ชุมชนทั่วไป</option>
              <option value="LOST_PET">สัตว์เลี้ยงหาย</option>
              <option value="ADOPTION">หาบ้าน / รับเลี้ยง</option>
            </select>
          </label>

          <label className={styles.field}>
            หัวข้อ
            <input
              name="caption"
              type="text"
              maxLength={150}
              placeholder="เขียนหัวข้อโพสต์"
              required
            />
          </label>

          <label className={styles.field}>
            รายละเอียด
            <textarea
              name="description"
              rows={8}
              minLength={5}
              placeholder="เล่าเรื่องราวหรือรายละเอียดที่ต้องการแบ่งปัน"
              required
            />
          </label>

          <div className={styles.attachment} aria-label="พื้นที่แนบรูปภาพ">
            <span className={styles.attachmentIcon} aria-hidden="true">
              🖼️
            </span>
            <div>
              <strong>แนบรูปภาพ</strong>
              <p>รองรับ JPG, PNG, WEBP ไม่เกิน 5MB (สูงสุด {MAX_IMAGES} รูป)</p>
            </div>

            <input
              ref={fileInputRef}
              className={styles.fileInput}
              type="file"
              accept={ALLOWED_TYPES.join(",")}
              multiple
              aria-label="เลือกไฟล์รูปภาพ"
              onChange={handleFilesChange}
            />

            <button
              className={styles.attachmentButton}
              type="button"
              disabled={submitting || files.length >= MAX_IMAGES}
              onClick={() => fileInputRef.current?.click()}
            >
              <span aria-hidden="true">＋</span> เพิ่มรูปภาพ
            </button>
          </div>

          {/* แสดงพรีวิวรูปภาพ พร้อมปุ่มกดลบ */}
          {previews.length > 0 && (
            <div className={styles.previewGrid}>
              {previews.map((url, index) => (
                <div key={url} className={styles.previewItem}>
                  <img src={url} alt={`รูปตัวอย่าง ${index + 1}`} />
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => removeFile(index)}
                    disabled={submitting}
                    title="ลบรูปภาพ"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {progress && <p className={styles.progressText}>{progress}</p>}

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button
            className={styles.submit}
            type="submit"
            disabled={submitting}
          >
            {submitting ? (progress || "กำลังโพสต์...") : "โพสต์"}
          </button>
        </form>
      </main>
    </SiteShell>
  );
}