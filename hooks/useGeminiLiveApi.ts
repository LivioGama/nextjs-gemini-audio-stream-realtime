import {useCallback, useState} from 'react'
import {GeminiLiveResponseMessage, GeminiWebSocketMessage, ModalityResponse} from '@/types'

const useGeminiLive = ({
  proxyUrl,
  projectId,
  model,
  apiHost,
  onResponse,
}: {
  proxyUrl: string
  projectId: string
  model: string
  apiHost: string
  onResponse: (message: GeminiLiveResponseMessage) => void
}) => {
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<number>(WebSocket.CLOSED)
  const [config, setConfig] = useState({
    responseModalities: 'AUDIO' as ModalityResponse,
    systemInstructions: '',
    accessToken: '',
  })

  const connect = useCallback(
    (accessToken: string) => {
      if (webSocket?.readyState === WebSocket.OPEN) return

      const ws = new WebSocket(proxyUrl)
      setWebSocket(ws)
      setConfig(prev => ({...prev, accessToken}))

      ws.onopen = () => {
        setConnectionStatus(WebSocket.OPEN)
        const serviceSetupMessage = {
          bearer_token: accessToken,
          service_url: `wss://${apiHost}/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`,
        }
        ws.send(JSON.stringify(serviceSetupMessage))

        const sessionSetupMessage = {
          setup: {
            model: `projects/${projectId}/locations/us-central1/publishers/google/models/${model}`,
            generation_config: {response_modalities: config.responseModalities},
            system_instruction: {parts: [{text: config.systemInstructions}]},
          },
        }
        ws.send(JSON.stringify(sessionSetupMessage))
      }
      ws.onclose = event => {
        setConnectionStatus(WebSocket.CLOSED)
        if (event.code === 1008) {
          console.error('Token expired, run `init-auth-token` to refresh it and restart the app')
        }
      }
      ws.onerror = () => setConnectionStatus(WebSocket.CLOSED)
      ws.onmessage = event => {
        console.log('Message received: ', event)
        const messageData = JSON.parse(event.data)
        onResponse(new GeminiLiveResponseMessage(messageData))
      }
    },
    [proxyUrl, config.responseModalities, config.systemInstructions],
  )

  const disconnect = useCallback(() => {
    webSocket?.close()
    setWebSocket(null)
    setConnectionStatus(WebSocket.CLOSED)
  }, [webSocket])

  const sendMessage = useCallback(
    (message: GeminiWebSocketMessage) => {
      if (webSocket?.readyState === WebSocket.OPEN) {
        webSocket.send(JSON.stringify(message))
      }
    },
    [webSocket],
  )

  return {
    connectionStatus,
    connect,
    disconnect,
    sendMessage,
    setConfig,
  }
}

export default useGeminiLive
