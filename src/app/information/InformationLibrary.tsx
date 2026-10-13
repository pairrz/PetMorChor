"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

interface InformationArticle {
  id: number;
  title: string;
  content: string;
  speciesTag: string;
  createdAt: string;
}

interface InformationCategory {
  id: number;
  name: string;
  articles: InformationArticle[];
}

interface InformationLibraryProps {
  categories: InformationCategory[];
}

export function InformationLibrary({ categories }: InformationLibraryProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<InformationArticle | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const articleCount = categories.reduce((total, category) => total + category.articles.length, 0);
  const visibleCategories =
    activeCategoryId === null
      ? categories
      : categories.filter((category) => category.id === activeCategoryId);
  const selectedCategory = categories.find((category) =>
    category.articles.some((article) => article.id === selectedArticle?.id),
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (selectedArticle && dialog && !dialog.open) {
      dialog.showModal();
    }
  }, [selectedArticle]);

  function selectCategory(categoryId: number | null) {
    setActiveCategoryId(categoryId);
    window.requestAnimationFrame(() => {
      document.getElementById("information-results")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <>
      {categories.length === 0 ? (
        <section className={styles.empty}>
          <span aria-hidden="true">📚</span>
          <h2>ยังไม่มีบทความ</h2>
          <p>บทความจะแสดงที่นี่เมื่อมีการเพิ่มข้อมูล</p>
        </section>
      ) : (
        <>
          <section className={styles.library} aria-label="เลือกหมวดความรู้">
            <div>
              <span className={styles.libraryLabel}>เริ่มต้นค้นหา</span>
              <h2>เลือกเรื่องที่สนใจ</h2>
            </div>
            <div className={styles.libraryInfo}>
              <strong>{articleCount}</strong> บทความ
              <span aria-hidden="true">·</span>
              <strong>{categories.length}</strong> หมวดหมู่
            </div>
            <nav className={styles.categoryNav} aria-label="หมวดหมู่บทความ">
              <button
                className={activeCategoryId === null ? styles.activeCategory : undefined}
                type="button"
                aria-pressed={activeCategoryId === null}
                onClick={() => selectCategory(null)}
              >
                ทั้งหมด
                <span>{articleCount}</span>
              </button>
              {categories.map((category) => (
                <button
                  className={
                    activeCategoryId === category.id ? styles.activeCategory : undefined
                  }
                  key={category.id}
                  type="button"
                  aria-pressed={activeCategoryId === category.id}
                  onClick={() => selectCategory(category.id)}
                >
                  {category.name}
                  <span>{category.articles.length}</span>
                </button>
              ))}
            </nav>
          </section>

          <div className={styles.categories} id="information-results">
            {visibleCategories.map((category) => (
              <section className={styles.category} key={category.id}>
                <div className={styles.categoryHeading}>
                  <span className={styles.categoryMark} aria-hidden="true">✦</span>
                  <h2>{category.name}</h2>
                  <span className={styles.categoryCount}>{category.articles.length} บทความ</span>
                </div>

                <div className={styles.articles}>
                  {category.articles.map((article) => (
                    <article className={styles.article} key={article.id}>
                      <button
                        className={styles.articleOpen}
                        type="button"
                        onClick={() => setSelectedArticle(article)}
                        aria-label={`อ่านบทความ ${article.title}`}
                      >
                        <span className={styles.articleMeta}>
                          <span className={styles.categoryTag}>{category.name}</span>
                          <span className={styles.speciesTag}>{article.speciesTag}</span>
                        </span>

                        <span className={styles.articleTitle}>{article.title}</span>
                        <span className={styles.content}>{article.content}</span>

                        <span className={styles.articleFooter}>
                          <span>กดเพื่ออ่านรายละเอียด</span>
                          <time dateTime={article.createdAt}>{formatDate(article.createdAt)}</time>
                        </span>
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      <dialog
        className={styles.articleDialog}
        ref={dialogRef}
        aria-labelledby="information-dialog-title"
        onClose={() => setSelectedArticle(null)}
        onClick={(event) => {
          if (event.target === dialogRef.current) {
            dialogRef.current.close();
          }
        }}
      >
        {selectedArticle && (
          <div className={styles.dialogContent}>
            <div className={styles.dialogHeader}>
              <span className={styles.eyebrow}>บทความความรู้สัตว์เลี้ยง</span>
              <button
                className={styles.dialogClose}
                type="button"
                aria-label="ปิดบทความ"
                onClick={() => dialogRef.current?.close()}
              >
                ×
              </button>
            </div>
            <div className={styles.articleMeta}>
              {selectedCategory && (
                <span className={styles.categoryTag}>{selectedCategory.name}</span>
              )}
              <span className={styles.speciesTag}>{selectedArticle.speciesTag}</span>
            </div>
            <h2 id="information-dialog-title">{selectedArticle.title}</h2>
            <p className={styles.dialogText}>{selectedArticle.content}</p>
            <footer className={styles.dialogFooter}>
              <span>ข้อมูลทั่วไปสำหรับคนรักสัตว์</span>
              <time dateTime={selectedArticle.createdAt}>
                {formatDate(selectedArticle.createdAt)}
              </time>
            </footer>
          </div>
        )}
      </dialog>
    </>
  );
}
