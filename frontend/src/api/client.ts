import type {
  SequenceResponse,
  SequenceListItem,
  PaginatedResponse,
  TovConfig,
  GenerateSequenceInput,
  ApiResponse,
} from "@/types";

const BASE_URL = "/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const json: ApiResponse<T> = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || `Request failed (${res.status})`);
  }

  return json.data as T;
}

/** POST /api/sequences/generate */
export async function generateSequence(
  input: GenerateSequenceInput
): Promise<SequenceResponse> {
  return request<SequenceResponse>("/sequences/generate", {
    method: "POST",
    body: JSON.stringify(input),
  });
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
