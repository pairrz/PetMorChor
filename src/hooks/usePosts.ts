import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CreatePostInput } from "@/lib/validations/post";

export function usePosts(type?: string) {
  return useQuery({
    queryKey: ["posts", type],
    queryFn: async () => {
      const res = await axios.get(`/api/posts${type ? `?type=${type}` : ""}`);
      return res.data;
    },
    staleTime: 1000 * 60 * 2, // แคชข้อมูลไว้ 2 นาที ไม่ต้องยิงใหม่ทุกครั้งที่กดสลับหน้า
    gcTime: 1000 * 60 * 10,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newPost: CreatePostInput) => {
      const res = await axios.post("/api/posts", newPost);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate cache เพื่อให้หน้า Feed อัปเดตข้อมูลใหม่อัตโนมัติ[cite: 1, 8]
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}