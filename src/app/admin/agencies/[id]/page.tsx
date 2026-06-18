'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from '../../admin.module.css'

export default function AgencyDetail({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [agency, setAgency] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [videos, setVideos] = useState(0)
  const [revisions, setRevisions] = useState(0)
  const [modal, setModal] = useState(false)
  const [plan, setPlan] = useState('')
  const [toast, setToast] = useState('')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  async function load() {
    const { data: ag } = await supabase.from('agencies').select('*').eq('id', params.id).single()
    setAgency(ag)
    setPlan(ag?.plan || 'basic')
    const { data: cl } = await supabase.from('clients').select('id, name, slug, created_at').eq('agency_id', params.id)
    setClients(cl || [])
    const ids = (cl || []).map(c => c.id)
    if (ids.length > 0) {
      const { data: proj } = await supabase.from('projects').select('id').in('client_id', ids)
      const projIds = (proj || []).map(p => p.id)
      if (projIds.length > 0) {
        const { count: vc } = await supabase.from('videos').select('*', { count: 'exact', head: true }).in('project_id', projIds)
        setVideos(vc || 0)
      }
      const { count: rc } = await supabase.from('revisions').select('*', { count: 'exact', head: true }).in('client_id', ids).eq('status', 'open')
      setRevisions(rc || 0)
    }
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function savePlan() {
    await supabase.from('agencies').update({ plan }).eq('id', params.id)
    setAgency((p: any) => ({ ...p, plan }))
    setModal(false)
    showToast('Plano atualizado!')
  }

  async function toggleBlock() {
    const newStatus = agency?.status === 'blocked' ? 'active' : 'blocked'
    await supabase.from('agencies').update({ status: newStatus }).eq('id', params.id)
    setAgency((p: any) => ({ ...p, status: newStatus }))
    showToast(newStatus === 'blocked' ? 'Agência bloqueada' : 'Agência ativada')
  }

  if (!agency) return <div className={styles.loading}>Carregando...</div>

  const initials = agency.name?.split(' ').slice(0, 2).filter((w: string) => w).map((w: string) => w[0].toUpperCase()).join('') || '?'

  return (
    <div>
      <button className={styles.backBtn} onClick={() => router.push('/admin/agencies')}>← Voltar</button>
      <div className={styles.detailHead}>
        <div className={styles.avatar}>{initials}</div>
        <div>
          <div className={styles.dName}>{agency.name}</div>
          <div className={styles.dSub}>{agency.slug} · {agency.email}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 7 }}>
          <button className={styles.btnXs} onClick={() => setModal(true)}>Mudar plano</button>
          <button className={`${styles.btnXs} ${agency.status === 'blocked' ? styles.btnSuccess : styles.btnDanger}`} onClick={toggleBlock}>
            {agency.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
          </button>
        </div>
      </div>

      <div className={styles.dCards}>
        <div className={styles.dCard}><div className={styles.dCardLabel}>Clientes</div><div className={styles.dCardVal}>{clients.length}</div></div>
        <div className={styles.dCard}><div className={styles.dCardLabel}>Vídeos entregues</div><div className={styles.dCardVal}>{videos}</div></div>
        <div className={styles.dCard}><div className={styles.dCardLabel}>Alterações abertas</div><div className={styles.dCardVal}>{revisions}</div></div>
        <div className={styles.dCard}><div className={styles.dCardLabel}>Plano</div><div className={styles.dCardVal} style={{ fontSize: 13 }}><span className={`${styles.tag} ${agency.plan === 'pro' ? styles.tPro : agency.plan === 'trial' ? styles.tTrial : styles.tBasic}`}>{agency.plan || 'básico'}</span></div></div>
        <div className={styles.dCard}><div className={styles.dCardLabel}>Status</div><div className={styles.dCardVal} style={{ fontSize: 13 }}><span className={`${styles.tag} ${agency.status === 'blocked' ? styles.tBlocked : styles.tActive}`}>{agency.status === 'blocked' ? 'Bloqueado' : 'Ativo'}</span></div></div>
        <div className={styles.dCard}><div className={styles.dCardLabel}>Cadastro</div><div className={styles.dCardVal} style={{ fontSize: 13, color: 'var(--text2)' }}>{new Date(agency.created_at).toLocaleDateString('pt-BR')}</div></div>
      </div>

      <div className={styles.secLabel}>Clientes da agência</div>
      <div className={styles.tbl}>
        {clients.length === 0 && <div className={styles.empty}>Nenhum cliente ainda.</div>}
        {clients.map(c => (
          <div key={c.id} className={`${styles.tblRow}`} style={{ gridTemplateColumns: '1fr 120px 100px' }}>
            <div><div className={styles.name}>{c.name}</div><div className={styles.sub}>{c.slug}</div></div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(c.created_at).toLocaleDateString('pt-BR')}</div>
            <div><a href={`/c/${agency.slug}/${c.slug}`} target="_blank" rel="noopener" style={{ fontSize: 11, color: 'var(--blue)', textDecoration: 'none' }}>Ver portal →</a></div>
          </div>
        ))}
      </div>

      {modal && (
        <div className={styles.modalOverlay} onClick={() => setModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <span className={styles.modalTitle}>Mudar plano — {agency.name}</span>
              <button className={styles.mClose} onClick={() => setModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.fGroup}>
                <label className={styles.fLabel}>Plano</label>
                <select value={plan} onChange={e => setPlan(e.target.value)}>
                  <option value="trial">Trial (14 dias)</option>
                  <option value="basic">Básico — R$97/mês</option>
                  <option value="pro">Pro — R$197/mês</option>
                </select>
              </div>
            </div>
            <div className={styles.modalFoot}>
              <button className={styles.btnCancel} onClick={() => setModal(false)}>Cancelar</button>
              <button className={styles.btnSave} onClick={savePlan}>Salvar</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className={`${styles.toast} ${styles.toastShow}`}>✓ {toast}</div>}
    </div>
  )
}
