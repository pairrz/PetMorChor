// src/hooks/usePosts.ts
"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchFeedPosts, toggleLikePost, PostsResponse } from "@/lib/api/posts";

export const POSTS_QUERY_KEY = ["posts", "feed"];

export function usePosts(category?: string) {
  return useInfiniteQuery({
    queryKey: [...POSTS_QUERY_KEY, category],
    queryFn: ({ pageParam }) =>
      fetchFeedPosts({ cursor: pageParam, category }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: PostsResponse) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 1000 * 60 * 2, // 2 นาที
    gcTime: 1000 * 60 * 10,
  });
}

// Hook สำหรับกด Like พร้อม Optimistic Updates (ให้ UI ตอบสนองทันทีแบบ SPA)
export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: number) => toggleLikePost(postId),
    onSuccess: () => {
      // Invalidate cache เพื่อ sync ตัวเลขยอด like ล่าสุด
      queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY });
    },
  });
}