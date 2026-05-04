import { handleSupportRequest } from '../../api/supportCore';

async function handleRequest(request: Request, method: string) {
  const body = await request.json().catch(() => null);
  const result = await handleSupportRequest({
    method,
    headers: Object.fromEntries(request.headers.entries()),
    body,
  });

  return Response.json(result.body, {
    status: result.status,
    headers: result.headers,
  });
}

export async function POST(request: Request) {
  return handleRequest(request, 'POST');
}

export async function GET(request: Request) {
  return handleRequest(request, 'GET');
}
