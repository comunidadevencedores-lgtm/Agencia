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
    } else {
      // Se não for member, verifica se ele é o dono da agência (id da agência === id do usuário)
      const { data: agency } = await supabase
        .from('agencies')
        .select('id')
        .eq('id', user.id)
        .single()
      
      if (agency) {
        agencyId = agency.id
      }
    }
  }

  return (
    <AgencyLayoutClient agencyId={agencyId}>
      {children}
    </AgencyLayoutClient>
  )
}
