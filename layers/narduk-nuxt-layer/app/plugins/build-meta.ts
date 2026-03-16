/**
 * Injects build metadata into the document head (SSR + client) so the active
 * deployment can be verified from page source, devtools, or curl.
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public
  const appVersion = config.appVersion || ''
  const buildVersion = config.buildVersion || appVersion || ''
  const buildTime = config.buildTime || ''
  useHead({
    meta: [
      { name: 'app-version', content: appVersion },
      { name: 'build-version', content: buildVersion },
      { name: 'build-time', content: buildTime },
    ],
  })
})
