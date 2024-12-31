# Next.js Gemini Audio Stream Realtime 🎙️

A real-time voice interface for Gemini 2.0, leveraging
the [Multimodal Live API](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/multimodal-live). Built
with Next.js, this project enables seamless voice, webcam, and text and screensharing interactions with Google's most
advanced AI model.

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

2. **Generate a service account:**

Go to [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts) and select or create your project. Ensure [Vertex AI API is enabled](https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstarts/quickstart-multimodal).

Create
a new service account with permission `roles/aiplatform.user` and download the JSON key file.

3. **Set Required Environment Variables:**

```bash
NEXT_PUBLIC_PROXY_URL='ws://localhost:3000/gemini-ws'
NEXT_PUBLIC_MODEL='gemini-2.0-flash-exp'
NEXT_PUBLIC_API_HOST='us-central1-aiplatform.googleapis.com'
NEXT_PUBLIC_PROJECT_ID=<your-gcp-project-id>
GOOGLE_CLIENT_EMAIL="<retrieve-from-downloaded-google-account-service>"
GOOGLE_PRIVATE_KEY="<retrieve-from-downloaded-google-account-service>"
```

> ⚠️
> If you get a `ERR_OSSL_UNSUPPORTED` error, be very careful with the `GOOGLE_PRIVATE_KEY` formatting, it must be a
> single
> line string between quotes, and the \n must be converted to actual \n characters.

I actually had to run this js script to get the correct one:

```js
const original = '-----BEGIN PRIVATE KEY-----\n...'
console.log(original.replace(/\n/g, '\\n'))
```

## 🚀 Start Development Server

```bash
bun run dev
```

Visit http://localhost:3000 to see the application in action!

## 🔍 Caveats

This project is still in development. Known issues:

- The camera devices are not detected on my MacBook although there is a ghost camera without name
- The Text Response is not tested and I do not think it's working, I focused more on the audio live speech and the
  screensharing at the moment.
- The System Instructions are not tested.
- The quota and limit are insanely quickly exceeded, you might have to take some 10 minutes break while using.

## 🤝 Contributing

Feel free to contribute if you have some free time! 🍻

## 🌐 API and architecture considerations

This project DOES NOT USE
`wss://{HOST}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=` but
`wss://${HOST}/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`.

Therefore, it cannot be used with a Gemini Api Key, but only with a Google Cloud Service Account (by design)

---

Here is a breakdown comparison from Gemini itself:

**Analogy:** Imagine a conversation:

* **`GenerativeService.BidiGenerateContent`:** Like writing a full letter, sending it, and receiving a reply letter.
  There's no back and forth during the process.
* **`LlmBidiService/BidiGenerateContent`:** Like having a live phone conversation where you can talk, interrupt each
  other, and change the direction of the conversation.

**Why the Difference?**

* **Different APIs, Different Focus:**
    * `GenerativeService` (part of the Gemini API) is primarily focused on providing a simplified interface for general
      text generation tasks.
    * `LlmBidiService` (part of the Vertex AI Platform) is designed for more complex AI application development and
      provides more granular control, including support for real-time, conversational interaction.
* **Streaming Requirements:** Real-time interaction requires streaming. `LlmBidiService` is built from the ground up to
  handle this, while `GenerativeService` is not.

**The key differences in a table:**

| Feature            | `google.ai.generativelanguage.v1alpha.GenerativeService`                    | `google.cloud.aiplatform.v1beta1.LlmBidiService`                                            |
|--------------------|-----------------------------------------------------------------------------|---------------------------------------------------------------------------------------------|
| **Service**        | Generative Language API (Google AI)                                         | Vertex AI (Google Cloud Platform)                                                           |
| **Version**        | `v1alpha` (Alpha)                                                           | `v1beta1` (Beta)                                                                            |
| **Purpose**        | General-purpose text generation                                             | LLMs within Google Cloud environment                                                        |
| **Authentication** | Likely API Key                                                              | Likely OAuth 2.0 (Google Cloud credentials)                                                 |
| **Likely Models**  | PaLM 2 or earlier generative language models provided directly by Google AI | Gemini, PaLM 2 (via Vertex AI), and other models available in Vertex AI                     |
| **Infrastructure** | Not directly tied to Google Cloud infrastructure                            | Tightly integrated with Google Cloud project management, model deployment, monitoring, etc. |
| **Use Case**       | Quick prototyping and experimentation with generative AI                    | Production-grade applications, leveraging Google Cloud's features and infrastructure        |
