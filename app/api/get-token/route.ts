import {NextResponse} from 'next/server'
import {GoogleAuth} from 'google-auth-library'

export const GET = async () => {
  try {
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY,
        project_id: process.env.NEXT_PUBLIC_PROJECT_ID,
      },
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    })
    const client = await auth.getClient()
    const token = await client.getAccessToken()
    return NextResponse.json({token: token.token})
  } catch (error) {
    console.error('Failed to get access token:', error)
    return NextResponse.json({error: 'Failed to get access token'}, {status: 500})
  }
}
