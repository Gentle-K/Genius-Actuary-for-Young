import { useMutation, useQuery } from '@tanstack/react-query'
import {
  CheckCircle2,
  FileSearch,
  Mail,
  ShieldCheck,
  Sigma,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { useAppStore } from '@/lib/store/app-store'
import { shortAddress } from '@/lib/web3/hashkey'
import { useHashKeyWallet } from '@/lib/web3/use-hashkey-wallet'

const initialForm = {
  email: '',
  safeAddress: '',
}

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const adapter = useApiAdapter()
  const locale = useAppStore((state) => state.locale)
  const setAuthSession = useAppStore((state) => state.setAuthSession)
  const [form, setForm] = useState(initialForm)
  const [inlineError, setInlineError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const bootstrapQuery = useQuery({
    queryKey: ['auth', 'wallet-bootstrap'],
    queryFn: () => adapter.rwa.getBootstrap(),
  })
  const wallet = useHashKeyWallet(bootstrapQuery.data?.chainConfig)

  const mutation = useMutation({
    mutationFn: adapter.auth.login,
    onSuccess: (payload) => {
      setAuthSession({
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        currentUser: payload.user,
      })
      void navigate('/new-analysis')
    },
    onError: (error) => {
      setInlineError((error as Error).message)
    },
  })

  const trustPoints = useMemo(
    () => [
      {
        icon: <FileSearch className="size-4" />,
        title: t('auth.login.trustPoints.evidenceTitle'),
        description: t('auth.login.trustPoints.evidenceDescription'),
      },
      {
        icon: <Sigma className="size-4" />,
        title: t('auth.login.trustPoints.calculationTitle'),
        description: t('auth.login.trustPoints.calculationDescription'),
      },
      {
        icon: <ShieldCheck className="size-4" />,
        title: t('auth.login.trustPoints.boundedTitle'),
        description: t('auth.login.trustPoints.boundedDescription'),
      },
    ],
    [t],
  )

  const handleEmailContinue = async () => {
    setInfoMessage('')
    if (!form.email.trim()) {
      setInlineError(t('auth.login.emailRequired'))
      return
    }
    if (!/.+@.+\..+/.test(form.email.trim())) {
      setInlineError(t('auth.login.emailInvalid'))
      return
    }

    setInlineError('')
    setInfoMessage(t('auth.login.emailInfo'))
    await mutation.mutateAsync({
      email: form.email.trim(),
      password: 'email-access',
      mfaCode: '',
    })
  }

  const handleWalletContinue = async () => {
    setInlineError('')
    setInfoMessage('')
    try {
      const nextState = await wallet.connectWallet()
      setAuthSession({
        accessToken: `wallet:${nextState.address}`,
        refreshToken: `wallet:${nextState.address}`,
        currentUser: {
          id: `wallet:${nextState.address}`,
          name: `Wallet ${shortAddress(nextState.address)}`,
          email: `${nextState.address.toLowerCase()}@wallet.local`,
          title: t('auth.login.walletTitle'),
          locale,
          roles: ['analyst'],
          lastActiveAt: new Date().toISOString(),
        },
      })
      void navigate('/new-analysis')
    } catch (error) {
      setInlineError((error as Error).message)
    }
  }

  const handleSafeContinue = () => {
    const safeAddress = form.safeAddress.trim()
    setInlineError('')
    setInfoMessage('')
    if (!/^0x[a-fA-F0-9]{40}$/.test(safeAddress)) {
      setInlineError(t('auth.login.safeInvalid'))
      return
    }

    setAuthSession({
      accessToken: `safe:${safeAddress}`,
      refreshToken: `safe:${safeAddress}`,
      currentUser: {
        id: `safe:${safeAddress}`,
        name: `Safe ${shortAddress(safeAddress)}`,
        email: `${safeAddress.toLowerCase()}@safe.local`,
        title: t('auth.login.safeTitle'),
        locale,
        roles: ['analyst'],
        lastActiveAt: new Date().toISOString(),
      },
    })
    void navigate('/new-analysis')
  }

  const handleDemo = async () => {
    setInlineError('')
    setInfoMessage(t('auth.login.demoInfo'))
    await mutation.mutateAsync({
      email: 'demo@geniusactuary.ai',
      password: 'demo-access',
      mfaCode: '',
    })
  }

  return (
    <div className="app-grid min-h-screen bg-bg-canvas p-4 md:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1440px] gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="relative overflow-hidden p-6 md:p-8 lg:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_24%),radial-gradient(circle_at_center_right,rgba(79,124,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(124,92,255,0.12),transparent_26%)]" />

          <div className="relative flex h-full flex-col justify-between gap-10">
            <div className="space-y-6">
              <div className="space-y-4">
                <p className="apple-kicker">{t('auth.login.heroEyebrow')}</p>
                <div className="space-y-3">
                  <h1 className="text-balance max-w-[11ch] text-[clamp(2.8rem,8vw,4.9rem)] font-semibold leading-[0.92] tracking-[-0.07em] text-text-primary">
                    {t('auth.login.heroTitle')}
                  </h1>
                  <p className="max-w-2xl text-[15px] leading-7 text-text-secondary md:text-[17px]">
                    {t('auth.login.heroDescription')}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {trustPoints.map((item) => (
                  <div key={item.title} className="rounded-[22px] border border-border-subtle bg-panel-strong p-4">
                    <div className="inline-flex size-9 items-center justify-center rounded-full bg-primary-soft text-primary">
                      {item.icon}
                    </div>
                    <h2 className="mt-4 text-sm font-semibold text-text-primary">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-border-subtle bg-panel p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{t('auth.login.previewTitle')}</p>
                  <p className="mt-1 text-sm text-text-secondary">{t('auth.login.previewSubtitle')}</p>
                </div>
                <Badge tone="primary">{t('auth.login.previewBadge')}</Badge>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-3 rounded-[22px] border border-border-subtle bg-app-bg-elevated p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="info">{t('auth.login.previewFact')}</Badge>
                    <Badge tone="gold">{t('auth.login.previewEstimated')}</Badge>
                    <Badge tone="success">{t('auth.login.previewConfidence')}</Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-text-primary">{t('auth.login.previewRecommendationTitle')}</p>
                    <p className="text-sm leading-6 text-text-secondary">{t('auth.login.previewRecommendationBody')}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-[18px] border border-border-subtle bg-bg-surface p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-text-muted">{t('auth.login.previewEvidenceTitle')}</p>
                      <p className="mt-2 text-sm text-text-primary">{t('auth.login.previewEvidenceBody')}</p>
                    </div>
                    <div className="rounded-[18px] border border-border-subtle bg-bg-surface p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-text-muted">{t('auth.login.previewCalculationTitle')}</p>
                      <p className="mt-2 text-sm text-text-primary">{t('auth.login.previewCalculationBody')}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-border-subtle bg-bg-surface p-4">
                  <p className="text-sm font-semibold text-text-primary">{t('auth.login.trustCueTitle')}</p>
                  <div className="mt-4 space-y-3">
                    {['trustCue1', 'trustCue2', 'trustCue3', 'trustCue4'].map((key) => (
                      <div
                        key={key}
                        className="flex items-center gap-3 rounded-[18px] border border-border-subtle bg-app-bg-elevated px-3 py-3 text-sm text-text-secondary"
                      >
                        <CheckCircle2 className="size-4 shrink-0 text-info" />
                        <span>{t(`auth.login.${key}`)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex items-center">
          <Card className="w-full max-w-[520px] p-6 md:p-8">
            <div className="space-y-3">
              <p className="apple-kicker">{t('auth.login.heroEyebrow')}</p>
              <h2 className="text-[2rem] font-semibold tracking-[-0.05em] text-text-primary">
                {t('auth.login.title')}
              </h2>
              <p className="text-sm leading-6 text-text-secondary">{t('auth.login.description')}</p>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-[22px] border border-border-subtle bg-app-bg-elevated p-4">
                <div className="flex items-start gap-3">
                  <Mail className="mt-1 size-4 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text-primary">{t('auth.login.emailTitle')}</p>
                    <div className="mt-3 space-y-3">
                      <Input
                        aria-label={t('auth.login.emailTitle')}
                        value={form.email}
                        placeholder={t('auth.login.emailPlaceholder')}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, email: event.target.value }))
                        }
                      />
                      <Button className="w-full" onClick={() => void handleEmailContinue()}>
                        {t('auth.login.continueEmail')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-border-subtle bg-app-bg-elevated p-4">
                <div className="flex items-start gap-3">
                  <Wallet className="mt-1 size-4 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text-primary">{t('auth.login.walletTitle')}</p>
                    <p className="mt-1 text-sm leading-6 text-text-secondary">{t('auth.login.walletDescription')}</p>
                    <Button className="mt-3 w-full" variant="secondary" onClick={() => void handleWalletContinue()}>
                      {t('auth.login.continueWallet')}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-border-subtle bg-app-bg-elevated p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 size-4 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text-primary">{t('auth.login.safeTitle')}</p>
                    <div className="mt-3 space-y-3">
                      <Input
                        aria-label={t('auth.login.safeTitle')}
                        value={form.safeAddress}
                        placeholder="0x..."
                        onChange={(event) =>
                          setForm((current) => ({ ...current, safeAddress: event.target.value }))
                        }
                      />
                      <Button className="w-full" variant="secondary" onClick={handleSafeContinue}>
                        {t('auth.login.continueSafe')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-border-subtle bg-app-bg-elevated p-4">
                <p className="text-sm font-semibold text-text-primary">{t('auth.login.demoTitle')}</p>
                <p className="mt-1 text-sm leading-6 text-text-secondary">{t('auth.login.demoDescription')}</p>
                <Button className="mt-3 w-full" variant="secondary" onClick={() => void handleDemo()}>
                  {t('auth.login.continueDemo')}
                </Button>
              </div>
            </div>

            {inlineError ? (
              <p className="mt-4 text-sm text-danger">{inlineError}</p>
            ) : infoMessage ? (
              <p className="mt-4 text-sm text-text-secondary">{infoMessage}</p>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  )
}
