"use client";

import { FormEvent, useEffect, useState } from "react";
import styles from "./page.module.css";

type Category = { id: number; name: string };
type Article = {
  id: number;
  categoryId: number;
  title: string;
  content: string;
  speciesTag: string;
  category: Category;
};

type AdminResponse = {
  data: { articles: Article[]; categories: Category[] };
};

const emptyForm = { categoryId: "", title: "", content: "", speciesTag: "" };

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadArticles() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/articles", {
        credentials: "include",
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "ไม่มีสิทธิ์เข้าถึง");
      const data = (result as AdminResponse).data;
      setArticles(data.articles);
      setCategories(data.categories);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadArticles();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function editArticle(article: Article) {
    setEditingId(article.id);
    setForm({
      categoryId: String(article.categoryId),
      title: article.title,
      content: article.content,
      speciesTag: article.speciesTag,
    });
    setNotice("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        editingId ? `/api/admin/articles/${editingId}` : "/api/admin/articles",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            categoryId: Number(form.categoryId),
            title: form.title,
            content: form.content,
            speciesTag: form.speciesTag,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "บันทึกไม่สำเร็จ");
      setNotice(editingId ? "แก้ไขบทความสำเร็จ" : "สร้างบทความสำเร็จ");
      resetForm();
      await loadArticles();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function removeArticle(article: Article) {
    if (!window.confirm(`ต้องการลบบทความ "${article.title}" หรือไม่`)) return;
    setError("");
    setNotice("");
    const response = await fetch(`/api/admin/articles/${article.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.message ?? "ลบบทความไม่สำเร็จ");
      return;
    }
    setArticles((current) => current.filter((item) => item.id !== article.id));
    if (editingId === article.id) resetForm();
    setNotice("ลบบทความสำเร็จ");
  }

  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <span>ADMIN</span>
        <h1>จัดการบทความ</h1>
        <p>สร้าง แก้ไข และลบบทความความรู้สำหรับสมาชิก</p>
      </header>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}

      <form className={styles.form} onSubmit={submit}>
        <h2>{editingId ? "แก้ไขบทความ" : "เพิ่มบทความใหม่"}</h2>
        <label>
          หมวดหมู่
          <select
            required
            value={form.categoryId}
            onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
          >
            <option value="">เลือกหมวดหมู่</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
        <label>
          หัวข้อ
          <input
            required
            minLength={3}
            maxLength={200}
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </label>
        <label>
          แท็กสายพันธุ์
          <input
            required
            value={form.speciesTag}
            onChange={(event) => setForm({ ...form, speciesTag: event.target.value })}
            placeholder="เช่น สุนัข, แมว"
          />
        </label>
        <label>
          เนื้อหา
          <textarea
            required
            minLength={10}
            rows={8}
            value={form.content}
            onChange={(event) => setForm({ ...form, content: event.target.value })}
          />
        </label>
        <div className={styles.actions}>
          <button type="submit" disabled={saving || categories.length === 0}>
            {saving ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "เพิ่มบทความ"}
          </button>
          {editingId && <button type="button" onClick={resetForm}>ยกเลิก</button>}
        </div>
      </form>

      <section className={styles.list}>
        <h2>บทความทั้งหมด</h2>
        {loading ? <p>กำลังโหลด...</p> : articles.length === 0 ? (
          <p>ยังไม่มีบทความ</p>
        ) : articles.map((article) => (
          <article className={styles.article} key={article.id}>
            <div>
              <span className={styles.meta}>{article.category.name} · {article.speciesTag}</span>
              <h3>{article.title}</h3>
              <p>{article.content}</p>
            </div>
            <div className={styles.articleActions}>
              <button type="button" onClick={() => editArticle(article)}>แก้ไข</button>
              <button type="button" onClick={() => void removeArticle(article)}>ลบ</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
