import type {
  AnalysisMode,
  AnalysisReport,
  AnalysisSession,
  AuditLogEntry,
  BudgetLineItem,
  BudgetSummary,
  CalculationTask,
  ChartArtifact,
  ClarificationQuestion,
  DashboardOverview,
  DataVizBundle,
  EvidenceItem,
  FileItem,
  MetricHighlight,
  ModeDefinition,
  NotificationItem,
  OptionProfile,
  Permission,
  Role,
  SearchTask,
  SettingsPayload,
  User,
} from '@/types'

const mockIntakeContext = {
  budgetRange: '$8k - $15k',
  timeHorizonLabel: '6-12 months',
  riskPreferenceLabel: 'Balanced',
  mustHaveGoals: ['Protect cash runway', 'Keep optionality'],
  mustAvoidOutcomes: ['Irreversible commitment without evidence', 'Budget shock'],
  draftPrompt: '',
  investmentAmount: 10000,
  baseCurrency: 'USDT',
  preferredAssetIds: ['hsk-usdc', 'cpic-estable-mmf', 'hk-regulated-silver'],
  holdingPeriodDays: 30,
  riskTolerance: 'balanced' as const,
  liquidityNeed: 't_plus_3' as const,
  minimumKycLevel: 0,
  walletAddress: '',
  wantsOnchainAttestation: true,
  additionalConstraints: '',
}

const iso = (value: string) => new Date(value).toISOString()

export const permissions: Permission[] = [
  {
    id: 'analysis.run',
    label: 'Run analysis',
    description: 'Create and advance decision analysis sessions.',
    resource: 'analysis',
  },
  {
    id: 'analysis.export',
    label: 'Export report',
    description: 'Export analysis bundles to CSV/PDF.',
    resource: 'analysis',
  },
  {
    id: 'notifications.manage',
    label: 'Manage notifications',
    description: 'Read and update notification status.',
    resource: 'notifications',
  },
  {
    id: 'files.manage',
    label: 'Manage files',
    description: 'Upload and preview analysis attachments.',
    resource: 'files',
  },
  {
    id: 'logs.read',
    label: 'Read audit logs',
    description: 'Inspect system and user audit events.',
    resource: 'logs',
  },
  {
    id: 'users.manage',
    label: 'Manage users',
    description: 'Maintain users and account roles.',
    resource: 'users',
  },
  {
    id: 'roles.manage',
    label: 'Manage roles',
    description: 'Inspect or modify role permissions.',
    resource: 'roles',
  },
  {
    id: 'settings.manage',
    label: 'Manage settings',
    description: 'Update workspace preferences and API wiring.',
    resource: 'settings',
  },
]

export const roles: Role[] = [
  {
    id: 'admin',
    name: 'Admin',
    description: 'Workspace-wide visibility and role assignment.',
    permissions: permissions.map((permission) => permission.id),
    memberCount: 2,
  },
  {
    id: 'analyst',
    name: 'Analyst',
    description: 'Can run analysis, inspect files, and export reports.',
    permissions: [
      'analysis.run',
      'analysis.export',
      'notifications.manage',
      'files.manage',
      'logs.read',
      'settings.manage',
    ],
    memberCount: 8,
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    description: 'Read-only access for audit and resource inspection.',
    permissions: ['logs.read', 'notifications.manage'],
    memberCount: 3,
  },
]

export const users: User[] = [
  {
    id: 'u-analyst',
    name: 'Ada Shen',
    email: 'analyst@geniusactuary.ai',
    title: 'Lead Decision Analyst',
    locale: 'en',
    roles: ['admin', 'analyst'],
    lastActiveAt: iso('2026-03-28T15:15:00+08:00'),
  },
  {
    id: 'u-reviewer',
    name: 'Milo Turner',
    email: 'reviewer@geniusactuary.ai',
    title: 'Risk Reviewer',
    locale: 'en',
    roles: ['reviewer'],
    lastActiveAt: iso('2026-03-28T12:30:00+08:00'),
  },
]

export const defaultSettings: SettingsPayload = {
  themeMode: 'dark',
  language: 'en',
  apiMode: 'mock',
  displayDensity: 'cozy',
  notificationsEmail: true,
  notificationsPush: false,
  autoExportPdf: false,
  chartMotion: true,
}

export const analysisModes: ModeDefinition[] = [
  {
    id: 'single-option',
    title: 'Single option cost / risk',
    subtitle: 'Evaluate one plan deeply before committing.',
    description:
      'Best for a single action, plan, or investment where cost, uncertainty, and prerequisites matter.',
    valueLens: ['Cost panorama', 'Risk exposure', 'Prerequisites', 'Mitigation plan'],
    icon: 'sparkles',
  },
  {
    id: 'multi-option',
    title: 'Multi-option decision reference',
    subtitle: 'Compare several paths under different preferences.',
    description:
      'Best for A/B or multi-path decisions where trade-offs, weighting, and scenario fit matter.',
    valueLens: ['Option matrix', 'Weighting & fit', 'Trade-off clarity', 'Preference-aware guidance'],
    icon: 'git-compare',
  },
]

export const notificationsSeed: NotificationItem[] = [
  {
    id: 'n-1',
    title: 'Report ready',
    message: 'Exchange feasibility report has finished rendering with 3 charts.',
    level: 'success',
    channel: 'in-app',
    read: false,
    createdAt: iso('2026-03-28T14:42:00+08:00'),
  },
  {
    id: 'n-2',
    title: 'Risk warning surfaced',
    message: 'Visa timing uncertainty increased in the latest exchange scenario.',
    level: 'warning',
    channel: 'in-app',
    read: false,
    createdAt: iso('2026-03-28T12:15:00+08:00'),
  },
  {
    id: 'n-3',
    title: 'Daily digest mailed',
    message: 'Your dashboard digest was delivered to analyst@geniusactuary.ai.',
    level: 'info',
    channel: 'email',
    read: true,
    createdAt: iso('2026-03-28T09:00:00+08:00'),
  },
]

