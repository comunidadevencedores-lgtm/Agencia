'use client'
import { createContext, useContext } from 'react'

export type Role = 'owner' | 'editor' | 'viewer'

export type AgencyData = {
  agencyId: string
  agencySlug: string
  agencyName: string
  logoUrl: string | null
  role: Role
  userName: string
  userEmail: string
  canEdit: boolean
  isOwner: boolean
  counts: { clients: number; demandsPending: number; revisionsOpen: number }
  refresh: () => void
}

export const AgencyContext = createContext<AgencyData | null>(null)

export function useAgency(): AgencyData {
  const ctx = useContext(AgencyContext)
  if (!ctx) throw new Error('useAgency precisa estar dentro do layout da agência')
  return ctx
}

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Dono',
  editor: 'Editor',
  viewer: 'Visualização',
}
