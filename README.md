# Next.js Gemini Audio Stream Realtime 🎙️

A real-time voice interface for Gemini 2.0, leveraging the [Multimodal Live API](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/multimodal-live). Built with Next.js, this project enables seamless voice, webcam, and text and screensharing interactions with Google's most advanced AI model.

![Demo](https://github.com/LivioGama/nextjs-gemini-audio-stream-realtime/blob/main/doc/screen.webp)

## 🚀 Live Demo

Check out the live demo [here](https://gemini-audio.liviogama.com)

## 🛠️ Getting Started

### Prerequisites

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed and configured
- Node.js or [Bun](https://bun.sh) runtime
- Basic familiarity with Next.js

### Setup

**Clone and Install Dependencies:**
```bash
git clone https://github.com/LivioGama/nextjs-gemini-audio-stream-realtime.git
cd nextjs-gemini-audio-stream-realtime
bun install
```

## ⚙️ Configure Environment

1. **Copy `.env.example` to `.env`:**

```bash
cp .env.example .env
```

2. **Generate Google Cloud access token:**

```bash
bun run init-auth-token
```

This command will append your Google Cloud access token to the .env file.

3. **Set Required Environment Variables:**

```bash
NEXT_PUBLIC_PROXY_URL='ws://localhost:3000/gemini-ws'
NEXT_PUBLIC_PROJECT_ID=<your-gcp-project-id>
NEXT_PUBLIC_MODEL='gemini-2.0-flash-exp'
NEXT_PUBLIC_API_HOST='us-central1-aiplatform.googleapis.com'
NEXT_PUBLIC_GOOGLE_ACCESS_TOKEN=<automatically-set-by-init-auth-token>
```

4. **Start Development Server:**

```bash
bun run dev
```

Visit http://localhost:3000 to see the application in action!