export const logsSeed: AuditLogEntry[] = [
  {
    id: 'log-1',
    action: 'LOGIN',
    actor: 'Ada Shen',
    target: 'Workspace',
    ipAddress: '10.0.1.15',
    createdAt: iso('2026-03-28T15:11:00+08:00'),
    status: 'success',
    summary: 'MFA verified and access token issued.',
    metadata: {
      method: 'POST /api/auth/login',
      session: 'sess_auth_1',
    },
  },
  {
    id: 'log-2',
    action: 'REPORT_READY',
    actor: 'System',
    target: 'sess-exchange',
    ipAddress: 'internal',
    createdAt: iso('2026-03-28T14:42:00+08:00'),
    status: 'success',
    summary: 'Rendered markdown report and synchronized chart bundle.',
    metadata: {
      stages: 'clarify,search,calculate,report',
      transport: 'mock-realtime',
    },
  },
  {
    id: 'log-3',
    action: 'FILE_UPLOAD',
    actor: 'Ada Shen',
    target: 'BudgetNotes.pdf',
    ipAddress: '10.0.1.15',
    createdAt: iso('2026-03-28T11:02:00+08:00'),
    status: 'warning',
    summary: 'Upload accepted, virus scan pending.',
    metadata: {
      endpoint: 'POST /api/files',
      mime: 'application/pdf',
    },
  },
  {
    id: 'log-4',
    action: 'ROLE_UPDATE',
    actor: 'Ada Shen',
    target: 'Milo Turner',
    ipAddress: '10.0.1.15',
    createdAt: iso('2026-03-27T18:12:00+08:00'),
    status: 'success',
    summary: 'Reviewer role permissions refreshed after policy review.',
    metadata: {
      endpoint: 'PATCH /api/users/u-reviewer/roles',
      count: '2',
    },
  },
]

export const filesSeed: FileItem[] = [
  {
    id: 'f-1',
    name: 'exchange_budget_v2.pdf',
    size: 524288,
    mime: 'application/pdf',
    tags: ['budget', 'exchange'],
    createdAt: iso('2026-03-28T11:01:00+08:00'),
    status: 'available',
    intent: 'report',
  },
  {
    id: 'f-2',
    name: 'visa_policy_notes.xlsx',
    size: 183500,
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    tags: ['policy', 'evidence'],
    createdAt: iso('2026-03-27T16:40:00+08:00'),
    status: 'available',
    intent: 'evidence',
  },
  {
    id: 'f-3',
    name: 'commute_sensitivity.csv',
    size: 7240,
    mime: 'text/csv',
    tags: ['commute', 'model'],
    createdAt: iso('2026-03-26T20:16:00+08:00'),
    status: 'processing',
    intent: 'attachment',
  },
]

function buildExchangeCharts(sessionId: string): ChartArtifact[] {
  return [
    {
      id: `chart-${sessionId}-cashflow`,
      sessionId,
      kind: 'line',
      title: 'Exchange budget burn-down',
      subtitle: 'Projected monthly cash requirement',
      unit: 'USD',
      source: 'User inputs + public cost-of-living references',
      note: 'Solid points are confirmed estimates, dim points are inferred buffers.',
      lineSeries: [
        { label: '2026-03', value: 1200, nature: 'actual' },
        { label: '2026-04', value: 1620, nature: 'estimated' },
        { label: '2026-05', value: 1880, nature: 'estimated' },
        { label: '2026-06', value: 2140, nature: 'inferred' },
        { label: '2026-07', value: 2075, nature: 'estimated' },
      ],
    },
    {
      id: `chart-${sessionId}-risk-radar`,
      sessionId,
      kind: 'radar',
      title: 'Exchange risk posture',
      unit: 'score / 10',
      note: 'Lower is safer. Policy and funding remain the main volatility nodes.',
      radarSeries: [
        {
          name: 'Exchange',
          values: [
            { dimension: 'Budget strain', value: 7.4 },
            { dimension: 'Visa timing', value: 6.8 },
            { dimension: 'Career upside', value: 8.7 },
            { dimension: 'Reversibility', value: 5.1 },
            { dimension: 'Execution load', value: 6.2 },
          ],
        },
      ],
    },
    {
      id: `chart-${sessionId}-source-heatmap`,
      sessionId,
      kind: 'heatmap',
      title: 'Confidence by source and dimension',
      note: 'Used to distinguish confirmed facts from inferred ranges.',
      heatmapSeries: [
        { x: 'Living cost', y: 'Official university', value: 9, nature: 'actual' },
        { x: 'Living cost', y: 'Community forum', value: 5, nature: 'inferred' },
        { x: 'Visa timing', y: 'Official embassy', value: 8, nature: 'actual' },
        { x: 'Visa timing', y: 'Social posts', value: 4, nature: 'inferred' },
        { x: 'Scholarship', y: 'Program office', value: 7, nature: 'estimated' },
      ],
    },
  ]
}

function buildCarCharts(sessionId: string): ChartArtifact[] {
  return [
    {
      id: `chart-${sessionId}-line`,
      sessionId,
      kind: 'line',
      title: 'Car ownership vs public transit cost',
      subtitle: '24-month cumulative outlay',
      unit: 'USD',
      note: 'Line glow indicates decision sensitivity near the crossover zone.',
      lineSeries: [
        { label: 'Month 1', value: 850, nature: 'actual' },
        { label: 'Month 6', value: 4200, nature: 'estimated' },
        { label: 'Month 12', value: 7700, nature: 'estimated' },
        { label: 'Month 18', value: 10950, nature: 'estimated' },
        { label: 'Month 24', value: 14100, nature: 'inferred' },
      ],
    },
    {
      id: `chart-${sessionId}-bar`,
      sessionId,
      kind: 'bar',
      title: 'Key cost buckets',
      unit: 'USD / year',
      compareSeries: [
        { label: 'Loan + depreciation', value: 6200, group: 'Car', nature: 'estimated' },
        { label: 'Fuel + parking', value: 3400, group: 'Car', nature: 'estimated' },
        { label: 'Transit + ridehail', value: 4100, group: 'Transit', nature: 'actual' },
      ],
    },
    {
      id: `chart-${sessionId}-scatter`,
      sessionId,
      kind: 'scatter',
      title: 'Convenience vs annual cost scenarios',
      unit: 'score / cost',
      note: 'Point aura strength represents probability weight.',
      scatterSeries: [
        { label: 'Car optimistic', value: 74, group: '6400', intensity: 0.8, nature: 'estimated' },
        { label: 'Car base', value: 61, group: '9400', intensity: 1, nature: 'estimated' },
        { label: 'Transit base', value: 49, group: '4100', intensity: 0.7, nature: 'actual' },
        { label: 'Transit with frequent taxis', value: 56, group: '5800', intensity: 0.5, nature: 'estimated' },
      ],
    },
  ]
}

