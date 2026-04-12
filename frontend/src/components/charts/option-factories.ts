import type { EChartsOption } from 'echarts'

import { graphic } from '@/lib/charts/echarts'
import type { ChartArtifact, ChartSeriesDatum, ChartValueNature } from '@/types'

interface ChartPalette {
  appBg: string
  panel: string
  borderStrong: string
  axisLine: string
  textPrimary: string
  textSecondary: string
  gridLine: string
  primary: string
  cyan: string
  violet: string
  emerald: string
  amber: string
  rose: string
}

interface AxisTooltipDatum {
  axisValueLabel?: string
  seriesName?: string
  value?: unknown
}

function readCssVar(name: string, fallback: string) {
  if (typeof window === 'undefined') {
    return fallback
  }

  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

function normalizeTooltipParams(params: unknown): AxisTooltipDatum[] {
  if (!Array.isArray(params)) {
    return typeof params === 'object' && params !== null ? [params as AxisTooltipDatum] : []
  }
  return params.filter((item): item is AxisTooltipDatum => typeof item === 'object' && item !== null)
}

function getPalette(): ChartPalette {
  return {
    appBg: readCssVar('--app-bg', '#0b1526'),
    panel: readCssVar('--panel', '#0f1b31'),
    borderStrong: readCssVar('--border-strong', 'rgba(116, 151, 205, 0.42)'),
    axisLine: readCssVar('--border-subtle', 'rgba(101, 132, 180, 0.28)'),
    textPrimary: readCssVar('--text-primary', '#f4f7fc'),
    textSecondary: readCssVar('--text-secondary', '#b7c1d4'),
    gridLine: readCssVar('--grid-line', 'rgba(76, 107, 153, 0.12)'),
    primary: readCssVar('--primary', '#4F7CFF'),
    cyan: readCssVar('--accent-cyan', '#22D3EE'),
    violet: readCssVar('--accent-violet', '#8B5CF6'),
    emerald: readCssVar('--accent-emerald', '#14B87A'),
    amber: readCssVar('--accent-amber', '#F59E0B'),
    rose: readCssVar('--accent-rose', '#F43F5E'),
  }
}

function natureColor(palette: ChartPalette, nature?: ChartValueNature) {
  if (nature === 'estimated') return palette.violet
  if (nature === 'inferred') return palette.amber
  return palette.cyan
}

function seriesColorByIndex(palette: ChartPalette, index: number) {
  return [palette.primary, palette.cyan, palette.violet, palette.emerald, palette.amber, palette.rose][index % 6]
}

function createSharedOption(palette: ChartPalette): EChartsOption {
  return {
    animationDuration: 500,
    animationEasing: 'cubicOut',
    grid: {
      top: 56,
      right: 24,
      bottom: 36,
      left: 44,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        lineStyle: {
          color: palette.borderStrong,
          width: 1,
        },
      },
      backgroundColor: palette.panel,
      borderColor: palette.borderStrong,
      borderWidth: 1,
      textStyle: {
        color: palette.textPrimary,
        fontSize: 12,
      },
    },
  }
}

function truncateLabel(value: string, limit = 18) {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value
}

function axisLabelStyle(palette: ChartPalette) {
  return {
    color: palette.textSecondary,
    fontFamily: 'JetBrains Mono',
  }
}

function buildLineOption(chart: ChartArtifact, palette: ChartPalette): EChartsOption {
  const points = chart.lineSeries ?? []
  const labels = points.map((point) => point.label)
  const natures: ChartValueNature[] = ['actual', 'estimated', 'inferred']

  return {
    ...createSharedOption(palette),
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: axisLabelStyle(palette),
      axisLine: { lineStyle: { color: palette.axisLine } },
      splitLine: {
        show: true,
        lineStyle: { color: palette.gridLine },
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: axisLabelStyle(palette),
      axisLine: { lineStyle: { color: palette.axisLine } },
      splitLine: {
        show: true,
        lineStyle: { color: palette.gridLine },
      },
    },
    series: natures
      .filter((nature) => points.some((point) => (point.nature ?? 'actual') === nature))
      .map((nature) => ({
        type: 'line',
        name: nature === 'actual' ? 'Confirmed' : nature === 'estimated' ? 'Estimated' : 'Inferred',
        smooth: true,
        connectNulls: true,
        symbolSize: 8,
        showSymbol: true,
        lineStyle: {
          width: 3,
          color: natureColor(palette, nature),
          type: nature === 'actual' ? 'solid' : 'dashed',
        },
        itemStyle: {
          color: natureColor(palette, nature),
          borderColor: palette.panel,
          borderWidth: 2,
        },
        areaStyle:
          nature === 'actual'
            ? {
                color: new graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(34, 211, 238, 0.18)' },
                  { offset: 1, color: 'rgba(34, 211, 238, 0.03)' },
                ]),
              }
            : undefined,
        data: points.map((point) => ((point.nature ?? 'actual') === nature ? point.value : null)),
      })),
  }
}

