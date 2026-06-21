import { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import AgencyLayoutClient from './agency-layout-client'

interface AgencyLayoutProps {
  children: ReactNode
}

export default async function AgencyLayout({ children }: AgencyLayoutProps) {
  // Busca a agência do usuário logado no servidor
  const { data: { user } } = await supabase.auth.getUser()
  
  let agencyId = ''

  if (user) {
    // Tenta buscar agência_id do member
    const { data: member } = await supabase
      .from('agency_members')
      .select('agency_id')
      .eq('user_id', user.id)
      .single()

    if (member?.agency_id) {
      agencyId = member.agency_id
    } else if (user.id) {
      // Se não for member, talvez seja dono (user.id === agencies.id)
      agencyId = user.id
    }
  }

  return (
    <AgencyLayoutClient agencyId={agencyId}>
      {children}
    </AgencyLayoutClient>
  )
}