function buildGraduateCharts(sessionId: string): ChartArtifact[] {
  return [
    {
      id: `chart-${sessionId}-bar`,
      sessionId,
      kind: 'bar',
      title: 'Two-year value comparison',
      unit: 'score / 100',
      compareSeries: [
        { label: 'Graduate school', value: 78, group: 'Upside', nature: 'estimated' },
        { label: 'Work first', value: 69, group: 'Upside', nature: 'estimated' },
        { label: 'Graduate school', value: 64, group: 'Risk', nature: 'estimated' },
        { label: 'Work first', value: 46, group: 'Risk', nature: 'actual' },
      ],
    },
    {
      id: `chart-${sessionId}-radar`,
      sessionId,
      kind: 'radar',
      title: 'Option fit by dimension',
      unit: 'score / 10',
      radarSeries: [
        {
          name: 'Graduate school',
          values: [
            { dimension: 'Skill acceleration', value: 8.8 },
            { dimension: 'Cash pressure', value: 6.9 },
            { dimension: 'Optionality', value: 7.8 },
            { dimension: 'Execution complexity', value: 7.2 },
          ],
        },
        {
          name: 'Work first',
          values: [
            { dimension: 'Skill acceleration', value: 7.1 },
            { dimension: 'Cash pressure', value: 3.8 },
            { dimension: 'Optionality', value: 7.3 },
            { dimension: 'Execution complexity', value: 4.1 },
          ],
        },
      ],
    },
  ]
}

function buildGenericCharts(sessionId: string): ChartArtifact[] {
  return [
    {
      id: `chart-${sessionId}-line`,
      sessionId,
      kind: 'line',
      title: 'Outcome confidence over time',
      unit: 'confidence',
      lineSeries: [
        { label: 'Week 1', value: 42, nature: 'actual' },
        { label: 'Week 2', value: 51, nature: 'estimated' },
        { label: 'Week 3', value: 63, nature: 'estimated' },
        { label: 'Week 4', value: 71, nature: 'inferred' },
      ],
    },
  ]
}

function buildQuestions(
  sessionId: string,
  scenario: 'exchange' | 'car' | 'graduate' | 'generic',
): ClarificationQuestion[] {
  const common: ClarificationQuestion[] = [
    {
      id: `${sessionId}-risk`,
      sessionId,
      question: 'How risk-sensitive is this decision for you?',
      purpose: 'Risk tolerance changes how aggressively the recommendation should trade upside for stability.',
      fieldType: 'slider',
      allowCustomInput: true,
      allowSkip: true,
      min: 1,
      max: 10,
      unit: '/10',
      priority: 1,
      recommended: ['4'],
    },
    {
      id: `${sessionId}-deadline`,
      sessionId,
      question: 'When do you need to make the decision?',
      purpose: 'The time window determines whether the recommendation should optimize for speed or allow more waiting for evidence.',
      fieldType: 'single-choice',
      allowCustomInput: true,
      allowSkip: true,
      priority: 2,
      options: [
        { value: '1-week', label: 'Within 1 week' },
        { value: '1-month', label: 'Within 1 month' },
        { value: '2-months', label: 'Within 2 months' },
      ],
      recommended: ['1-month'],
    },
  ]

  if (scenario === 'exchange') {
    return [
      {
        id: `${sessionId}-country`,
        sessionId,
        question: 'Have you already narrowed the target country or school?',
        purpose: 'Living cost, visa timing, course fit, and scholarships all depend heavily on the destination.',
        fieldType: 'text',
        allowCustomInput: true,
        allowSkip: false,
        priority: 1,
      },
      {
        id: `${sessionId}-budget`,
        sessionId,
        question: 'What total budget range is actually acceptable to you?',
        purpose: 'The budget floor determines whether the exchange remains sustainable or becomes financially fragile.',
        fieldType: 'single-choice',
        allowCustomInput: true,
        allowSkip: false,
        priority: 1,
        options: [
          { value: '<8k', label: 'Below 8k USD' },
          { value: '8k-15k', label: '8k - 15k USD' },
          { value: '>15k', label: 'Above 15k USD' },
        ],
        recommended: ['8k-15k'],
      },
      ...common,
    ]
  }

  if (scenario === 'car') {
    return [
      {
        id: `${sessionId}-commute`,
        sessionId,
        question: 'What does your typical commute look like each week?',
        purpose: 'Commute complexity is the main driver of whether car convenience is worth the cost premium.',
        fieldType: 'textarea',
        allowCustomInput: true,
        allowSkip: false,
        priority: 1,
      },
      {
        id: `${sessionId}-cash`,
        sessionId,
        question: 'Which matters more: monthly cash pressure or total cost of ownership?',
        purpose: 'The recommendation changes depending on whether liquidity or long-run cost is your main constraint.',
        fieldType: 'single-choice',
        allowCustomInput: true,
        allowSkip: false,
        priority: 1,
        options: [
          { value: 'cashflow', label: 'Monthly cash pressure' },
          { value: 'total-cost', label: 'Total cost of ownership' },
        ],
        recommended: ['cashflow'],
      },
      ...common,
    ]
  }

  if (scenario === 'graduate') {
    return [
      {
        id: `${sessionId}-goal`,
        sessionId,
        question: 'Which long-term goal matters most right now?',
        purpose: 'Priority weighting changes the ranking between graduate school, work-first, and deferment paths.',
        fieldType: 'multi-choice',
        allowCustomInput: true,
        allowSkip: false,
        priority: 1,
        options: [
          { value: 'research', label: 'Research / academic path' },
          { value: 'income', label: 'Raise income quickly' },
          { value: 'career', label: 'Industry experience and résumé depth' },
          { value: 'overseas', label: 'Prepare for overseas applications or relocation' },
        ],
        recommended: ['career', 'income'],
      },
      {
        id: `${sessionId}-funding`,
        sessionId,
        question: 'Do you already have a realistic funding plan for graduate school?',
        purpose: 'Funding certainty materially changes the cash burden, opportunity cost, and decision order.',
        fieldType: 'single-choice',
        allowCustomInput: true,
        allowSkip: true,
        priority: 1,
        options: [
          { value: 'self-funded', label: 'Mostly self-funded' },
          { value: 'family', label: 'Family support' },
          { value: 'scholarship', label: 'Scholarship / assistantship' },
        ],
        recommended: ['scholarship'],
      },
      ...common,
    ]
  }

  return [
    {
      id: `${sessionId}-success`,
      sessionId,
      question: 'If this decision goes well, what outcome matters most?',
      purpose: 'Clear success criteria are necessary before cost and risk can be judged properly.',
      fieldType: 'textarea',
      allowCustomInput: true,
      allowSkip: false,
      priority: 1,
    },
    {
      id: `${sessionId}-constraint`,
      sessionId,
      question: 'What is the hardest non-negotiable constraint right now?',
      purpose: 'Hard constraints determine whether the system should recommend a more conservative path.',
      fieldType: 'text',
      allowCustomInput: true,
      allowSkip: true,
      priority: 1,
    },
    ...common,
  ]
}

