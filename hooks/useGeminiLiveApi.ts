import {useCallback, useState} from 'react'
import {GeminiLiveResponseMessage, GeminiWebSocketMessage} from '@/types'
import {API_HOST, PROJECT_ID, PROXY_URL} from '@/consts'

const useGeminiLive = ({
  model,
  onResponse,
}: {
  model: string
  onResponse: (message: GeminiLiveResponseMessage) => void
}) => {
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<number>(WebSocket.CLOSED)

  const getAccessToken = async () => {
    const response = await fetch('/api/get-token')
    const data = await response.json()
    if (!response.ok) throw new Error(data.error)
    return data.token
  }

  const connect = useCallback(async config => {
    if (webSocket?.readyState === WebSocket.OPEN) return

    try {
      const accessToken = await getAccessToken()

      const ws = new WebSocket(PROXY_URL)
      setWebSocket(ws)

      ws.onopen = () => {
        setConnectionStatus(WebSocket.OPEN)
        const serviceSetupMessage = {
          bearer_token: accessToken,
          service_url: `wss://${API_HOST}/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`,
        }
        ws.send(JSON.stringify(serviceSetupMessage))

        const sessionSetupMessage = {
          setup: {
            model: `projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/${model}`,
            generation_config: {response_modalities: config.responseModalities},
            system_instruction: {parts: [{text: config.systemInstructions}]},
          },
        }
        ws.send(JSON.stringify(sessionSetupMessage))
      }
      ws.onclose = event => {
        setConnectionStatus(WebSocket.CLOSED)
        if (event.code === 1008) {
          console.error('Token expired or invalid')
        }
      }
      ws.onerror = error => {
        console.error('WebSocket error:', error)
        setConnectionStatus(WebSocket.CLOSED)
      }
      ws.onmessage = event => {
        // console.log('Message received: ', event)
        const messageData = JSON.parse(event.data)
        onResponse(new GeminiLiveResponseMessage(messageData))
      }
    } catch (error) {
      console.error('Failed to connect:', error)
      setConnectionStatus(WebSocket.CLOSED)
    }
  }, [])

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
  }
}

export default useGeminiLive
