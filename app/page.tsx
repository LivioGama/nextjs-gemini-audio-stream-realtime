'use client'
import {useRef, useState} from 'react'
import styles from './page.module.css'
import useGeminiLive from '@/hooks/useGeminiLiveApi'
import useAudioInput from '@/hooks/useAudioInput'
import useAudioOutput from '@/hooks/useAudioOutput'
import useChatMessages from '@/hooks/useChatMessages'
import useMediaDevices from '@/hooks/useMediaDevices'
import {API_HOST, isProd, MODEL, PROJECT_ID, PROXY_URL} from '@/consts'
import useVideoCapture from '@/hooks/useVideoCapture'
import Store from '@/storage/Store'
import isEmpty from 'lodash/isEmpty'
import useAsyncEffect from 'use-async-effect'

const getToken = async () => {
  try {
    // @ts-ignore
    const tokenModule = await import('@/token')
    return tokenModule.token
  } catch (e) {
    return ''
  }
}

const Home = () => {
  const {audioSources, videoSources} = useMediaDevices()
  const {messages, textMessage, setTextMessage, addMessageToChat} = useChatMessages()
  const [accessToken, setAccessToken] = useState<string>()
  const [projectId, setProjectId] = useState(PROJECT_ID)
  const lastSelectedMicrophone = Store.lastSelectedMicrophone.get()
  const lastSelectedWebcam = Store.lastSelectedWebcam.get()
  const [micActive, setMicActive] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [screenShareActive, setScreenShareActive] = useState(false)
  const [systemInstructions, setSystemInstructions] = useState('')
  const [responseModality, setResponseModality] = useState<'AUDIO' | 'TEXT'>('AUDIO')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useAsyncEffect(async () => {
    setAccessToken((await getToken()) || '')
  }, [])

  const {playAudioChunk} = useAudioOutput()

  const {connectionStatus, connect, disconnect, sendMessage, setConfig} = useGeminiLive({
    proxyUrl: PROXY_URL,
    projectId,
    model: MODEL,
    apiHost: API_HOST,
    onResponse: async message => {
      if (message.type === 'AUDIO') {
        await playAudioChunk(message.data)
      } else if (message.type === 'TEXT') {
        addMessageToChat(`>> ${message.data}`)
      }
    },
  })

  const {isRecording} = useAudioInput({
    onAudioChunk: chunk => {
      if (connectionStatus !== WebSocket.OPEN) return
      sendMessage({
        realtime_input: {
          media_chunks: [
            {
              mime_type: 'audio/pcm',
              data: chunk,
            },
          ],
        },
      })
    },
    isEnabled: micActive && connectionStatus === WebSocket.OPEN,
    deviceId: lastSelectedMicrophone,
  })

  useVideoCapture({
    videoElement: videoRef?.current,
    canvasElement: canvasRef?.current,
    onFrame: frameData => {
      if (connectionStatus !== WebSocket.OPEN) return
      sendMessage({
        realtime_input: {
          media_chunks: [
            {
              mime_type: 'image/jpeg',
              data: frameData,
            },
          ],
        },
      })
    },
    mode: cameraActive ? 'webcam' : screenShareActive ? 'screen' : undefined,
    setActive: (active: boolean) => {
      cameraActive ? setCameraActive(active) : setScreenShareActive(active)
    },
    deviceId: lastSelectedWebcam,
    fps: 1,
  })

  const handleConnect = () => {
    if (!accessToken) return
    setConfig(prev => ({
      ...prev,
      responseModalities: responseModality,
      systemInstructions,
    }))
    connect(accessToken)
  }

  const handleSendMessage = () => {
    if (!textMessage.trim()) return
    addMessageToChat(`User: ${textMessage}`)
    sendMessage({
      client_content: {
        turns: [
          {
            role: 'user',
            parts: [{text: textMessage}],
          },
        ],
        turn_complete: true,
      },
    })
    setTextMessage('')
  }

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <div className={styles.logoContainer}>
          <img
            className={styles.logo}
            src='https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/768px-Google_%22G%22_logo.svg.png'
            alt='Gemini Logo'
          />
          <h1>Gemini Multimodal Playground</h1>
        </div>
      </div>

      <div className={styles.card}>
        <h2>Configuration</h2>

        <div className={styles.vstack}>
          <div>
            <div className={styles.hstack}>
              {isProd && (
                <div className={styles.field}>
                  <label>Access Token</label>
                  <input
                    type='password'
                    placeholder='Enter your Google Cloud access token'
                    value={accessToken}
                    onChange={e => setAccessToken(e.target.value)}
                  />
                </div>
              )}

              {isProd && (
                <div className={styles.field}>
                  <label>Project ID</label>
                  <input
                    type='text'
                    placeholder='Your Google Cloud project ID'
                    value={projectId}
                    onChange={e => setProjectId(e.target.value)}
                  />
                </div>
              )}
            </div>
            {isProd && (
              <>
                <p className={styles.note}>
                  If you don't have an Access Token and/or a project ID, you can get one{' '}
                  <a
                    href='https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstarts/quickstart-multimodal'
                    target='_blank'
                    rel='noreferrer'>
                    here
                  </a>
                  .
                </p>
                <div className={styles.divider} />
              </>
            )}
          </div>

          <div className={styles.responseType}>
            <h3>Response Format</h3>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type='radio'
                  name='responseType'
                  value='AUDIO'
                  checked={responseModality === 'AUDIO'}
                  onChange={e => setResponseModality(e.target.value as 'AUDIO' | 'TEXT')}
                />
                <span>Audio Response</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type='radio'
                  name='responseType'
                  value='TEXT'
                  checked={responseModality === 'TEXT'}
                  onChange={e => setResponseModality(e.target.value as 'AUDIO' | 'TEXT')}
                />
                <span>Text Response</span>
              </label>
            </div>
          </div>

          <details className={styles.accordion}>
            <summary>System Instructions</summary>
            <div className={styles.vstack}>
              <textarea
                placeholder='Enter custom instructions for the model...'
                rows={3}
                value={systemInstructions}
                onChange={e => setSystemInstructions(e.target.value)}
              />
            </div>
          </details>
        </div>

        <div className={styles.divider} />

        <div className={styles.connectionButtons}>
          {connectionStatus === WebSocket.OPEN ? (
            <button className={styles.disconnectButton} onClick={disconnect}>
              Disconnect
            </button>
          ) : (
            <button
              className={styles.connectButton}
              onClick={handleConnect}
              disabled={isEmpty(projectId) || isEmpty(accessToken)}>
              Connect to Gemini
            </button>
          )}

          <button
            className={`${styles.statusIndicator} ${
              connectionStatus === WebSocket.OPEN
                ? styles.connected
                : connectionStatus === WebSocket.CONNECTING
                  ? styles.connecting
                  : styles.disconnected
            }`}>
            {connectionStatus === WebSocket.CLOSED && 'Disconnected'}
            {connectionStatus === WebSocket.CONNECTING && 'Connecting...'}
            {connectionStatus === WebSocket.OPEN && 'Connected'}
          </button>
        </div>
      </div>

      <div className={styles.modelState} />

      <div className={styles.hstack}>
        <div className={styles.card}>
          <div className={styles.mediaControls}>
            <div className={styles.deviceSelectors}>
              <select
                className={styles.deviceSelect}
                onChange={e => Store.lastSelectedMicrophone.set(e.target.value)}
                value={lastSelectedMicrophone}>
                <option value=''>Select Microphone</option>
                {audioSources.map(source => (
                  <option key={source.deviceId} value={source.deviceId}>
                    {source.label}
                  </option>
                ))}
              </select>

              <select
                className={styles.deviceSelect}
                onChange={e => Store.lastSelectedWebcam.set(e.target.value)}
                value={lastSelectedWebcam}>
                <option value=''>Select Camera</option>
                {videoSources.map(source => (
                  <option key={source.deviceId} value={source.deviceId}>
                    {source.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.controls}>
              <button
                className={`${styles.controlButton} ${micActive ? styles.active : ''}`}
                onClick={() => setMicActive(!micActive)}
                disabled={!lastSelectedMicrophone || connectionStatus !== WebSocket.OPEN}>
                {micActive ? '🎤 Mic Active' : '🎤 Start Mic'}
              </button>
              <button
                className={`${styles.controlButton} ${cameraActive ? styles.active : ''}`}
                onClick={() => {
                  setCameraActive(!cameraActive)
                  setScreenShareActive(false)
                }}
                disabled={!lastSelectedWebcam}>
                {cameraActive ? '📹 Camera On' : '📹 Start Camera'}
              </button>
              <button
                className={`${styles.controlButton} ${screenShareActive ? styles.active : ''}`}
                onClick={() => {
                  setScreenShareActive(!screenShareActive)
                  setCameraActive(false)
                }}>
                🖥️ Share Screen
              </button>
            </div>

            <div className={styles.mediaPreview}>
              <div className={styles.preview}>
                <video ref={videoRef} className={styles.previewMedia} autoPlay playsInline />
                <canvas ref={canvasRef} className={styles.previewMedia} />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.chatContainer}>
            <div className={styles.messages}>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`${styles.message} ${
                    msg.startsWith('User:') ? styles.userMessage : styles.modelMessage
                  }`}>
                  {msg}
                </div>
              ))}
            </div>

            <input
              className={styles.messageInput}
              type='text'
              placeholder='Type your message...'
              value={textMessage}
              onChange={e => setTextMessage(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              className={styles.sendButton}
              disabled={textMessage.length === 0}
              onClick={handleSendMessage}>
              Send
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

export default Home