function buildEvidence(sessionId: string, scenario: string): EvidenceItem[] {
  const common: EvidenceItem[] = [
    {
      id: `${sessionId}-e1`,
      sessionId,
      sourceType: 'web',
      sourceUrl: 'https://www.oecd.org',
      sourceName: 'OECD',
      title: 'Macroeconomic benchmark references',
      summary: 'Used as a contextual baseline for cost and salary comparison assumptions.',
      extractedFacts: ['Inflation and wage data should be normalized by region and year.'],
      fetchedAt: iso('2026-03-28T10:30:00+08:00'),
      confidence: 0.84,
    },
  ]

  if (scenario === 'exchange') {
    return [
      ...common,
      {
        id: `${sessionId}-e2`,
        sessionId,
        sourceType: 'web',
        sourceUrl: 'https://www.studyinjapan.go.jp',
        sourceName: 'Study in Japan',
        title: 'Student living cost reference',
        summary: 'Reference living cost ranges for students in Japan, used for monthly estimate validation.',
        extractedFacts: ['Urban regions require a larger housing buffer.', 'Insurance costs vary by program.'],
        fetchedAt: iso('2026-03-28T10:34:00+08:00'),
        confidence: 0.91,
      },
      {
        id: `${sessionId}-e3`,
        sessionId,
        sourceType: 'web',
        sourceUrl: 'https://www.mofa.go.jp',
        sourceName: 'MOFA',
        title: 'Visa application timing notes',
        summary: 'Processing windows suggest a timing buffer should be included in the schedule.',
        extractedFacts: ['Buffer of 2-4 weeks recommended around document review.'],
        fetchedAt: iso('2026-03-28T10:36:00+08:00'),
        confidence: 0.88,
      },
    ]
  }

  if (scenario === 'car') {
    return [
      ...common,
      {
        id: `${sessionId}-e2`,
        sessionId,
        sourceType: 'web',
        sourceUrl: 'https://www.aaa.com',
        sourceName: 'AAA',
        title: 'Vehicle ownership cost benchmark',
        summary: 'Provides annual ownership cost categories used for comparison assumptions.',
        extractedFacts: ['Fuel, maintenance, and depreciation dominate the yearly total.'],
        fetchedAt: iso('2026-03-28T09:50:00+08:00'),
        confidence: 0.86,
      },
    ]
  }

  if (scenario === 'graduate') {
    return [
      ...common,
      {
        id: `${sessionId}-e2`,
        sessionId,
        sourceType: 'web',
        sourceUrl: 'https://gradschool.cornell.edu',
        sourceName: 'Cornell Graduate School',
        title: 'Graduate funding structure examples',
        summary: 'Used to frame scholarship and assistantship availability assumptions.',
        extractedFacts: ['Funding uncertainty should be separated from admission uncertainty.'],
        fetchedAt: iso('2026-03-28T08:40:00+08:00'),
        confidence: 0.82,
      },
    ]
  }

  return common
}

function buildCalculations(sessionId: string, scenario: string): CalculationTask[] {
  if (scenario === 'exchange') {
    return [
      {
        id: `${sessionId}-calc-1`,
        sessionId,
        taskType: 'budget-band',
        formulaExpression: 'tuition + housing + transport + insurance + contingency',
        inputParams: { tuition: 4200, housing: 3600, transport: 850, insurance: 600, contingency: 1200 },
        units: 'USD',
        result: '10450',
        errorMargin: '± 12%',
        createdAt: iso('2026-03-28T10:50:00+08:00'),
      },
      {
        id: `${sessionId}-calc-2`,
        sessionId,
        taskType: 'safety-buffer',
        formulaExpression: 'monthly_runway * 2',
        inputParams: { monthly_runway: 1650 },
        units: 'USD',
        result: '3300',
        errorMargin: 'Suggested safety reserve',
        createdAt: iso('2026-03-28T10:51:00+08:00'),
      },
    ]
  }

  if (scenario === 'car') {
    return [
      {
        id: `${sessionId}-calc-1`,
        sessionId,
        taskType: 'break-even',
        formulaExpression: 'ownership_cost(t) = transit_cost(t)',
        inputParams: { monthly_car: 590, monthly_transit: 340, upfront: 3200 },
        units: 'month',
        result: '19.2',
        errorMargin: 'Sensitive to parking variability',
        createdAt: iso('2026-03-28T09:58:00+08:00'),
      },
    ]
  }

  if (scenario === 'graduate') {
    return [
      {
        id: `${sessionId}-calc-1`,
        sessionId,
        taskType: 'opportunity-cost',
        formulaExpression: 'salary_foregone - scholarship_value + skill_delta',
        inputParams: { salary_foregone: 68000, scholarship_value: 18000, skill_delta: 14000 },
        units: 'CNY equivalent score',
        result: '36000',
        errorMargin: 'Excludes long-tail networking upside',
        createdAt: iso('2026-03-28T08:55:00+08:00'),
      },
    ]
  }

  return [
    {
      id: `${sessionId}-calc-1`,
      sessionId,
      taskType: 'confidence-slope',
      formulaExpression: 'signal_score / uncertainty_count',
      inputParams: { signal_score: 71, uncertainty_count: 5 },
      units: 'index',
      result: '14.2',
      createdAt: iso('2026-03-28T08:10:00+08:00'),
    },
  ]
}

