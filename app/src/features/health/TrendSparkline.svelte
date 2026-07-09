<script lang="ts">
  /**
   * Minimal dependency-free SVG sparkline (FR-09.13). Decorative only — the numeric
   * current value/delta shown alongside it already convey the information in text, so
   * this is `aria-hidden`. Stretches to fill its container's width (a fixed-width
   * viewBox + `preserveAspectRatio="none"`) so it lays out cleanly at any card size.
   */
  const VIEW_WIDTH = 100

  let { points, height = 32 }: { points: number[]; height?: number } = $props()

  const path = $derived.by(() => {
    if (points.length === 0) return ''
    if (points.length === 1) {
      const y = height / 2
      return `M0,${y} L${VIEW_WIDTH},${y}`
    }
    const min = Math.min(...points)
    const max = Math.max(...points)
    const range = max - min || 1
    const stepX = VIEW_WIDTH / (points.length - 1)
    return points
      .map((point, index) => {
        const x = index * stepX
        const y = height - ((point - min) / range) * height
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  })
</script>

{#if points.length > 0}
  <svg
    viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
    width="100%"
    {height}
    preserveAspectRatio="none"
    class="sparkline"
    aria-hidden="true"
  >
    <path
      d={path}
      fill="none"
      stroke="var(--primary)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
{/if}

<style>
  .sparkline {
    display: block;
    width: 100%;
  }
</style>
