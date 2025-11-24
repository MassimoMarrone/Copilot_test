/**
 * Base API configuration and helper methods
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// Helper to handle response errors
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `HTTP error! status: ${response.status}`
    );
  }

  // Handle empty responses (e.g. 204 No Content)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Generic GET request
export async function get<T>(url: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return handleResponse<T>(response);
}

// Generic POST request
export async function post<T>(url: string, data: any): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return handleResponse<T>(response);
}

// Generic PUT request
export async function put<T>(url: string, data: any): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return handleResponse<T>(response);
}

// Generic DELETE request
export async function del<T>(url: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return handleResponse<T>(response);
}

// Generic Upload request (Multipart/Form-Data)
export async function upload<T>(
  url: string,
  formData: FormData,
  method: "POST" | "PUT" = "POST"
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: method,
    // Content-Type header is automatically set by browser for FormData with boundary
    body: formData,
  });
  return handleResponse<T>(response);
}
