import axios from "axios"

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
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
