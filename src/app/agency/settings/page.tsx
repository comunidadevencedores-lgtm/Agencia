'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAgency } from '../agency-context'
import s from '../pages.module.css'

interface AgencySettings {
  name: string
  email: string
  slug: string
  logo_url: string | null
}

export default function SettingsPage() {
  const { agencyId, refresh } = useAgency()
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<AgencySettings>({ name: '', email: '', slug: '', logo_url: null })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('agencies').select('*').eq('id', agencyId).single()
    if (data) {
      setForm(data)
      if (data.logo_url) setLogoPreview(data.logo_url)
    }
    setLoading(false)
  }, [agencyId])

  useEffect(() => { load() }, [load])

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setLogoPreview(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  async function uploadAgencyLogo(file: File): Promise<string | null> {
    try {
      const ext = file.name.split('.').pop()
      const filename = `agency-${agencyId}-${Date.now()}.${ext}`
      
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
      alert('Erro ao fazer upload da logo')
      return null
    }
  }

  async function save() {
    setSaving(true)
    try {
      let logoUrl = form.logo_url
      
      // Se tem arquivo novo, faz upload
      if (logoFile) {
        const url = await uploadAgencyLogo(logoFile)
        if (url) logoUrl = url
      }

      const { error } = await supabase.from('agencies').update({
        name: form.name,
        email: form.email,
        slug: form.slug,
        logo_url: logoUrl
      }).eq('id', agencyId)

      if (error) throw error

      setLogoFile(null)
      refresh()
      setToast('Configurações salvas com sucesso!')
      fade()
    } catch (err: any) {
      alert(err?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  function fade() { setTimeout(() => setToast(''), 2500) }

  if (loading) return <div>Carregando...</div>

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Configurações</div>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>Configure sua agência</div>
      </div>

      <div style={{ background: 'var(--bg1)', borderRadius: 12, padding: 24 }}>
        {/* Logo da Agência */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Logo da Agência</div>
          
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {/* Preview */}
            <div>
              {logoPreview ? (
                <img 
                  src={logoPreview} 
                  alt="preview"
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 8,
                    objectFit: 'cover',
                    border: '2px solid var(--brand)'
                  }}
                />
              ) : (
                <div style={{
                  width: 120,
                  height: 120,
                  borderRadius: 8,
                  background: 'var(--bg2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text3)',
                  fontSize: 14
                }}>
                  Sem logo
                </div>
              )}
            </div>

            {/* Upload */}
            <label style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed var(--bg3)',
              borderRadius: 8,
              padding: 20,
              cursor: 'pointer',
              color: 'var(--text2)',
              textAlign: 'center'
            }}>
              📷 Clique para enviar
              <div style={{ fontSize: 12, marginTop: 8, color: 'var(--text3)' }}>
                ou arraste aqui
              </div>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleLogoChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
            Formatos: JPG, PNG, GIF. Tamanho máx: 5MB
          </div>
        </div>

        {/* Nome */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text2)' }}>
            Nome da Agência
          </label>
          <input 
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'var(--bg2)',
              border: '1px solid var(--bg3)',
              borderRadius: 6,
              color: 'var(--text)',
              fontSize: 14
            }}
          />
        </div>

        {/* Email */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text2)' }}>
            Email
          </label>
          <input 
            type="email"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'var(--bg2)',
              border: '1px solid var(--bg3)',
              borderRadius: 6,
              color: 'var(--text)',
              fontSize: 14
            }}
          />
        </div>

        {/* Slug */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text2)' }}>
            Slug (URL pública)
          </label>
          <input 
            value={form.slug}
            onChange={e => setForm(p => ({ ...p, slug: e.target.value }))}
            placeholder="ex: minha-agencia"
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'var(--bg2)',
              border: '1px solid var(--bg3)',
              borderRadius: 6,
              color: 'var(--text)',
              fontSize: 14
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
            Seu portal: agencia-ashen.vercel.app/c/{form.slug}
          </div>
        </div>

        {/* Botão Save */}
        <button 
          onClick={save}
          disabled={saving}
          className="btnGrad"
          style={{
            width: '100%',
            padding: 10,
            fontSize: 14,
            fontWeight: 600
          }}
        >
          {saving ? 'Salvando...' : '💾 Salvar Configurações'}
        </button>
      </div>

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          background: 'var(--green)',
          color: 'white',
          padding: 12,
          borderRadius: 8,
          fontSize: 14
        }}>
          ✓ {toast}
        </div>
      )}
    </>
  )
}