import {createServer} from 'http'
import {parse} from 'url'
import next from 'next'
import {WebSocket, WebSocketServer} from 'ws'
import {appendFileSync} from 'fs'

const DEBUG = false

const logToFile = (message: string) => {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${message}\n`

  try {
    appendFileSync('server_output.log', logMessage)
  } catch (error) {
    console.error('Failed to write to log file:', error)
  }
}

interface AuthMessage {
  bearer_token: string
  service_url: string
}

const setupProxy = (clientWs: WebSocket, serverWs: WebSocket, bufferedMessages: Buffer[]) => {
  console.log('Setting up proxy...')
  logToFile('Setting up proxy...')

  for (const message of bufferedMessages) {
    try {
      const data = JSON.parse(message.toString())
      if (serverWs.readyState === WebSocket.OPEN) {
        serverWs.send(JSON.stringify(data))
      }
    } catch (e) {
      console.error('Error sending buffered message:', e)
      logToFile(`Error sending buffered message: ${e}`)
    }
  }

  clientWs.on('message', data => {
    try {
      const parsed = JSON.parse(data.toString())
      if (DEBUG) {
        console.log('Client -> Server:', parsed)
        logToFile(`Client -> Server: ${JSON.stringify(parsed)}`)
      }
      if (serverWs.readyState === WebSocket.OPEN) {
        serverWs.send(JSON.stringify(parsed))
      }
    } catch (e) {
      console.error('Error forwarding client message:', e)
      logToFile(`Error forwarding client message: ${e}`)
    }
  })

  serverWs.on('message', data => {
    try {
      const parsed = JSON.parse(data.toString())
      if (DEBUG) {
        console.log('Server -> Client:', parsed)
        logToFile(`Server -> Client: ${JSON.stringify(parsed)}`)
      }
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(parsed))
      }
    } catch (e) {
      console.error('Error forwarding server message:', e)
      logToFile(`Error forwarding server message: ${e}`)
    }
  })

  serverWs.on('close', (code, reason) => {
    const message = `Server closed connection ${code} ${reason.toString()}`
    console.log('Server closed connection', {code, reason: reason.toString()})
    logToFile(message)
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(code, reason)
    }
  })

  clientWs.on('close', (code, reason) => {
    const message = `Client closed connection ${code} ${reason.toString()}`
    console.log('Client closed connection', {code, reason: reason.toString()})
    logToFile(message)
    if (serverWs.readyState === WebSocket.OPEN) {
      serverWs.close(code, reason)
    }
  })

  serverWs.on('error', error => {
    console.error(error)
    logToFile(`Server WebSocket error: ${error}`)
  })

  clientWs.on('error', error => {
    console.error(error)
    logToFile(`Client WebSocket error: ${error}`)
  })
}

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = 3000

const createNextApp = async () => {
  const app = next({dev, hostname, port})
  await app.prepare()
  return app.getRequestHandler()
}

const setupWebSocketServer = (server: any) => {
  const wss = new WebSocketServer({
    server,
    path: '/gemini-ws',
  })

  wss.on('connection', clientWs => {
    console.log('Client connected, waiting for auth message...')
    logToFile('Client connected, waiting for auth message...')
    const messageBuffer: Buffer[] = []

    // Start buffering messages immediately
    const bufferHandler = (data: Buffer) => {
      console.log('Buffering message:', data.toString())
      logToFile(`Buffering message: ${data.toString()}`)
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
        logToFile('Creating server websocket...')
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
            logToFile('Server connection established')
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
        logToFile(`Setup error: ${error}`)
        clientWs.close(1011, error instanceof Error ? error.message : 'Unknown error')
      }
    })
  })

  return wss
}

const startServer = async () => {
  try {
    const handle = await createNextApp()
    const server = createServer((req, res) => {
      const parsedUrl = parse(req.url!, true)
      handle(req, res, parsedUrl)
    })

    setupWebSocketServer(server)

    server.listen(port, () => {
      const message = `> Ready on http://${hostname}:${port}`
      console.log(message)
      logToFile(message)
    })

    // Handle hot reload cleanup
    if (dev) {
      const cleanup = () => {
        const message = 'Cleaning up...'
        console.log(message)
        logToFile(message)
        server.close()
        process.exit(0)
      }

      process.on('SIGTERM', cleanup)
      process.on('SIGINT', cleanup)
    }
  } catch (err) {
    console.error('Failed to start server:', err)
    logToFile(`Failed to start server: ${err}`)
    process.exit(1)
  }
}

startServer()

export const dynamic = 'force-dynamic'
