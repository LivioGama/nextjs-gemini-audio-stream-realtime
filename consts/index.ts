export const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || 'ws://localhost:3000/gemini-ws'
export const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID
export const MODEL = process.env.NEXT_PUBLIC_MODEL || 'gemini-2.0-flash-exp'
export const API_HOST = process.env.NEXT_PUBLIC_API_HOST || 'us-central1-aiplatform.googleapis.com'

export const isDev = process.env.NODE_ENV === 'development'
export const isProd = !isDev
