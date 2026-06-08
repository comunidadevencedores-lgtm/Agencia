'use client'
import { useState } from 'react'
import styles from '../admin.module.css'

export default function AdminSettings() {
  const [toast, setToast] = useState('')
  const [config, setConfig] = useState({ platformName: 'Deliver', trialDays: 14, publicSignup: false, autoBlock: true })

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  return (
    <div>
      <div className={styles.pageHead}><div><div className={styles.pageTitle}>Configurações globais</div><div className={styles.pageSub}>Controles da plataforma</div></div></div>

      <div className={styles.configCard}>
        <div className={styles.configRow}><div><div className={styles.configName}>Nome da plataforma</div></div></div>
        <input type="text" value={config.platformName} onChange={e => setConfig(p => ({ ...p, platformName: e.target.value }))} />
      </div>

      <div className={styles.configCard}>
        <div className={styles.configRow}><div><div className={styles.configName}>Dias de trial padrão</div></div></div>
        <input type="number" value={config.trialDays} onChange={e => setConfig(p => ({ ...p, trialDays: Number(e.target.value) }))} />
      </div>

      <div className={styles.configCard}>
        <div className={styles.configRow}>
          <div><div className={styles.configName}>Cadastro público de agências</div><div className={styles.configDesc}>Se ativado, qualquer pessoa pode se cadastrar e iniciar um trial</div></div>
          <button className={`${styles.btnXs} ${config.publicSignup ? styles.btnSuccess : ''}`} onClick={() => setConfig(p => ({ ...p, publicSignup: !p.publicSignup }))}>
            {config.publicSignup ? '✓ Ativado' : 'Desativado'}
          </button>
        </div>
      </div>

      <div className={styles.configCard}>
        <div className={styles.configRow}>
          <div><div className={styles.configName}>Bloqueio automático por inadimplência</div><div className={styles.configDesc}>Bloqueia acesso após 3 dias sem pagamento</div></div>
          <button className={`${styles.btnXs} ${config.autoBlock ? styles.btnSuccess : ''}`} onClick={() => setConfig(p => ({ ...p, autoBlock: !p.autoBlock }))}>
            {config.autoBlock ? '✓ Ativado' : 'Desativado'}
          </button>
        </div>
      </div>

      <button className={styles.btnPrimary} onClick={() => showToast('Configurações salvas!')}>Salvar alterações</button>
      {toast && <div className={`${styles.toast} ${styles.toastShow}`}>✓ {toast}</div>}
    </div>
  )
}
