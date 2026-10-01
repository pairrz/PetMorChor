"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./BannerPromote.module.css";

const slides = [
  {
    label: "PETMORCHOR · CHIANG MAI UNIVERSITY",
    title: "เพื่อนรักสี่ขา",
    subtitle: "ในรั้วมหาวิทยาลัยเชียงใหม่",
    description: "ค้นหา แชร์ และช่วยเหลือสัตว์เลี้ยงในชุมชน มช.",
    action: "ค้นหาสัตว์เลี้ยง",
    href: "/marketplace",
    decoration: "🐾",
  },
  {
    label: "หาบ้านให้น้อง",
    title: "เริ่มต้นเรื่องราวดี ๆ",
    subtitle: "ได้ที่นี่",
    description: "ช่วยให้น้องได้พบกับบ้านที่อบอุ่นในชุมชนของเรา",
    action: "ดูประกาศหาบ้าน",
    href: "/marketplace",
    decoration: "🏡",
  },
  {
    label: "ชุมชนคนรักสัตว์",
    title: "แบ่งปันเรื่องราว",
    subtitle: "และช่วยเหลือกัน",
    description: "พบปะเพื่อน ๆ ที่รักสัตว์ในมหาวิทยาลัยเชียงใหม่",
    action: "เข้าสู่ชุมชน",
    href: "/community",
    decoration: "💛",
  },
];

export function BannerPromote() {
  const [activeIndex, setActiveIndex] = useState(0);
  const slide = slides[activeIndex];

  const showSlide = (index: number) => {
    setActiveIndex((index + slides.length) % slides.length);
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className={styles.banner} aria-label="แบนเนอร์ PetMorChor">
      <div className={styles.content} key={activeIndex}>
        <span className={styles.brand}>{slide.label}</span>
        <h2 className={styles.title}>
          {slide.title}
          <br />
          {slide.subtitle}
        </h2>
        <p className={styles.description}>{slide.description}</p>
        <Link className={styles.cta} href={slide.href}>
          {slide.action} <span aria-hidden="true">→</span>
        </Link>
      </div>

      <span className={styles.decoration} aria-hidden="true">
        {slide.decoration}
      </span>

      <button
        className={`${styles.arrow} ${styles.previous}`}
        type="button"
        onClick={() => showSlide(activeIndex - 1)}
        aria-label="แบนเนอร์ก่อนหน้า"
      >
        ‹
      </button>
      <button
        className={`${styles.arrow} ${styles.next}`}
        type="button"
        onClick={() => showSlide(activeIndex + 1)}
        aria-label="แบนเนอร์ถัดไป"
      >
        ›
      </button>

      <div className={styles.dots} aria-label="เลือกแบนเนอร์">
        {slides.map((item, index) => (
          <button
            key={item.label}
            className={`${styles.dot} ${index === activeIndex ? styles.activeDot : ""}`}
            type="button"
            onClick={() => showSlide(index)}
            aria-label={`แสดงแบนเนอร์ที่ ${index + 1}`}
            aria-current={index === activeIndex ? "true" : undefined}
          />
        ))}
      </div>
    </section>
  );
}