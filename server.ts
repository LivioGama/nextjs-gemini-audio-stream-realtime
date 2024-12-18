import {createServer} from 'http'
import {parse} from 'url'
import next from 'next'
import {WebSocket, WebSocketServer} from 'ws'

const DEBUG = false

interface AuthMessage {
  bearer_token: string
  service_url: string
}

function setupProxy(clientWs: WebSocket, serverWs: WebSocket, bufferedMessages: Buffer[]) {
  console.log('Setting up proxy...')

  for (const message of bufferedMessages) {
    try {
      const data = JSON.parse(message.toString())
      if (serverWs.readyState === WebSocket.OPEN) {
        serverWs.send(JSON.stringify(data))
      }
    } catch (e) {
      console.error('Error sending buffered message:', e)
    }
  }

  clientWs.on('message', data => {
    try {
      const parsed = JSON.parse(data.toString())
      if (DEBUG) console.log('Client -> Server:', parsed)
      if (serverWs.readyState === WebSocket.OPEN) {
        serverWs.send(JSON.stringify(parsed))
      }
    } catch (e) {
      console.error('Error forwarding client message:', e)
    }
  })

  serverWs.on('message', data => {
    try {
      const parsed = JSON.parse(data.toString())
      if (DEBUG) console.log('Server -> Client:', parsed)
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(parsed))
      }
    } catch (e) {
      console.error('Error forwarding server message:', e)
    }
  })

  serverWs.on('close', (code, reason) => {
    console.log('Server closed connection', {code, reason: reason.toString()})
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(code, reason)
    }
  })

  clientWs.on('close', (code, reason) => {
    console.log('Client closed connection', {code, reason: reason.toString()})
    if (serverWs.readyState === WebSocket.OPEN) {
      serverWs.close(code, reason)
    }
  })

  serverWs.on('error', console.error)
  clientWs.on('error', console.error)
}

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = 3000

async function createNextApp() {
  const app = next({dev, hostname, port})
  await app.prepare()
  return app.getRequestHandler()
}

function setupWebSocketServer(server: any) {
  const wss = new WebSocketServer({
    server,
    path: '/gemini-ws',
  })

  wss.on('connection', clientWs => {
    console.log('Client connected, waiting for auth message...')
    const messageBuffer: Buffer[] = []

    // Start buffering messages immediately
    const bufferHandler = (data: Buffer) => {
      console.log('Buffering message:', data.toString())
      messageBuffer.push(data)
    }

    clientWs.on('message', bufferHandler)

    clientWs.once('message', async message => {
      try {
        const auth = JSON.parse(message.toString()) as AuthMessage
        if (!auth.bearer_token || !auth.service_url) {
          throw new Error('Invalid auth message')
        }

        // Remove the auth message from buffer
        messageBuffer.shift()

        console.log('Creating server websocket...')
        const serverWs = new WebSocket(auth.service_url, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.bearer_token}`,
          },
        })

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Server connection timeout'))
          }, 5000)

          serverWs.once('open', () => {
            clearTimeout(timeout)
            console.log('Server connection established')
            resolve()
          })

          serverWs.once('error', error => {
            clearTimeout(timeout)
            reject(error)
          })
        })

        // Remove the buffering handler before setting up the proxy
        clientWs.removeListener('message', bufferHandler)

        // Setup proxy with buffered messages
        setupProxy(clientWs, serverWs, messageBuffer)
      } catch (error) {
        console.error('Setup error:', error)
        clientWs.close(1011, error instanceof Error ? error.message : 'Unknown error')
      }
    })
  })

  return wss
}

async function startServer() {
  try {
    const handle = await createNextApp()
    const server = createServer((req, res) => {
      const parsedUrl = parse(req.url!, true)
      handle(req, res, parsedUrl)
    })

    setupWebSocketServer(server)

    server.listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
    })

    // Handle hot reload cleanup
    if (dev) {
      const cleanup = () => {
        console.log('Cleaning up...')
        server.close()
        process.exit(0)
      }

      process.on('SIGTERM', cleanup)
      process.on('SIGINT', cleanup)
    }
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

startServer()

export const dynamic = 'force-dynamic'
