// src/lib/api/posts.ts
import { apiClient } from "./client";

export interface PostItem {
  id: number;
  content: string;
  isPinned: boolean;
  category: "GENERAL" | "LOST_PET";
  createdAt: string;
  isLiked: boolean;
  user: {
    id: number;
    name: string;
    image?: string | null;
  };
  media: Array<{
    id: number;
    mediaUrl: string;
    mediaType: string;
  }>;
  _count: {
    likes: number;
    comments: number;
  };
}

export interface PostsResponse {
  success: boolean;
  data: PostItem[];
  pagination: {
    nextCursor: string | null;
  };
}

export async function fetchFeedPosts({
  cursor,
  limit = 10,
  category,
}: {
  cursor?: string | null;
  limit?: number;
  category?: string;
}): Promise<PostsResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", limit.toString());
  if (category) params.set("category", category);

  return apiClient<PostsResponse>(`/api/posts?${params.toString()}`, {
    method: "GET",
  });
}

export async function toggleLikePost(postId: number): Promise<{ success: boolean; liked: boolean }> {
  return apiClient(`/api/posts/${postId}/like`, {
    method: "POST",
  });
}