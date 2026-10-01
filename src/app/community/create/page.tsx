"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/layout/SiteShell";
import styles from "./page.module.css";

export default function CreateCommunityPostPage() {
  const router = useRouter();

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caption: form.get("caption"),
          description: form.get("description"),
          category: form.get("category"),
          media: [],
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
          <span className={styles.eyebrow}>
            PETMORCHOR COMMUNITY
          </span>

          <h1>สร้างโพสต์</h1>

          <p>
            แบ่งปันเรื่องราวกับชุมชนคนรักสัตว์
          </p>
        </header>

        <form
          className={styles.form}
          onSubmit={handleSubmit}
        >
          <label className={styles.field}>
            หมวดหมู่

            <select
              name="category"
              defaultValue="GENERAL"
              required
            >
              <option value="GENERAL">
                ชุมชนทั่วไป
              </option>

              <option value="LOST_PET">
                สัตว์เลี้ยงหาย
              </option>

              <option value="ADOPTION">
                หาบ้าน / รับเลี้ยง
              </option>
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
              placeholder="เล่าเรื่องราวหรือรายละเอียดที่ต้องการแบ่งปัน"
              required
            />
          </label>

          {error && (
            <p
              className={styles.error}
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            className={styles.submit}
            type="submit"
            disabled={submitting}
          >
            {submitting ? "กำลังโพสต์..." : "โพสต์"}
          </button>
        </form>
      </main>
    </SiteShell>
  );
}