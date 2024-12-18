export type ServiceSetupMessage = {
  bearer_token: string
  service_url: string
}

export type SessionSetupMessage = {
  setup: {
    model: string
    generation_config: {
      response_modalities: string[]
    }
    system_instruction: {
      parts: [
        {
          text: string
        },
      ]
    }
  }
}

export type TextMessage = {
  client_content: {
    turns: [
      {
        role: 'user'
        parts: [
          {
            text: string
          },
        ]
      },
    ]
    turn_complete: boolean
  }
}

export type RealtimeInputMessage = {
  realtime_input: {
    media_chunks: [
      {
        mime_type: string
        data: string
      },
    ]
  }
}

export type GeminiWebSocketMessage =
  | ServiceSetupMessage
  | SessionSetupMessage
  | TextMessage
  | RealtimeInputMessage

export interface GeminiLiveResponseMessageData {
  serverContent?: {
    turnComplete?: boolean
    modelTurn?: {
      parts?: Array<{
        text?: string
        inlineData?: {
          data: string
        }
      }>
    }
  }
  setupComplete?: boolean
}

export type ModalityResponse = 'AUDIO' | 'TEXT'

export class GeminiLiveResponseMessage {
  data: string
  type: string
  endOfTurn: boolean

  constructor(data: GeminiLiveResponseMessageData) {
    this.data = ''
    this.type = ''
    this.endOfTurn = data?.serverContent?.turnComplete || false

    const parts = data?.serverContent?.modelTurn?.parts

    if (data?.setupComplete) {
      this.type = 'SETUP COMPLETE'
    } else if (parts?.length && parts[0].text) {
      this.data = parts[0].text
      this.type = 'TEXT'
    } else if (parts?.length && parts[0].inlineData) {
      this.data = parts[0].inlineData.data
      this.type = 'AUDIO'
    }
  }
}
