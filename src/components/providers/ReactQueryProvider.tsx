"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export default function ReactQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // สร้าง QueryClient ไว้ใน useState เพื่อป้องกันไม่ให้สร้าง instance ใหม่ทุกครั้งที่มีการ Re-render[cite: 8]
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 2, // แคชข้อมูลไว้ 2 นาที (SWR Cache)[cite: 1, 8]
            gcTime: 1000 * 60 * 10,    // เก็บแคชใน RAM ไว้ 10 นาที
            refetchOnWindowFocus: false, // ป้องกันการยิง query ซ้ำตอนสลับแท็บเบราว์เซอร์
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}