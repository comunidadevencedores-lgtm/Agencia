'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Revision } from '@/lib/types'
import { GradientAvatar } from '@/components/GradientAvatar'
import { useAgency } from '../agency-context'
import s from '../pages.module.css'

type Row = Revision & { video_title?: string; client_name?: string }

export default function RevisionsPage() {
  const { agencyId, canEdit, refresh } = useAgency()
  const [revisions, setRevisions] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data: clients } = await supabase.from('clients').select('id, name').eq('agency_id', agencyId)
    const ids = (clients || []).map(c => c.id)
    if (ids.length === 0) { setLoading(false); return }
    const { data: revData } = await supabase
      .from('revisions').select('*, videos(title)').in('client_id', ids).order('created_at', { ascending: false })
    setRevisions((revData || []).map((r: any) => ({
      ...r,
      video_title: r.videos?.title,
      client_name: (clients || []).find((c: any) => c.id === r.client_id)?.name,
    })))
    setLoading(false)
  }, [agencyId])

  useEffect(() => { load() }, [load])

  async function resolve(id: string) {
    await supabase.from('revisions').update({ status: 'done' }).eq('id', id)
    setRevisions(prev => prev.map(r => r.id === id ? { ...r, status: 'done' as const } : r)); refresh()
  }

  const open = revisions.filter(r => r.status !== 'done').length

  return (
    <>
      <div className={s.pageHead}>
        <div>
          <div className={s.greet}>Alterações</div>
          <div className={s.pageSub}>{open} pendentes</div>
        </div>
      </div>

      <div className={s.panel}>
        {loading && <div className={s.empty} style={{ border: 'none' }}>Carregando…</div>}
        {!loading && revisions.length === 0 && <div className={s.empty} style={{ border: 'none' }}>Nenhuma alteração ainda.</div>}
        {revisions.map(r => (
          <div key={r.id} className={s.row}>
            <GradientAvatar name={r.client_name || '?'} size={38} />
            <div className={s.rowMain}>
              <div className={s.rowName}>{r.client_name} — {r.video_title}</div>
              <div className={s.rowMeta}>{r.description}</div>
              <div className={s.rowMeta}>{new Date(r.created_at).toLocaleDateString('pt-BR')}</div>
            </div>
            {r.status === 'done'
              ? <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>✓ Resolvido</span>
              : canEdit
                ? <button className="btnGrad" onClick={() => resolve(r.id)}>Resolver</button>
                : <span style={{ fontSize: 12, color: 'var(--amber)' }}>Pendente</span>}
          </div>
        ))}
      </div>
    </>
  )
}