function buildConclusions(sessionId: string, scenario: string) {
  if (scenario === 'exchange') {
    return [
      {
        id: `${sessionId}-c1`,
        sessionId,
        conclusion: 'If the budget floor is below 10.5k USD and no extra runway exists, the exchange materially compresses financial safety margin.',
        conclusionType: 'estimate' as const,
        basisRefs: [`${sessionId}-calc-1`, `${sessionId}-e2`],
        confidence: 0.82,
        createdAt: iso('2026-03-28T10:55:00+08:00'),
      },
      {
        id: `${sessionId}-c2`,
        sessionId,
        conclusion: 'Academic and exposure upside are real, but visa timing and funding buffer remain the two highest-impact unknowns.',
        conclusionType: 'inference' as const,
        basisRefs: [`${sessionId}-e3`],
        confidence: 0.79,
        createdAt: iso('2026-03-28T10:56:00+08:00'),
      },
    ]
  }

  if (scenario === 'car') {
    return [
      {
        id: `${sessionId}-c1`,
        sessionId,
        conclusion: 'If monthly liquidity matters most, buying a car is not the safer default choice right now.',
        conclusionType: 'inference' as const,
        basisRefs: [`${sessionId}-calc-1`],
        confidence: 0.85,
        createdAt: iso('2026-03-28T10:01:00+08:00'),
      },
    ]
  }

  if (scenario === 'graduate') {
    return [
      {
        id: `${sessionId}-c1`,
        sessionId,
        conclusion: 'If near-term cash flow and industry experience matter most, working first for 2 years is the more stable default path.',
        conclusionType: 'inference' as const,
        basisRefs: [`${sessionId}-calc-1`],
        confidence: 0.8,
        createdAt: iso('2026-03-28T09:01:00+08:00'),
      },
      {
        id: `${sessionId}-c2`,
        sessionId,
        conclusion: 'If you are clearly targeting a research-heavy path and funding is credible, graduate school carries the higher long-term upside.',
        conclusionType: 'estimate' as const,
        basisRefs: [`${sessionId}-e2`],
        confidence: 0.77,
        createdAt: iso('2026-03-28T09:03:00+08:00'),
      },
    ]
  }

  return [
    {
      id: `${sessionId}-c1`,
      sessionId,
      conclusion: 'Current information supports a first-pass direction, but hard constraints still need explicit validation.',
      conclusionType: 'inference' as const,
      basisRefs: [`${sessionId}-calc-1`],
      confidence: 0.71,
      createdAt: iso('2026-03-28T08:14:00+08:00'),
    },
  ]
}

function buildSearchTasks(sessionId: string, scenario: string): SearchTask[] {
  if (scenario === 'exchange') {
    return [
      {
        id: `${sessionId}-s1`,
        sessionId,
        topic: 'Target country living cost',
        goal: 'Validate monthly cost assumption and safe buffer.',
        scope: 'Target city, latest academic year',
        suggestedQueries: ['Japan student living cost 2026', 'exchange student housing cost Tokyo'],
        requiredFields: ['housing', 'food', 'insurance', 'transport'],
        freshnessRequirement: 'high',
        status: 'completed',
      },
      {
        id: `${sessionId}-s2`,
        sessionId,
        topic: 'Visa timing and documentation',
        goal: 'Estimate application critical path.',
        scope: 'Official policy',
        suggestedQueries: ['Japan student exchange visa requirements 2026'],
        requiredFields: ['documents', 'processing time'],
        freshnessRequirement: 'high',
        status: 'completed',
      },
    ]
  }

  if (scenario === 'car') {
    return [
      {
        id: `${sessionId}-s1`,
        sessionId,
        topic: 'Annual cost of car ownership',
        goal: 'Benchmark realistic ownership cost categories.',
        scope: 'US major city benchmark',
        suggestedQueries: ['car ownership annual cost benchmark 2026'],
        requiredFields: ['fuel', 'maintenance', 'insurance', 'depreciation'],
        freshnessRequirement: 'standard',
        status: 'completed',
      },
    ]
  }

  if (scenario === 'graduate') {
    return [
      {
        id: `${sessionId}-s1`,
        sessionId,
        topic: 'Graduate funding examples',
        goal: 'Check funding feasibility assumptions.',
        scope: 'Graduate programs, scholarships',
        suggestedQueries: ['graduate program funding assistantship examples'],
        requiredFields: ['scholarship', 'assistantship', 'timeline'],
        freshnessRequirement: 'standard',
        status: 'completed',
      },
    ]
  }

  return []
}

function buildHighlights(scenario: string): MetricHighlight[] {
  if (scenario === 'exchange') {
    return [
      {
        id: 'h1',
        label: 'Recommended budget floor',
        value: '$10.5k',
        detail: 'Below this, execution risk rises materially.',
      },
      {
        id: 'h2',
        label: 'Career / exposure upside',
        value: '8.7 / 10',
        detail: 'Strong if the program aligns with long-term path.',
      },
      {
        id: 'h3',
        label: 'Primary uncertainty',
        value: 'Visa timing',
        detail: 'Buffer 2-4 weeks before commitment.',
      },
    ]
  }

  if (scenario === 'car') {
    return [
      {
        id: 'h1',
        label: 'Break-even horizon',
        value: '19.2 mo',
        detail: 'Only attractive if convenience value remains high.',
      },
      {
        id: 'h2',
        label: 'Annual fixed burden',
        value: '$9.6k',
        detail: 'Includes parking, maintenance, and depreciation.',
      },
      {
        id: 'h3',
        label: 'Decision cue',
        value: 'Cash flow first',
        detail: 'Transit remains stronger if liquidity matters.',
      },
    ]
  }

  if (scenario === 'graduate') {
    return [
      {
        id: 'h1',
        label: 'Short-term stability winner',
        value: 'Work first',
        detail: 'Less capital pressure and lower execution complexity.',
      },
      {
        id: 'h2',
        label: 'Long-term upside upside',
        value: 'Grad school',
        detail: 'Only if funding and research fit both land.',
      },
      {
        id: 'h3',
        label: 'Info gap',
        value: 'Funding certainty',
        detail: 'Scholarship clarity changes the recommendation.',
      },
    ]
  }

  return [
    {
      id: 'h1',
      label: 'Current confidence',
      value: '71 / 100',
      detail: 'Enough for a first recommendation, not for blind commitment.',
    },
  ]
}

