/**
 * Global $fetch interceptor — CSRF header injection.
 *
 * Automatically adds the `X-Requested-With: XMLHttpRequest` header to
 * same-origin API requests (relative URLs starting with `/`). This satisfies
 * the CSRF middleware which requires the header on all state-changing methods.
 *
 * Composables must use useNuxtApp().csrfFetch for same-origin API calls;
 * auto-imported $fetch is the raw ofetch and is not patched.
 *
 * Runs client-side only — server-side $fetch calls don't go through CSRF.
 */
const fetchWithCsrf = $fetch.create({
  onRequest({ options, request }) {
    if (typeof request === 'string' && request.startsWith('/')) {
      const headers = new Headers((options.headers as HeadersInit) || {})
      headers.set('X-Requested-With', 'XMLHttpRequest')
      options.headers = headers
    }
  },
})

export default defineNuxtPlugin(() => {
  globalThis.$fetch = fetchWithCsrf as typeof globalThis.$fetch
  return { provide: { csrfFetch: fetchWithCsrf } }
})
