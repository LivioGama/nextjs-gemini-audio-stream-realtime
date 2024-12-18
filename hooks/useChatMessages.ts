import {useState} from 'react'

const useChatMessages = () => {
  const [messages, setMessages] = useState<string[]>([])
  const [textMessage, setTextMessage] = useState('')

  const addMessageToChat = (message: string) => {
    setMessages(prev => [...prev, message])
  }

  return {
    messages,
    textMessage,
    setTextMessage,
    addMessageToChat,
  }
}

export default useChatMessages
