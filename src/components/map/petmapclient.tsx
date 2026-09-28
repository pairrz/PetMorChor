"use client";

import dynamic from "next/dynamic";

const PetMap = dynamic(
  () => import("./petmap"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100%",
          height: "420px",
          borderRadius: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f5",
        }}
      >
        กำลังโหลดแผนที่...
      </div>
    ),
  }
);

export default function PetMapClient() {
  return <PetMap />;
}