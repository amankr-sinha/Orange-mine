import axios from "axios"

function normalizeBaseUrl(url: string): string {
  // Avoid double slashes when callers use absolute URLs with trailing '/'
  // while still allowing "" (same-origin).
  return url.endsWith("/") ? url.slice(0, -1) : url
}

export const api = axios.create({
  // In production (Railway), frontend and backend are served from the same origin
  // (Flask serves the SPA + API). Using localhost in the browser causes "Network Error".
  baseURL: normalizeBaseUrl(
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? (import.meta.env.PROD ? "" : "http://localhost:5000")
  ),
})

export type ApiError = { error?: string; message?: string }

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiError | undefined
    return data?.error || data?.message || err.message
  }
  if (err instanceof Error) return err.message
  return "Unknown error"
}