function buildReportMarkdown(problem: string, scenario: string, mode: AnalysisMode) {
  if (scenario === 'exchange') {
    return `# Decision summary\n\n**Problem definition**: ${problem}\n\n## Executive view\n\nIf you can keep the real budget above **10.5k USD** and protect a separate safety buffer, the exchange looks worth pursuing. If not, the recommendation weakens quickly and lower-cost alternatives become more attractive.\n\n## Cost breakdown\n\n- Direct cost: tuition differential, housing, transport, insurance, contingency.\n- Hidden cost: preparation load, document coordination, uncertainty around course transfer.\n- Opportunity cost: reduced flexibility for internships or local work experience.\n\n## Risk view\n\n- Visa timing can shift the execution path.\n- A thin budget buffer increases downside sharply.\n- If the exchange does not match the long-term goal, the upside shrinks.\n\n## Recommended next actions\n\n1. Confirm destination-specific fees and official timeline constraints.\n2. Keep a safety reserve outside the visible budget.\n3. Re-check whether the exchange materially improves the path you actually care about.`
  }

  if (scenario === 'car') {
    return `# Decision summary\n\n**Problem**: ${problem}\n\n## Executive view\n\nBuying a car only becomes defensible when convenience has repeated weekly value and your monthly cash flow can absorb the fixed burden without compressing savings.\n\n## Cost view\n\n- Upfront cost is the main drag in the first year.\n- Fixed annual burden remains materially above transit in the base case.\n- Convenience upside is real, but unevenly distributed.\n\n## Recommendation\n\n- If liquidity and optionality are priorities, stay with public transit for now.\n- Reopen the decision only if commute complexity rises or ridehail spending remains persistently high.\n- Track the decision with a 3-month commute diary before committing.`
  }

  if (scenario === 'graduate') {
    return `# Decision summary\n\n**Decision goal**: ${problem}\n\n## Executive view\n\nThe safer default path is **work for 2 years first** while keeping the graduate-school option open. If funding becomes credible and the goal weighting shifts toward research, the recommendation may change.\n\n## Comparison lens\n\n- Cash-flow pressure\n- Career experimentation and option value\n- Long-term academic upside\n- Execution complexity\n\n## Recommended next actions\n\n1. Test whether a realistic funding path exists within the next 3 months.\n2. Compare the work-first path against the actual target role requirements.\n3. Do not treat graduate school as the only path until funding and fit both turn green.`
  }

  if (mode === 'multi-option') {
    return `# Comparison memo\n\n${problem}\n\nThe current evidence supports a **conditional recommendation**, with preference weighting still deciding the final path.\n\n- Keep the option with lower downside as your default.\n- Promote the high-upside option only when the prerequisite checklist turns green.\n- Re-evaluate after the next evidence refresh.`
  }

  return `# Structured report\n\n${problem}\n\nThis report is an initial decision memo built from structured answers, external evidence, and calculation outputs. The recommendation is bounded and should be revisited when the remaining unknowns resolve.`
}

export function detectScenario(problem: string) {
  const normalized = problem.toLowerCase()

  if (normalized.includes('交换') || normalized.includes('exchange')) {
    return 'exchange'
  }

  if (normalized.includes('买车') || normalized.includes('car')) {
    return 'car'
  }

  if (normalized.includes('研究生') || normalized.includes('graduate')) {
    return 'graduate'
  }

  return 'generic'
}

