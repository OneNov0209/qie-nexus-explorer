import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/rest/$')({
  handler: async ({ request, params }) => {
    const restBase = 'https://api.qie.onenov.xyz'
    const url = new URL(request.url)
    const path = url.pathname.replace('/api/rest', '')
    const targetUrl = `${restBase}${path}${url.search}`

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: request.method !== 'GET' && request.method !== 'HEAD' 
        ? await request.text() 
        : undefined,
    })

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  },
})
