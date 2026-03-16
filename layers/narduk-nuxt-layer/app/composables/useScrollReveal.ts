/**
 * useScrollReveal — IntersectionObserver-based scroll reveal animation.
 *
 * Elements with class `reveal-on-scroll` get `revealed` added when visible.
 * Optional `data-delay` attribute (in 100ms units) staggers the reveal.
 *
 * @example
 * ```vue
 * <script setup>
 * useScrollReveal()
 * </script>
 * <template>
 *   <div class="reveal-on-scroll" data-delay="2">Appears after 200ms</div>
 * </template>
 * ```
 *
 * Pair with CSS:
 * ```css
 * .reveal-on-scroll { opacity: 0; transform: translateY(20px); transition: all 0.6s ease; }
 * .reveal-on-scroll.revealed { opacity: 1; transform: translateY(0); }
 * ```
 */
export function useScrollReveal() {
  if (import.meta.server) return

  onMounted(() => {
    const elements = document.querySelectorAll('.reveal-on-scroll')

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const delay = (entry.target as HTMLElement).dataset.delay
            if (delay) {
              setTimeout(
                () => {
                  entry.target.classList.add('revealed')
                },
                Number.parseInt(delay) * 100,
              )
            } else {
              entry.target.classList.add('revealed')
            }
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.1 },
    )

    for (const el of elements) {
      observer.observe(el)
    }
  })
}
