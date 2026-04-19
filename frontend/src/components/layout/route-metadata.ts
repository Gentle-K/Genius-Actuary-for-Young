export interface RouteMetadata {
  group:
    | 'workspace'
    | 'rwa'
    | 'stocks'
    | 'portfolio'
    | 'settings'
  titleKey: string
  eyebrowKey?: string
  primaryActionKey?: string
  modeContext: 'workspace' | 'stocks'
}

export interface WorkspaceNavItem {
  id: string
  to: string
  labelKey: string
  group:
    | 'workspace'
    | 'rwa'
    | 'stocks'
    | 'portfolio'
    | 'settings'
  mobile?: boolean
}

export const workspaceNavigationItems: WorkspaceNavItem[] = [
  {
    id: 'workspace',
    to: '/workspace',
    labelKey: 'layout.navigation.commandCenter',
    group: 'workspace',
    mobile: true,
  },
  {
    id: 'new-analysis',
    to: '/new-analysis',
    labelKey: 'nav.newAnalysis',
    group: 'rwa',
    mobile: true,
  },
  {
    id: 'sessions',
    to: '/sessions',
    labelKey: 'nav.sessions',
    group: 'rwa',
    mobile: true,
  },
  {
    id: 'assets',
    to: '/assets',
    labelKey: 'nav.assets',
    group: 'rwa',
  },
  {
    id: 'reports',
    to: '/reports',
    labelKey: 'nav.reports',
    group: 'rwa',
  },
  {
    id: 'calculations',
    to: '/calculations',
    labelKey: 'nav.calculations',
    group: 'rwa',
  },
  {
    id: 'evidence',
    to: '/evidence',
    labelKey: 'nav.evidence',
    group: 'rwa',
  },
  {
    id: 'stocks',
    to: '/stocks',
    labelKey: 'layout.navigation.cockpit',
    group: 'stocks',
    mobile: true,
  },
  {
    id: 'stocks-candidates',
    to: '/stocks/candidates',
    labelKey: 'layout.navigation.candidates',
    group: 'stocks',
  },
  {
    id: 'stocks-orders',
    to: '/stocks/orders',
    labelKey: 'layout.navigation.orders',
    group: 'stocks',
  },
  {
    id: 'stocks-settings',
    to: '/stocks/settings',
    labelKey: 'layout.navigation.autopilotSettings',
    group: 'stocks',
  },
  {
    id: 'portfolio',
    to: '/portfolio',
    labelKey: 'nav.portfolio',
    group: 'portfolio',
  },
  {
    id: 'settings',
    to: '/settings',
    labelKey: 'nav.settings',
    group: 'settings',
  },
]

export function routeMetadata(pathname: string): RouteMetadata {
  if (pathname.startsWith('/workspace')) {
    return {
      group: 'workspace',
      titleKey: 'layout.routes.workspace',
      eyebrowKey: 'layout.navigation.workspace',
      primaryActionKey: 'workspace.primaryAction',
      modeContext: 'workspace',
    }
  }
  if (pathname.startsWith('/new-analysis')) {
    return {
      group: 'rwa',
      titleKey: 'layout.routes.newAnalysis',
      eyebrowKey: 'layout.navigation.rwaDesk',
      primaryActionKey: 'actions.newAnalysis',
      modeContext: 'workspace',
    }
  }
  if (pathname.startsWith('/assets') || pathname.startsWith('/reports') || pathname.startsWith('/sessions') || pathname.startsWith('/calculations') || pathname.startsWith('/evidence')) {
    return {
      group: 'rwa',
      titleKey:
        pathname.startsWith('/assets')
          ? 'layout.routes.assets'
          : pathname.startsWith('/reports')
            ? 'layout.routes.reports'
            : pathname.startsWith('/calculations')
              ? 'layout.routes.calculations'
              : pathname.startsWith('/evidence')
                ? 'layout.routes.evidence'
                : 'layout.routes.sessions',
      eyebrowKey: 'layout.navigation.rwaDesk',
      modeContext: 'workspace',
    }
  }
  if (pathname.startsWith('/stocks')) {
    return {
      group: 'stocks',
      titleKey: 'layout.routes.stocks',
      eyebrowKey: 'layout.navigation.stocks',
      modeContext: 'stocks',
    }
  }
  if (pathname.startsWith('/portfolio')) {
    return {
      group: 'portfolio',
      titleKey: 'layout.routes.portfolio',
      eyebrowKey: 'layout.navigation.portfolio',
      modeContext: 'workspace',
    }
  }
  if (pathname.startsWith('/settings')) {
    return {
      group: 'settings',
      titleKey: 'layout.routes.settings',
      eyebrowKey: 'layout.navigation.settings',
      modeContext: 'workspace',
    }
  }
  return {
    group: 'workspace',
    titleKey: 'layout.routes.workspace',
    eyebrowKey: 'layout.navigation.workspace',
    modeContext: 'workspace',
  }
}
