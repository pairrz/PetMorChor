// src/lib/api/client.ts
export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const config: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    // สำคัญ: แนบคุกกี้ HttpOnly Session ไปกับทุก Request (Slide T09p4)
    credentials: "include",
  };

  const response = await fetch(endpoint, config);
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      response.status,
      result.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย",
      result.errors
    );
  }

  return result;
}