export function buildScenarioBundle(
  sessionId: string,
  problem: string,
  mode: AnalysisMode,
) {
  const scenario = detectScenario(problem)
  const questions = buildQuestions(sessionId, scenario)
  const evidence = buildEvidence(sessionId, scenario)
  const calculations = buildCalculations(sessionId, scenario)
  const conclusions = buildConclusions(sessionId, scenario)
  const searchTasks = buildSearchTasks(sessionId, scenario)
  const charts =
    scenario === 'exchange'
      ? buildExchangeCharts(sessionId)
      : scenario === 'car'
        ? buildCarCharts(sessionId)
        : scenario === 'graduate'
          ? buildGraduateCharts(sessionId)
          : buildGenericCharts(sessionId)
  const budgetItems: BudgetLineItem[] | undefined =
    scenario === 'exchange'
      ? [
          {
            id: `${sessionId}-budget-1`,
            name: 'Tuition and program fees',
            category: 'Direct cost',
            itemType: 'cost',
            low: 3600,
            base: 4200,
            high: 4800,
            currency: 'USD',
            basisRefs: [`${sessionId}-e2`],
            confidence: 0.84,
            rationale: 'Program fee differential and admin costs.',
          },
          {
            id: `${sessionId}-budget-2`,
            name: 'Housing',
            category: 'Direct cost',
            itemType: 'cost',
            low: 3000,
            base: 3600,
            high: 4500,
            currency: 'USD',
            basisRefs: [`${sessionId}-e2`],
            confidence: 0.82,
            rationale: 'Urban housing remains the biggest living-cost swing factor.',
          },
          {
            id: `${sessionId}-budget-3`,
            name: 'Transport and local mobility',
            category: 'Direct cost',
            itemType: 'cost',
            low: 650,
            base: 850,
            high: 1100,
            currency: 'USD',
            basisRefs: [`${sessionId}-e2`],
            confidence: 0.74,
            rationale: 'Depends on city layout and commute pattern.',
          },
          {
            id: `${sessionId}-budget-4`,
            name: 'Insurance and admin',
            category: 'Direct cost',
            itemType: 'cost',
            low: 500,
            base: 600,
            high: 760,
            currency: 'USD',
            basisRefs: [`${sessionId}-e3`],
            confidence: 0.77,
            rationale: 'Mandatory coverage and document handling costs.',
          },
          {
            id: `${sessionId}-budget-5`,
            name: 'Safety buffer',
            category: 'Risk buffer',
            itemType: 'cost',
            low: 900,
            base: 1200,
            high: 1800,
            currency: 'USD',
            basisRefs: [`${sessionId}-calc-2`],
            confidence: 0.72,
            rationale: 'Recommended buffer for timing slip and unexpected costs.',
          },
        ]
      : scenario === 'car'
        ? [
            {
              id: `${sessionId}-budget-1`,
              name: 'Upfront down payment',
              category: 'Direct cost',
              itemType: 'cost',
              low: 2600,
              base: 3200,
              high: 4000,
              currency: 'USD',
              basisRefs: [`${sessionId}-calc-1`],
              confidence: 0.79,
              rationale: 'Immediate capital lock-up before ownership benefits show up.',
            },
            {
              id: `${sessionId}-budget-2`,
              name: 'Fuel and parking',
              category: 'Recurring cost',
              itemType: 'cost',
              low: 2800,
              base: 3400,
              high: 4500,
              currency: 'USD',
              basisRefs: [`${sessionId}-e2`],
              confidence: 0.8,
              rationale: 'Parking variability is the most unstable component.',
            },
            {
              id: `${sessionId}-budget-3`,
              name: 'Transit and ridehail alternative',
              category: 'Alternative path',
              itemType: 'opportunity_cost',
              low: 3500,
              base: 4100,
              high: 5800,
              currency: 'USD',
              basisRefs: [`${sessionId}-e2`],
              confidence: 0.83,
              rationale: 'Represents the non-car baseline used for comparison.',
            },
          ]
        : undefined
  const budgetSummary: BudgetSummary | undefined =
    scenario === 'exchange'
      ? {
          currency: 'USD',
          totalCostLow: 8650,
          totalCostBase: 10450,
          totalCostHigh: 12960,
          totalIncomeLow: 0,
          totalIncomeBase: 0,
          totalIncomeHigh: 0,
          netLow: 8650,
          netBase: 10450,
          netHigh: 12960,
          reserveNote: 'Keep at least two months of runway outside the exchange budget.',
        }
      : scenario === 'car'
        ? {
            currency: 'USD',
            totalCostLow: 7300,
            totalCostBase: 9600,
            totalCostHigh: 12500,
            totalIncomeLow: 0,
            totalIncomeBase: 0,
            totalIncomeHigh: 0,
            netLow: 7300,
            netBase: 9600,
            netHigh: 12500,
            reserveNote: 'Ownership becomes much less attractive if cash buffer matters month to month.',
          }
        : undefined
  const optionProfiles: OptionProfile[] | undefined =
    scenario === 'graduate'
      ? [
          {
            id: `${sessionId}-option-grad`,
            name: 'Apply to graduate school now',
            summary: 'Higher long-term academic upside, but greater funding and execution risk.',
            pros: ['Faster skill acceleration', 'Potential signal boost for research-oriented roles'],
            cons: ['Funding uncertainty', 'Immediate cash pressure'],
            conditions: ['Clear program fit', 'Funding plan before commitment'],
            fitFor: ['Research-heavy path', 'Users willing to absorb short-term cost'],
            cautionFlags: ['Scholarship uncertainty changes the recommendation materially'],
            estimatedCostLow: 180000,
            estimatedCostBase: 260000,
            estimatedCostHigh: 380000,
            currency: 'CNY',
            score: 7.4,
            confidence: 0.77,
            basisRefs: [`${sessionId}-e2`],
          },
          {
            id: `${sessionId}-option-work`,
            name: 'Work for 2 years first',
            summary: 'Stronger cash flow and optionality with slower academic acceleration.',
            pros: ['Better runway', 'Keeps future options open'],
            cons: ['Delays the graduate path', 'Requires deliberate self-preparation'],
            conditions: ['Role should compound relevant skills', 'Savings discipline matters'],
            fitFor: ['Users prioritizing stability and learning-by-doing'],
            cautionFlags: ['Comfort with the job path can reduce follow-through later'],
            estimatedCostLow: 60000,
            estimatedCostBase: 100000,
            estimatedCostHigh: 180000,
            currency: 'CNY',
            score: 8.1,
            confidence: 0.81,
            basisRefs: [`${sessionId}-calc-1`],
          },
          {
            id: `${sessionId}-option-defer`,
            name: 'Prepare applications while staying flexible',
            summary: 'Keeps momentum without making a full immediate commitment.',
            pros: ['Preserves optionality', 'Allows more evidence to arrive'],
            cons: ['Can prolong uncertainty', 'Needs disciplined timeline management'],
            conditions: ['Decision checkpoint in 3-6 months', 'Evidence plan for funding and fit'],
            fitFor: ['Users not ready for an irreversible choice today'],
            cautionFlags: ['Without a deadline, deferment can become drift'],
            estimatedCostLow: 30000,
            estimatedCostBase: 70000,
            estimatedCostHigh: 120000,
            currency: 'CNY',
            score: 7.7,
            confidence: 0.75,
            basisRefs: [`${sessionId}-calc-1`],
          },
        ]
      : undefined
  const unknowns =
    scenario === 'exchange'
      ? [
          'Visa timing can still change the execution window.',
          'Housing and insurance variance may move the budget band.',
        ]
      : scenario === 'car'
        ? [
            'Parking costs may be materially above the current estimate.',
            'Real convenience value depends on weekly commute complexity, not a one-time impression.',
          ]
        : scenario === 'graduate'
          ? [
              'Funding certainty is still unresolved.',
              'The recommendation changes if long-term goal weighting shifts toward research.',
            ]
          : ['One or more hard constraints remain unresolved.']
  const warnings =
    scenario === 'exchange'
      ? [
          'This recommendation weakens quickly if the budget floor is not actually available.',
        ]
      : scenario === 'car'
        ? ['Buying a car increases irreversible monthly burden before convenience is proven.']
        : scenario === 'graduate'
          ? ['Do not treat grad-school upside as guaranteed without funded fit.']
          : ['Confidence remains conditional on unresolved assumptions.']

  const report: AnalysisReport = {
    id: `report-${sessionId}`,
    sessionId,
    mode,
    summaryTitle: problem,
    markdown: buildReportMarkdown(problem, scenario, mode),
    highlights: buildHighlights(scenario),
    calculations,
    charts,
    evidence,
    assumptions: [
      'Assumes user inputs are internally consistent.',
      'External sources are treated as evidence, not final truth.',
      'Ranges separate confirmed facts from inferred values where possible.',
    ],
    unknowns,
    warnings,
    disclaimers: [
      'This product supports decisions and does not replace legal, medical, tax, or visa professionals.',
      'High-impact unknowns remain visible and should be resolved before irreversible action.',
    ],
    budgetSummary,
    budgetItems,
    optionProfiles,
    assetCards: [],
    simulations: [],
    recommendedAllocations: [],
  }

  return {
    scenario,
    questions,
    evidence,
    calculations,
    conclusions,
    searchTasks,
    charts,
    report,
  }
}

function buildSession(
  id: string,
  mode: AnalysisMode,
  problemStatement: string,
  status: AnalysisSession['status'],
  createdAt: string,
  updatedAt: string,
  lastInsight: string,
) {
  const bundle = buildScenarioBundle(id, problemStatement, mode)
  return {
    session: {
      id,
      mode,
      problemStatement,
      status,
      createdAt,
      updatedAt,
      lastInsight,
      intakeContext: mockIntakeContext,
      questions: bundle.questions,
      answers: [],
      searchTasks: bundle.searchTasks,
      evidence: bundle.evidence,
      conclusions: bundle.conclusions,
      calculations: bundle.calculations,
    } satisfies AnalysisSession,
    report: bundle.report,
  }
}

