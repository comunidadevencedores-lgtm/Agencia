'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Client } from '@/lib/types'
import { useAgency } from '../agency-context'

interface ClientWithLogo extends Client {
  logo_url: string | null
}

export default function ClientsPage() {
  const router = useRouter()
  const { agencyId, agencySlug, canEdit, refresh } = useAgency()
  const [clients, setClients] = useState<ClientWithLogo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', monthly_revenue: '', logo: null as File | null })
  const [logoPreview, setLogoPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('clients').select('*').eq('agency_id', agencyId).order('created_at', { ascending: false })
    setClients((data as ClientWithLogo[]) || [])
    setLoading(false)
  }, [agencyId])

  useEffect(() => { load() }, [load])

  function toSlug(name: string) {
    return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  function formatCurrency(value: string) {
    return value.replace(/\D/g, '').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setForm(p => ({ ...p, logo: file }))
      const reader = new FileReader()
      reader.onload = (event) => {
        setLogoPreview(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  async function uploadLogo(file: File, clientId: string): Promise<string | null> {
    try {
      const ext = file.name.split('.').pop()
      const filename = `client-${clientId}-${Date.now()}.${ext}`
      
      const { error: uploadError } = await supabase.storage
        .from('client-logos')
        .upload(filename, file, { upsert: true })
      
      if (uploadError) throw uploadError
      
      const { data: { publicUrl } } = supabase.storage
        .from('client-logos')
        .getPublicUrl(filename)
      
      return publicUrl
    } catch (err: any) {
      console.error('Upload error:', err)
      return null
    }
  }

  async function createClient() {
    if (!form.name.trim()) return
    setSaving(true)
    
    const monthlyRevenue = form.monthly_revenue 
      ? parseFloat(form.monthly_revenue.replace(/\./g, '').replace(',', '.'))
      : null

    try {
      // Cria cliente primeiro
      const { data, error } = await supabase.from('clients').insert({
        agency_id: agencyId, 
        name: form.name, 
        slug: toSlug(form.name),
        phone: form.phone || null, 
        email: form.email || null,
        monthly_revenue: monthlyRevenue,
        logo_url: null,
      }).select().single()
      
      if (error) throw error
      if (!data) throw new Error('Erro ao criar cliente')

      // Se tem logo, faz upload
      let logoUrl = null
      if (form.logo) {
        logoUrl = await uploadLogo(form.logo, data.id)
        // Atualiza cliente com logo
        if (logoUrl) {
          await supabase.from('clients').update({ logo_url: logoUrl }).eq('id', data.id)
        }
      }

      setClients(prev => [{ ...data, logo_url: logoUrl }, ...prev])
      setModal(false)
      setForm({ name: '', phone: '', email: '', monthly_revenue: '', logo: null })
      setLogoPreview('')
      refresh()
      setToast('Cliente criado com sucesso!')
      fade()
    } catch (err: any) {
      alert(err?.message || 'Erro ao criar cliente')
    } finally {
      setSaving(false)
    }
  }

  async function updateClientLogo(clientId: string, file: File) {
    try {
      setSaving(true)
      const logoUrl = await uploadLogo(file, clientId)
      
      if (!logoUrl) {
        alert('Erro ao fazer upload da logo')
        return
      }

      await supabase.from('clients').update({ logo_url: logoUrl }).eq('id', clientId)
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, logo_url: logoUrl } : c))
      setToast('Logo atualizada!')
      fade()
    } catch (err: any) {
      alert(err?.message || 'Erro ao atualizar logo')
    } finally {
      setSaving(false)
    }
  }

  async function removeClient(c: ClientWithLogo) {
    if (!confirm(`Remover o cliente "${c.name}"?`)) return
    
    // Deletar logo do storage se existir
    if (c.logo_url) {
      try {
        const filename = c.logo_url.split('/').pop()
        if (filename) {
          await supabase.storage.from('client-logos').remove([filename])
        }
      } catch (err) {
        console.error('Erro ao deletar logo:', err)
      }
    }

    await supabase.from('clients').delete().eq('id', c.id)
    setClients(prev => prev.filter(x => x.id !== c.id))
    refresh()
    setToast('Cliente removido')
    fade()
  }

  function copyLink(c: ClientWithLogo) {
    if (!agencySlug) { setToast('Configure o slug em Configurações'); fade(); return }
    navigator.clipboard.writeText(`${window.location.origin}/c/${agencySlug}/${c.slug}`)
    setToast('Link copiado!')
    fade()
  }
  
  function fade() { setTimeout(() => setToast(''), 2500) }

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Clientes</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}</div>
        </div>
        {canEdit && (
          <button className="btnGrad" onClick={() => { setForm({ name: '', phone: '', email: '', monthly_revenue: '', logo: null }); setLogoPreview(''); setModal(true) }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            Novo cliente
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input 
          placeholder="Buscar clientes…" 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: 'var(--bg2)',
            border: '1px solid var(--bg3)',
            borderRadius: 8,
            color: 'var(--text)',
            fontSize: 14
          }}
        />
      </div>

      <div style={{ background: 'var(--bg1)', borderRadius: 12, padding: 0 }}>
        {loading && <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)' }}>Carregando…</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)' }}>
            {search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente ainda.'}
          </div>
        )}
        {filtered.map(c => (
          <div key={c.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 16,
            borderBottom: '1px solid var(--bg2)',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
              {c.logo_url ? (
                <img 
                  src={c.logo_url} 
                  alt={c.name}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: 'var(--brand)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: 18
                }}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {c.phone || c.email || 'Sem contato'}
                  {c.monthly_revenue && (
                    <span style={{ marginLeft: 8, color: 'var(--green)' }}>
                      R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(c.monthly_revenue)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {canEdit && (
                <label style={{
                  cursor: 'pointer',
                  padding: '6px 12px',
                  background: c.logo_url ? 'var(--brand)' : 'var(--bg2)',
                  color: c.logo_url ? 'white' : 'var(--text2)',
                  border: c.logo_url ? 'none' : '1px solid var(--bg3)',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500
                }}>
                  {c.logo_url ? '🔄 Trocar' : '📷 Logo'}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) updateClientLogo(c.id, file)
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
              <button 
                onClick={() => copyLink(c)}
                style={{
                  padding: '6px 12px',
                  background: 'var(--bg2)',
                  border: '1px solid var(--bg3)',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--text2)',
                  cursor: 'pointer'
                }}
              >
                🔗 Link
              </button>
              <button 
                onClick={() => router.push(`/agency/client/${c.id}`)}
                className="btnGrad"
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                Abrir
              </button>
              {canEdit && (
                <button 
                  onClick={() => removeClient(c)}
                  style={{
                    padding: '6px 12px',
                    background: 'var(--red)',
                    color: 'white',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: 'none'
                  }}
                >
                  ❌
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setModal(false)}>
          <div style={{
            background: 'var(--bg1)',
            borderRadius: 12,
            width: '90%',
            maxWidth: 500,
            padding: 24
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>Novo cliente</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text2)' }}>Nome</label>
              <input 
                value={form.name} 
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} 
                placeholder="Ex: Barbearia Imperium"
                style={{ width: '100%', padding: 8, background: 'var(--bg2)', border: '1px solid var(--bg3)', borderRadius: 6, color: 'var(--text)' }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text2)' }}>Logo (opcional)</label>
              <div style={{ display: 'flex', gap: 12 }}>
                {logoPreview ? (
                  <img 
                    src={logoPreview} 
                    alt="preview"
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 8,
                      objectFit: 'cover',
                      border: '2px solid var(--brand)'
                    }}
                  />
                ) : (
                  <div style={{
                    width: 80,
                    height: 80,
                    borderRadius: 8,
                    background: 'var(--bg2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text3)',
                    fontSize: 12
                  }}>
                    📷
                  </div>
                )}
                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px dashed var(--bg3)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  color: 'var(--text2)'
                }}>
                  Clique para enviar
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLogoChange}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text2)' }}>WhatsApp</label>
              <input 
                value={form.phone} 
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} 
                placeholder="(41) 99999-0000"
                style={{ width: '100%', padding: 8, background: 'var(--bg2)', border: '1px solid var(--bg3)', borderRadius: 6, color: 'var(--text)' }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text2)' }}>Email</label>
              <input 
                type="email" 
                value={form.email} 
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} 
                placeholder="cliente@email.com"
                style={{ width: '100%', padding: 8, background: 'var(--bg2)', border: '1px solid var(--bg3)', borderRadius: 6, color: 'var(--text)' }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text2)' }}>Receita mensal</label>
              <input 
                type="text"
                value={form.monthly_revenue} 
                onChange={e => setForm(p => ({ ...p, monthly_revenue: formatCurrency(e.target.value) }))}
                placeholder="5000"
                style={{ width: '100%', padding: 8, background: 'var(--bg2)', border: '1px solid var(--bg3)', borderRadius: 6, color: 'var(--text)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setModal(false)} style={{ flex: 1, padding: 10, background: 'var(--bg2)', border: '1px solid var(--bg3)', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>Cancelar</button>
              <button onClick={createClient} disabled={saving} className="btnGrad" style={{ flex: 1, padding: 10 }}>{saving ? 'Criando…' : 'Criar'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 20, right: 20, background: 'var(--green)', color: 'white', padding: 12, borderRadius: 8, fontSize: 14 }}>✓ {toast}</div>}
    </>
  )
}