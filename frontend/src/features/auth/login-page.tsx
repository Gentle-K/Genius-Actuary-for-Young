import { useMutation } from '@tanstack/react-query'
import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
  GitBranchPlus,
  ShieldCheck,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/field'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { useAppStore } from '@/lib/store/app-store'

const initialForm = {
  email: '',
  password: '',
}

export function LoginPage() {
  const navigate = useNavigate()
  const adapter = useApiAdapter()
  const setAuthSession = useAppStore((state) => state.setAuthSession)
  const [form, setForm] = useState(initialForm)
  const [inlineError, setInlineError] = useState('')
  const [demoMessage, setDemoMessage] = useState('')

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

  const previewFacts = useMemo(
    () => [
      {
        icon: <GitBranchPlus className="size-4" />,
        title: 'Dynamic clarification',
        description: 'The system asks only the questions that change the recommendation.',
      },
      {
        icon: <FileSearch className="size-4" />,
        title: 'Evidence-backed analysis',
        description: 'Search results, extracted facts, freshness, and uncertainty stay visible.',
      },
      {
        icon: <ShieldCheck className="size-4" />,
        title: 'Structured reports & charts',
        description: 'Every report separates facts, estimates, unknowns, and final guidance.',
      },
    ],
    [],
  )

  const handleEmailContinue = async () => {
    setDemoMessage('')
    if (!form.email.trim()) {
      setInlineError('Enter an email to continue.')
      return
    }
    if (!/.+@.+\..+/.test(form.email.trim())) {
      setInlineError('Enter a valid email address.')
      return
    }
    if (!form.password.trim()) {
      setInlineError('Enter a password or use Try demo.')
      return
    }
    setInlineError('')
    await mutation.mutateAsync({
      email: form.email,
      password: form.password,
      mfaCode: '',
    })
  }

  const handleDemo = async () => {
    setInlineError('')
    setDemoMessage(
      'Demo mode opens a curated workspace with sample sessions, evidence, calculations, and reports.',
    )
    await mutation.mutateAsync({
      email: 'demo@geniusactuary.ai',
      password: 'demo',
      mfaCode: '',
    })
  }

  return (
    <div className="app-grid min-h-screen bg-app-bg p-4 md:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1440px] gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="relative overflow-hidden p-6 md:p-8 lg:p-10">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(137,179,154,0.18),transparent_42%),radial-gradient(circle_at_top_right,rgba(143,183,195,0.14),transparent_34%)]" />
          <div className="relative space-y-8">
            <div className="space-y-4">
              <p className="apple-kicker">Genius Actuary</p>
              <div className="space-y-3">
                <h1 className="max-w-[12ch] text-[2.8rem] font-semibold leading-[0.92] tracking-[-0.07em] text-text-primary md:text-[4.6rem]">
                  Break complex decisions into cost, risk, evidence, and conclusion.
                </h1>
                <p className="max-w-2xl text-[15px] leading-7 text-text-secondary md:text-[17px]">
                  A personal AI decision analysis agent for choices that need more
                  structure than a pros-and-cons list.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {previewFacts.map((item) => (
                <div key={item.title} className="rounded-[22px] bg-app-bg-elevated p-4">
                  <div className="inline-flex size-9 items-center justify-center rounded-full bg-brand-soft text-gold-primary">
                    {item.icon}
                  </div>
                  <h2 className="mt-4 text-sm font-semibold text-text-primary">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-[28px] border border-border-subtle bg-app-bg-elevated p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    Example analysis preview
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    Should I join a study abroad exchange?
                  </p>
                </div>
                <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-text-primary">
                  Report preview
                </span>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-3 rounded-[22px] bg-panel p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-text-primary">
                      Medium confidence
                    </span>
                    <span className="rounded-full bg-[rgba(79,122,134,0.1)] px-3 py-1 text-xs font-semibold text-info">
                      12 evidence sources
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-text-primary">
                      Recommendation direction
                    </p>
                    <p className="text-sm leading-6 text-text-secondary">
                      The exchange improves exposure and academic upside, but only
                      if budget buffer and visa timing stay controlled.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-[18px] bg-app-bg-elevated p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                        Best case
                      </p>
                      <p className="mt-2 text-sm text-text-primary">
                        Strong learning and network lift
                      </p>
                    </div>
                    <div className="rounded-[18px] bg-app-bg-elevated p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                        Unknown
                      </p>
                      <p className="mt-2 text-sm text-text-primary">
                        Funding certainty and visa timing
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] bg-panel p-4">
                  <p className="text-sm font-semibold text-text-primary">
                    Analysis flow
                  </p>
                  <div className="mt-4 space-y-3">
                    {[
                      '1. Select analysis mode',
                      '2. Describe the decision',
                      '3. Answer dynamic follow-up questions',
                      '4. Watch evidence and calculations progress',
                      '5. Read the final structured report',
                    ].map((step) => (
                      <div
                        key={step}
                        className="flex items-center gap-3 rounded-[18px] bg-app-bg-elevated px-3 py-3 text-sm text-text-secondary"
                      >
                        <CheckCircle2 className="size-4 shrink-0 text-success" />
                        <span>{step}</span>
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
            <div className="space-y-2">
              <p className="apple-kicker">Access</p>
              <h2 className="text-[2rem] font-semibold tracking-[-0.05em] text-text-primary">
                Continue to your workspace
              </h2>
              <p className="text-sm leading-6 text-text-secondary">
                This MVP keeps a browser-linked session for demo purposes. The UI
                reflects a production login flow even when mock data is active.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-text-primary">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
                <p className="text-xs text-text-muted">
                  Use a real-looking email. Authentication is mocked in this MVP.
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-semibold text-text-primary"
                >
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, password: event.target.value }))
                  }
                />
                <p className="text-xs text-text-muted">
                  No password is stored. This only drives realistic UI states.
                </p>
              </div>

              {inlineError ? (
                <div className="rounded-[20px] border border-[rgba(181,86,77,0.22)] bg-[rgba(181,86,77,0.08)] px-4 py-3 text-sm text-danger">
                  {inlineError}
                </div>
              ) : null}

              {demoMessage ? (
                <div className="rounded-[20px] border border-[rgba(79,122,134,0.2)] bg-[rgba(79,122,134,0.08)] px-4 py-3 text-sm text-info">
                  {demoMessage}
                </div>
              ) : null}

              <div className="space-y-3">
                <Button
                  className="w-full"
                  disabled={mutation.isPending}
                  onClick={() => void handleEmailContinue()}
                >
                  {mutation.isPending ? 'Signing in...' : 'Continue with Email'}
                  <ArrowRight className="size-4" />
                </Button>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled={mutation.isPending}
                    onClick={() =>
                      void mutation.mutateAsync({
                        email: 'google@geniusactuary.ai',
                        password: 'google',
                        mfaCode: '',
                      })
                    }
                  >
                    Continue with Google
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled={mutation.isPending}
                    onClick={() => void handleDemo()}
                  >
                    Try demo
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs text-text-muted">
              <a href="/" onClick={(event) => event.preventDefault()} className="hover:text-text-primary">
                Privacy
              </a>
              <a href="/" onClick={(event) => event.preventDefault()} className="hover:text-text-primary">
                Terms
              </a>
              <a href="/" onClick={(event) => event.preventDefault()} className="hover:text-text-primary">
                Data handling
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
