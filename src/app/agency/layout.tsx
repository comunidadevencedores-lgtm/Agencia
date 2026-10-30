import { ReactNode } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import AgencyLayoutClient from './agency-layout-client'
import type { Role } from './agency-context'

interface AgencyLayoutProps {
  children: ReactNode
}

export default async function AgencyLayout({ children }: AgencyLayoutProps) {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options?: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // cookies.set lança quando chamado de um Server Component em render — ignorar
          }
        },
        remove(name: string, options?: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // idem
          }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  let agencyId = ''
  let role: Role | null = null

  if (user) {
    // 1) Dono — o id da agência é o id do usuário no auth
    const { data: owned } = await supabase
      .from('agencies')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (owned) {
      agencyId = owned.id
      role = 'owner'
    } else {
      // 2) Membro de equipe (editor / visualização)
      const { data: member } = await supabase
        .from('agency_members')
        .select('agency_id, role')
        .eq('user_id', user.id)
        .maybeSingle()

      if (member?.agency_id) {
        agencyId = member.agency_id
        role = (member.role as Role) || 'editor'
      } else if (user.email) {
        // 3) Compatibilidade com agências antigas vinculadas por e-mail
        const { data: byEmail } = await supabase
          .from('agencies')
          .select('id')
          .eq('email', user.email)
          .maybeSingle()

        if (byEmail) {
          agencyId = byEmail.id
          role = 'owner'
        }
      }
    }
  }

  return (
    <AgencyLayoutClient agencyId={agencyId} role={role}>
      {children}
    </AgencyLayoutClient>
  )
}
