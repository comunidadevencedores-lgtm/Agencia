export type Agency = {
  id: string
  name: string
  email: string
  slug: string
  logo_url: string | null
  created_at: string
}

export type Client = {
  id: string
  agency_id: string
  name: string
  slug: string
  phone: string | null
  email: string | null
  created_at: string
}

export type Project = {
  id: string
  client_id: string
  title: string
  status: 'active' | 'closed'
  created_at: string
  videos?: Video[]
}

export type Video = {
  id: string
  project_id: string
  title: string
  youtube_url: string | null
  drive_url: string | null
  duration: string | null
  orientation: 'vertical' | 'horizontal'
  status: 'pending' | 'approved'
  created_at: string
}

export type Revision = {
  id: string
  video_id: string
  client_id: string
  description: string
  status: 'open' | 'in_progress' | 'done'
  created_at: string
}

export type ClientPortal = {
  client: Client
  projects: (Project & { videos: Video[] })[]
  revisions: Revision[]
}
