'use client'
import styles from '../admin.module.css'

const plans = [
  { name: 'Trial', price: 0, duration: '14 dias', clients: '2', videos: '5', whitelabel: false, color: styles.tTrial },
  { name: 'Básico', price: 97, duration: 'mensal', clients: '5', videos: '20', whitelabel: false, color: styles.tBasic },
  { name: 'Pro', price: 197, duration: 'mensal', clients: 'Ilimitado', videos: 'Ilimitado', whitelabel: true, color: styles.tPro },
]

export default function AdminPlans() {
  return (
    <div>
      <div className={styles.pageHead}>
        <div><div className={styles.pageTitle}>Planos</div><div className={styles.pageSub}>Configure os planos disponíveis</div></div>
      </div>
      {plans.map(p => (
        <div key={p.name} className={styles.planCard}>
          <div className={styles.planHeader}>
            <div>
              <div className={styles.planName}>{p.name} <span className={`${styles.tag} ${p.color}`}>{p.name}</span></div>
              <div className={styles.planPrice}>{p.price === 0 ? 'Grátis' : `R$${p.price}/${p.duration}`}</div>
            </div>
          </div>
          <div className={styles.planFeats}>
            <div className={styles.planFeat}>✓ Até {p.clients} clientes ativos</div>
            <div className={styles.planFeat}>✓ Até {p.videos} vídeos{p.videos !== 'Ilimitado' ? '/mês' : ''}</div>
            <div className={styles.planFeat}>✓ Link personalizado para cliente</div>
            {p.whitelabel
              ? <div className={styles.planFeat}>✓ White-label (domínio próprio)</div>
              : <div className={styles.planFeat} style={{ color: 'var(--text3)' }}>✗ White-label não incluído</div>
            }
          </div>
        </div>
      ))}
      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 12 }}>
        Para editar os planos, ajuste diretamente no código ou entre em contato com o desenvolvedor.
      </div>
    </div>
  )
}
