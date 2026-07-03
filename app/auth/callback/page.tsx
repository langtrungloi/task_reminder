'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handle = async () => {
      try {
        const supabase = createClient()
        // First check for OAuth `code` in query params
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')

        if (code) {
          // Exchange code for session (works on client)
          // @ts-ignore-next-line
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) console.error('Error exchanging code for session:', error)
        } else {
          // Otherwise attempt to parse session from URL fragment (magic link)
          // @ts-ignore-next-line
          const { data, error } = await supabase.auth.getSessionFromUrl()
          if (error) console.error('Error retrieving session from URL:', error)
        }

        // After processing the URL fragment, navigate to dashboard
        router.replace('/dashboard')
      } catch (e) {
        console.error(e)
        router.replace('/')
      }
    }

    handle()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <p className="text-lg">Processing sign-in... Redirecting...</p>
      </div>
    </div>
  )
}
