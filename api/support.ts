import { handleSupportRequest } from './supportCore';

type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type ApiResponse = {
  status: (statusCode: number) => ApiResponse;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const result = await handleSupportRequest({
    method: req.method,
    headers: req.headers,
    body: req.body,
  });

  Object.entries(result.headers ?? {}).forEach(([name, value]) => {
    res.setHeader(name, value);
  });

  res.status(result.status).json(result.body);
}
