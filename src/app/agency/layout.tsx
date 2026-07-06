import { ReactNode } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import AgencyLayoutClient from './agency-layout-client'

interface AgencyLayoutProps {
  children: ReactNode
}

export default async function AgencyLayout({ children }: AgencyLayoutProps) {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: any }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // cookies.set throws when called from Client Components
          }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  
  console.log('[LAYOUT] User:', user?.email)
  
  let agencyId = ''

  if (user?.email) {
    console.log('[LAYOUT] Searching for agency with email:', user.email)
    const { data: agency, error } = await supabase
      .from('agencies')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()

    console.log('[LAYOUT] Agency result:', { agency, error })

    if (agency?.id) {
      agencyId = agency.id
    }
  } else {
    console.log('[LAYOUT] No user email found!')
  }

  return (
    <AgencyLayoutClient agencyId={agencyId}>
      {children}
    </AgencyLayoutClient>
  )
}