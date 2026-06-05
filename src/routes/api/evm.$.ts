import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/evm/$')({
  handler: async ({ request, params }) => {
    const evmRpc = 'https://rpc-evm.qie.onenov.xyz'
    
    const body = await request.json()

    const response = await fetch(evmRpc, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