const exchangeSeed = buildSession(
  'sess-exchange',
  'single-option',
  'Should I join a study abroad exchange in year 3?',
  'COMPLETED',
  iso('2026-03-28T10:00:00+08:00'),
  iso('2026-03-28T14:42:00+08:00'),
  'Budget runway and visa timing are the two most important remaining variables.',
)

const carSeed = buildSession(
  'sess-car',
  'single-option',
  'Should I buy a car instead of continuing with public transport?',
  'COMPLETED',
  iso('2026-03-27T11:20:00+08:00'),
  iso('2026-03-27T16:35:00+08:00'),
  'If liquidity matters most, public transport remains the safer default.',
)

const gradSeed = buildSession(
  'sess-graduate',
  'multi-option',
  'Should I apply to graduate school now, work for 2 years first, or defer?',
  'CLARIFYING',
  iso('2026-03-26T08:20:00+08:00'),
  iso('2026-03-26T09:10:00+08:00'),
  'Funding certainty would materially change the recommendation direction.',
)

export interface MockDatabase {
  users: User[]
  roles: Role[]
  permissions: Permission[]
  notifications: NotificationItem[]
  logs: AuditLogEntry[]
  files: FileItem[]
  sessions: AnalysisSession[]
  reports: Record<string, AnalysisReport>
  settings: SettingsPayload
  progressCursor: Record<string, number>
}

export function createMockDatabase(): MockDatabase {
  return {
    users: structuredClone(users),
    roles: structuredClone(roles),
    permissions: structuredClone(permissions),
    notifications: structuredClone(notificationsSeed),
    logs: structuredClone(logsSeed),
    files: structuredClone(filesSeed),
    sessions: [exchangeSeed.session, carSeed.session, gradSeed.session].map((session) =>
      structuredClone(session),
    ),
    reports: {
      [exchangeSeed.session.id]: structuredClone(exchangeSeed.report),
      [carSeed.session.id]: structuredClone(carSeed.report),
      [gradSeed.session.id]: structuredClone(gradSeed.report),
    },
    settings: structuredClone(defaultSettings),
    progressCursor: {
      [exchangeSeed.session.id]: 4,
      [carSeed.session.id]: 4,
      [gradSeed.session.id]: 1,
    },
  }
}

export function buildDashboardOverview(db: MockDatabase): DashboardOverview {
  return {
    metrics: [
      {
        id: 'm-1',
        label: 'Active sessions',
        value: `${db.sessions.filter((session) => session.status !== 'COMPLETED').length}`,
        change: '+2 today',
        detail: 'Clarifying and analyzing sessions that still need attention.',
      },
      {
        id: 'm-2',
        label: 'Reports exported',
        value: `${db.sessions.filter((session) => session.status === 'COMPLETED').length}`,
        change: '+18%',
        detail: 'Completed reports with structured charts and evidence trails.',
      },
      {
        id: 'm-3',
        label: 'Unread alerts',
        value: `${db.notifications.filter((notification) => !notification.read).length}`,
        change: 'Real-time',
        detail: 'Notifications that should still surface in the operator workflow.',
      },
      {
        id: 'm-4',
        label: 'Confidence trend',
        value: '74 / 100',
        change: '+6 pts',
        detail: 'Composite quality signal across recent decision reports.',
      },
    ],
    recentSessions: db.sessions
      .slice()
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 4)
      .map(({ id, mode, problemStatement, status, createdAt, updatedAt, lastInsight }) => ({
        id,
        mode,
        problemStatement,
        status,
        createdAt,
        updatedAt,
        lastInsight,
      })),
    activity: [
      {
        id: 'a-1',
        title: 'Exchange report finalized',
        detail: 'Markdown, KPI blocks, and chart bundle synchronized.',
        createdAt: iso('2026-03-28T14:42:00+08:00'),
        tone: 'positive',
      },
      {
        id: 'a-2',
        title: 'New clarification round waiting',
        detail: 'Graduate school decision still needs funding certainty.',
        createdAt: iso('2026-03-28T13:10:00+08:00'),
        tone: 'warning',
      },
      {
        id: 'a-3',
        title: 'Cost sensitivity upload indexed',
        detail: 'Commute sensitivity CSV became available for visualization.',
        createdAt: iso('2026-03-28T11:20:00+08:00'),
        tone: 'neutral',
      },
    ],
    charts: [
      {
        id: 'dashboard-trend',
        sessionId: 'dashboard',
        kind: 'line',
        title: 'Recent report confidence trend',
        unit: 'score / 100',
        note: 'Weekly rolling confidence based on available evidence coverage.',
        lineSeries: [
          { label: 'Mar 03', value: 58, nature: 'actual' },
          { label: 'Mar 10', value: 63, nature: 'actual' },
          { label: 'Mar 17', value: 67, nature: 'estimated' },
          { label: 'Mar 24', value: 74, nature: 'actual' },
          { label: 'Mar 28', value: 78, nature: 'estimated' },
        ],
      },
      {
        id: 'dashboard-distribution',
        sessionId: 'dashboard',
        kind: 'bar',
        title: 'Report mix by workflow',
        unit: 'count',
        compareSeries: [
          { label: 'Single option', value: 12, group: 'Workflow', nature: 'actual' },
          { label: 'Multi-option', value: 7, group: 'Workflow', nature: 'actual' },
        ],
      },
    ],
  }
}

export function buildDataVizBundle(db: MockDatabase): DataVizBundle {
  return {
    charts: [
      ...buildDashboardOverview(db).charts,
      {
        id: 'viz-scatter',
        sessionId: 'dashboard',
        kind: 'scatter',
        title: 'Risk vs upside cluster',
        unit: 'score',
        note: 'Aura intensity encodes probability weight; darker points indicate inferred ranges.',
        scatterSeries: [
          { label: 'Exchange', value: 82, group: '61', intensity: 0.8, nature: 'estimated' },
          { label: 'Buy car', value: 59, group: '72', intensity: 0.9, nature: 'estimated' },
          { label: 'Work first', value: 67, group: '44', intensity: 0.7, nature: 'actual' },
          { label: 'Graduate school', value: 80, group: '63', intensity: 0.6, nature: 'estimated' },
        ],
      },
    ],
    notes: [
      'Charts intentionally stay within black, ivory, graphite, and gold to preserve a professional reading rhythm.',
      'Estimated and inferred values are visually separated from confirmed data.',
      'Exports should preserve titles, units, notes, and source references.',
    ],
  }
}
