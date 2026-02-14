import type {
  SequenceResponse,
  SequenceListItem,
  PaginatedResponse,
  TovConfig,
  GenerateSequenceInput,
  ApiResponse,
} from "@/types";

const BASE_URL = "/api";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1500;

/**
 * Sleep helper for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determine if an error/status is retryable
 */
function isRetryable(status: number): boolean {
  // Retry on server errors (5xx), 408 (timeout), 429 (rate limit)
  return status >= 500 || status === 408 || status === 429;
}

/**
 * Core request function with automatic retry + exponential backoff
 */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}${url}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
      });

      // If retryable status and we have attempts left, retry
      if (!res.ok && isRetryable(res.status) && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(
          `[API] Request to ${url} failed (${res.status}), retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})...`
        );
        await sleep(delay);
        continue;
      }

      const json: ApiResponse<T> = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || `Request failed (${res.status})`);
      }

      return json.data as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Only retry on network errors (fetch itself failed), not on parsed API errors
      const isNetworkError =
        lastError.message === "Failed to fetch" ||
        lastError.message.includes("NetworkError") ||
        lastError.message.includes("ECONNREFUSED") ||
        lastError.message.includes("Load failed");

      if (isNetworkError && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(
          `[API] Network error on ${url}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})...`
        );
        await sleep(delay);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error("Request failed after retries");
}

/** POST /api/sequences/generate — no retry (long-running, handled by backend) */
export async function generateSequence(
  input: GenerateSequenceInput
): Promise<SequenceResponse> {
  const res = await fetch(`${BASE_URL}/sequences/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const json: ApiResponse<SequenceResponse> = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || `Request failed (${res.status})`);
  }

  return json.data as SequenceResponse;
}

/** GET /api/sequences/:id */
export async function getSequence(id: string): Promise<SequenceResponse> {
  return request<SequenceResponse>(`/sequences/${id}`);
}

/** GET /api/sequences?page=&limit= */
export async function getSequences(
  page = 1,
  limit = 10
): Promise<PaginatedResponse<SequenceListItem>> {
  return request<PaginatedResponse<SequenceListItem>>(
    `/sequences?page=${page}&limit=${limit}`
  );
}

/** GET /api/tov-configs */
export async function getTovConfigs(): Promise<TovConfig[]> {
  return request<TovConfig[]>("/tov-configs");
}

/** POST /api/tov-configs */
export async function createTovConfig(
  data: Omit<TovConfig, "id" | "created_at" | "updated_at">
): Promise<TovConfig> {
  return request<TovConfig>("/tov-configs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** DELETE /api/tov-configs/:id */
export async function deleteTovConfig(id: string): Promise<void> {
  await request<{ message: string }>(`/tov-configs/${id}`, {
    method: "DELETE",
  });
}
