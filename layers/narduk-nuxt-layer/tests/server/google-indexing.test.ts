import { describe, it, expect } from 'vitest'
import { buildBatchBody, parseBatchResponse } from '../../server/utils/google'

/**
 * Unit tests for the Google Indexing API batch request builder.
 *
 * Tests the multipart/mixed body construction and response parsing
 * used by the batch endpoint.
 */

describe('buildBatchBody', () => {
  const boundary = '===============test123=='

  it('builds a single-URL batch body', () => {
    const body = buildBatchBody(['https://example.com/jobs/1'], 'URL_UPDATED', boundary)

    expect(body).toContain(`--${boundary}`)
    expect(body).toContain('Content-Type: application/http')
    expect(body).toContain('Content-Transfer-Encoding: binary')
    expect(body).toContain('Content-ID: <item1>')
    expect(body).toContain('POST /v3/urlNotifications:publish')
    expect(body).toContain('"url":"https://example.com/jobs/1"')
    expect(body).toContain('"type":"URL_UPDATED"')
    expect(body.endsWith(`--${boundary}--`)).toBe(true)
  })

  it('builds a multi-URL batch body with sequential Content-IDs', () => {
    const urls = [
      'https://example.com/jobs/1',
      'https://example.com/jobs/2',
      'https://example.com/jobs/3',
    ]
    const body = buildBatchBody(urls, 'URL_UPDATED', boundary)

    expect(body).toContain('Content-ID: <item1>')
    expect(body).toContain('Content-ID: <item2>')
    expect(body).toContain('Content-ID: <item3>')

    // Each URL should appear in the body
    for (const url of urls) {
      expect(body).toContain(`"url":"${url}"`)
    }
  })

  it('uses URL_DELETED type when specified', () => {
    const body = buildBatchBody(['https://example.com/jobs/1'], 'URL_DELETED', boundary)

    expect(body).toContain('"type":"URL_DELETED"')
  })

  it('includes correct content-length for each part', () => {
    const url = 'https://example.com/jobs/1'
    const payload = JSON.stringify({ url, type: 'URL_UPDATED' })
    const expectedLength = new TextEncoder().encode(payload).byteLength

    const body = buildBatchBody([url], 'URL_UPDATED', boundary)

    expect(body).toContain(`content-length: ${expectedLength}`)
  })
})

describe('parseBatchResponse', () => {
  const boundary = 'batch_response_boundary'

  it('parses a successful single-part response', () => {
    const responseText = [
      `--${boundary}`,
      'Content-Type: application/http',
      'Content-ID: <response-item1>',
      '',
      'HTTP/1.1 200 OK',
      'Content-Type: application/json',
      '',
      JSON.stringify({
        urlNotificationMetadata: {
          url: 'https://example.com/jobs/1',
          latestUpdate: {
            type: 'URL_UPDATED',
            notifyTime: '2024-01-01T00:00:00Z',
          },
        },
      }),
      `--${boundary}--`,
    ].join('\r\n')

    const results = parseBatchResponse(responseText, boundary)

    expect(results).toHaveLength(1)
    expect(results[0].status).toBe(200)
    expect(results[0].body).toEqual(
      expect.objectContaining({
        urlNotificationMetadata: expect.objectContaining({
          url: 'https://example.com/jobs/1',
        }),
      }),
    )
  })

  it('parses a multi-part response with mixed statuses', () => {
    const responseText = [
      `--${boundary}`,
      'Content-Type: application/http',
      'Content-ID: <response-item1>',
      '',
      'HTTP/1.1 200 OK',
      'Content-Type: application/json',
      '',
      JSON.stringify({ url: 'https://example.com/jobs/1' }),
      `--${boundary}`,
      'Content-Type: application/http',
      'Content-ID: <response-item2>',
      '',
      'HTTP/1.1 429 Too Many Requests',
      'Content-Type: application/json',
      '',
      JSON.stringify({ error: { code: 429, message: 'Quota exceeded' } }),
      `--${boundary}--`,
    ].join('\r\n')

    const results = parseBatchResponse(responseText, boundary)

    expect(results).toHaveLength(2)
    expect(results[0].status).toBe(200)
    expect(results[1].status).toBe(429)
  })

  it('handles responses with no JSON body', () => {
    const responseText = [
      `--${boundary}`,
      'Content-Type: application/http',
      '',
      'HTTP/1.1 204 No Content',
      '',
      `--${boundary}--`,
    ].join('\r\n')

    const results = parseBatchResponse(responseText, boundary)

    expect(results).toHaveLength(1)
    expect(results[0].status).toBe(204)
    expect(results[0].body).toBeNull()
  })
})
