import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PageHeader } from '@/components/layout/page-header'

describe('PageHeader', () => {
  it('hides the eyebrow when it matches the title', () => {
    render(<PageHeader eyebrow="Reports" title="Reports" description="Summary" />)

    expect(screen.queryByText('Reports', { selector: 'p.apple-kicker' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Reports' })).toBeInTheDocument()
  })

  it('keeps the eyebrow when it differs from the title', () => {
    render(<PageHeader eyebrow="Workspace preferences" title="Settings" description="Summary" />)

    expect(screen.getByText('Workspace preferences')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  })
})
