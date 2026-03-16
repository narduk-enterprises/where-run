/**
 * Tests for no-csrf-exempt-route-misuse rule
 */

import { RuleTester } from 'eslint'
import rule from '../src/rules/no-csrf-exempt-route-misuse'

import { describe, it, afterAll } from 'vitest'
RuleTester.describe = describe
RuleTester.it = it
RuleTester.afterAll = afterAll

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
})

const webhookFile = 'server/api/webhooks/stripe.post.ts'
const cronFile = 'server/api/cron/daily.ts'
const callbackFile = 'server/api/callbacks/oauth.ts'
const normalRoute = 'server/api/users/index.ts'

ruleTester.run('no-csrf-exempt-route-misuse', rule, {
  valid: [
    // ✅ Webhook route that validates a secret header
    {
      filename: webhookFile,
      options: [{ testMode: true }],
      code: `
        const body = await readBody(event)
        const secret = getHeader(event, 'x-webhook-secret')
        if (!secret) throw createError({ statusCode: 401 })
      `,
    },
    // ✅ Cron route that validates a secret header
    {
      filename: cronFile,
      options: [{ testMode: true }],
      code: `
        const body = await readBody(event)
        const auth = getHeader(event, 'authorization')
      `,
    },
    // ✅ Webhook route with no readBody (just responds)
    {
      filename: webhookFile,
      options: [{ testMode: true }],
      code: `const ok = true`,
    },
    // ✅ Normal route — not under exempt prefix, rule does not apply
    {
      filename: normalRoute,
      code: `const body = await readBody(event)`,
    },
  ],
  invalid: [
    // ❌ Webhook route reads body but never checks a header
    {
      filename: webhookFile,
      options: [{ testMode: true }],
      code: `
        const body = await readBody(event)
        const result = processWebhook(body)
      `,
      errors: [{ messageId: 'missingSecretValidation' }],
    },
    // ❌ Callback route reads body without secret validation
    {
      filename: callbackFile,
      options: [{ testMode: true }],
      code: `
        const body = await readBody(event)
        const handled = handleCallback(body)
      `,
      errors: [{ messageId: 'missingSecretValidation' }],
    },
  ],
})