function buildBarOption(chart: ChartArtifact, palette: ChartPalette): EChartsOption {
  const seriesData = chart.compareSeries ?? []
  const categories = Array.from(new Set(seriesData.map((item) => item.label)))
  const groups = Array.from(new Set(seriesData.map((item) => item.group ?? 'Value')))
  const rotateLabels = categories.some((category) => category.length > 14)

  return {
    ...createSharedOption(palette),
    grid: {
      top: 72,
      right: 24,
      bottom: rotateLabels ? 86 : 58,
      left: 54,
      containLabel: true,
    },
    legend: {
      top: 8,
      right: 0,
      textStyle: {
        color: palette.textSecondary,
      },
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        ...axisLabelStyle(palette),
        interval: 0,
        rotate: rotateLabels ? 24 : 0,
        formatter: (value: string) => truncateLabel(value),
      },
      axisLine: { lineStyle: { color: palette.axisLine } },
      splitLine: {
        show: true,
        lineStyle: { color: palette.gridLine },
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: axisLabelStyle(palette),
      axisLine: { lineStyle: { color: palette.axisLine } },
      splitLine: {
        show: true,
        lineStyle: { color: palette.gridLine },
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      backgroundColor: palette.panel,
      borderColor: palette.borderStrong,
      formatter: (params: unknown) => {
        const items = normalizeTooltipParams(params)
        const title = items[0]?.axisValueLabel ?? ''
        const lines = items.map((item) => `${item.seriesName ?? 'Value'}: ${item.value ?? '-'}`)
        return [title, ...lines].join('<br/>')
      },
    },
    series: groups.map((group, index) => ({
      type: 'bar',
      name: group,
      barMaxWidth: 28,
      itemStyle: {
        borderRadius: [12, 12, 4, 4],
      },
      data: categories.map((category) => {
        const datum = seriesData.find((item) => item.label === category && (item.group ?? 'Value') === group)
        return {
          value: datum?.value ?? 0,
          itemStyle: {
            color: datum ? natureColor(palette, datum.nature) : seriesColorByIndex(palette, index),
          },
        }
      }),
    })),
  }
}

function buildScatterOption(chart: ChartArtifact, palette: ChartPalette): EChartsOption {
  const points = chart.scatterSeries ?? []

  return {
    ...createSharedOption(palette),
    xAxis: {
      type: 'value',
      axisLabel: axisLabelStyle(palette),
      axisLine: { lineStyle: { color: palette.axisLine } },
      splitLine: { lineStyle: { color: palette.gridLine } },
    },
    yAxis: {
      type: 'value',
      axisLabel: axisLabelStyle(palette),
      axisLine: { lineStyle: { color: palette.axisLine } },
      splitLine: { lineStyle: { color: palette.gridLine } },
    },
    series: [
      {
        type: 'scatter',
        symbolSize: (value: number[]) => Math.max(14, value[2] * 14),
        data: points.map((point) => ({
          value: [Number(point.group ?? 0), point.value, point.intensity ?? 0.6, point.label],
          itemStyle: {
            color: natureColor(palette, point.nature),
          },
        })),
      },
    ],
    tooltip: {
      trigger: 'item',
      backgroundColor: palette.panel,
      borderColor: palette.borderStrong,
      formatter: (params) => {
        const payload = params as unknown as { data: { value: [number, number, number, string] } }
        return `${payload.data.value[3]}<br/>X: ${payload.data.value[0]}<br/>Y: ${payload.data.value[1]}`
      },
    },
  }
}

function buildRadarOption(chart: ChartArtifact, palette: ChartPalette): EChartsOption {
  const radarSeries = chart.radarSeries ?? []
  const dimensions = radarSeries[0]?.values.map((item) => item.dimension) ?? []

  return {
    ...createSharedOption(palette),
    legend: {
      top: 0,
      right: 0,
      type: radarSeries.length > 2 ? 'scroll' : 'plain',
      textStyle: {
        color: palette.textSecondary,
      },
    },
    radar: {
      center: ['50%', '56%'],
      radius: '62%',
      indicator: dimensions.map((dimension) => ({ name: dimension, max: 10 })),
      splitLine: { lineStyle: { color: palette.gridLine } },
      splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.01)'] } },
      axisName: {
        color: palette.textSecondary,
        formatter: (value?: string) => truncateLabel(value ?? '', 16),
      },
    },
    series: [
      {
        type: 'radar',
        data: radarSeries.map((item, index) => ({
          name: item.name,
          value: item.values.map((value) => value.value),
          lineStyle: {
            color: seriesColorByIndex(palette, index),
            width: 2,
          },
          itemStyle: {
            color: seriesColorByIndex(palette, index),
          },
          areaStyle: {
            color: `${seriesColorByIndex(palette, index)}22`,
          },
        })),
      },
    ],
  }
}

