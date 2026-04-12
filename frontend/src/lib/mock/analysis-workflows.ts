import { buildScenarioBundle } from '@/lib/mock/data'
import type {
  AnalysisMode,
  AnalysisReport,
  CalculationTask,
  ChartTask,
  ClarificationQuestion,
  ModeDefinition,
  SearchTask,
} from '@/types'

interface MockAnalysisBundle {
  questions: ClarificationQuestion[]
  searchTasks: SearchTask[]
  calculations: CalculationTask[]
  chartTasks: ChartTask[]
  charts: AnalysisReport['charts']
  report: AnalysisReport
}

export function buildMockModeDefinitions(): ModeDefinition[] {
  return [
    {
      id: 'single-option',
      title: 'Single decision analysis',
      subtitle: 'Go deep on one decision before you commit.',
      description:
        'Best for a single path where explicit costs, hidden costs, risk, and timing matter.',
      valueLens: [
        'Cost breakdown',
        'Risk exposure',
        'Unknowns',
        'Recommendation direction',
      ],
      icon: 'sparkles',
    },
    {
      id: 'multi-option',
      title: 'Multi-option comparison',
      subtitle: 'Compare several paths under the same evaluation lens.',
      description:
        'Best for trade-off decisions where different options create different cost, risk, and opportunity profiles.',
      valueLens: [
        'Option comparison',
        'Scenario fit',
        'Evidence density',
        'Structured recommendation',
      ],
      icon: 'git-compare',
    },
  ]
}

export function buildMockAnalysisBundle(
  sessionId: string,
  problemStatement: string,
  mode: AnalysisMode,
): MockAnalysisBundle {
  const scenario = buildScenarioBundle(sessionId, problemStatement, mode)

  return {
    questions: scenario.questions,
    searchTasks: scenario.searchTasks.map((task) => ({
      ...task,
      status: 'pending',
    })),
    calculations: scenario.calculations,
    chartTasks: scenario.charts.map((chart) => ({
      id: `${chart.id}-task`,
      sessionId,
      objective: `Render ${chart.title}`,
      chartType: chart.kind,
      title: chart.title,
      preferredUnit: chart.unit,
      status: 'pending',
    })),
    charts: scenario.charts,
    report: scenario.report,
  }
}