function buildHeatmapOption(chart: ChartArtifact, palette: ChartPalette): EChartsOption {
  const points = chart.heatmapSeries ?? []
  const xs = Array.from(new Set(points.map((point) => point.x)))
  const ys = Array.from(new Set(points.map((point) => point.y)))

  return {
    ...createSharedOption(palette),
    tooltip: {
      position: 'top',
      backgroundColor: palette.panel,
      borderColor: palette.borderStrong,
      textStyle: {
        color: palette.textPrimary,
      },
    },
    xAxis: {
      type: 'category',
      data: xs,
      axisLabel: axisLabelStyle(palette),
      axisLine: { lineStyle: { color: palette.axisLine } },
    },
    yAxis: {
      type: 'category',
      data: ys,
      axisLabel: axisLabelStyle(palette),
      axisLine: { lineStyle: { color: palette.axisLine } },
    },
    visualMap: {
      min: 0,
      max: 10,
      calculable: false,
      textStyle: { color: palette.textSecondary },
      inRange: {
        color: ['rgba(79,124,255,0.2)', palette.primary, palette.cyan, palette.rose],
      },
    },
    series: [
      {
        type: 'heatmap',
        data: points.map((point) => [xs.indexOf(point.x), ys.indexOf(point.y), point.value]),
        label: { show: true, color: palette.appBg },
        emphasis: {
          itemStyle: {
            shadowBlur: 18,
            shadowColor: 'rgba(79,124,255,0.28)',
          },
        },
      },
    ],
  }
}

function buildPieOption(chart: ChartArtifact, palette: ChartPalette): EChartsOption {
  const slices = (chart.compareSeries ?? chart.lineSeries ?? []).map((item, index) => ({
    name: item.label,
    value: item.value,
    itemStyle: {
      color: natureColor(palette, item.nature) || seriesColorByIndex(palette, index),
      borderColor: palette.panel,
      borderWidth: 2,
    },
  }))

  return {
    ...createSharedOption(palette),
    tooltip: {
      trigger: 'item',
      backgroundColor: palette.panel,
      borderColor: palette.borderStrong,
      borderWidth: 1,
      textStyle: {
        color: palette.textPrimary,
        fontSize: 12,
      },
    },
    legend: {
      bottom: 0,
      type: 'scroll',
      textStyle: {
        color: palette.textSecondary,
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['44%', '72%'],
        center: ['50%', '48%'],
        label: {
          color: palette.textSecondary,
          formatter: '{b}\n{d}%',
        },
        labelLine: {
          lineStyle: {
            color: palette.gridLine,
          },
        },
        data: slices,
      },
    ],
  }
}

function hasData(chart: ChartArtifact) {
  return Boolean(
    chart.lineSeries?.length ||
      chart.compareSeries?.length ||
      chart.scatterSeries?.length ||
      chart.radarSeries?.length ||
      chart.heatmapSeries?.length,
  )
}

export function buildChartOption(chart: ChartArtifact) {
  if (!hasData(chart)) {
    return undefined
  }

  const palette = getPalette()

  switch (chart.kind) {
    case 'line':
      return buildLineOption(chart, palette)
    case 'bar':
      return buildBarOption(chart, palette)
    case 'scatter':
      return buildScatterOption(chart, palette)
    case 'radar':
      return buildRadarOption(chart, palette)
    case 'heatmap':
      return buildHeatmapOption(chart, palette)
    case 'pie':
      return buildPieOption(chart, palette)
    default:
      return buildLineOption(
        {
          ...chart,
          lineSeries: chart.lineSeries ?? [],
        },
        palette,
      )
  }
}

export function serializeChartRows(chart: ChartArtifact) {
  const series = (chart.lineSeries ??
    chart.compareSeries ??
    chart.scatterSeries ??
    chart.heatmapSeries ??
    []) as Array<ChartSeriesDatum | { x: string; y: string; value: number }>

  return series.map((row) => Object.values(row).join(' | '))
}
