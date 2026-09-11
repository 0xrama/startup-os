const REQUEST_ID_HEADER = "x-request-id";

export function resolveRequestId(
  request?: Pick<Request, "headers"> | Headers | null
) {
  if (!request) {
    return crypto.randomUUID();
  }

  const headers = request instanceof Headers ? request : request.headers;
  const candidate = headers.get(REQUEST_ID_HEADER);

  return candidate !== null && candidate.trim().length > 0
    ? candidate
    : crypto.randomUUID();
}

export function withRequestIdHeader(headers?: HeadersInit, requestId?: string) {
  const nextHeaders = new Headers(headers);
  nextHeaders.set(REQUEST_ID_HEADER, requestId ?? crypto.randomUUID());

  return nextHeaders;
}

export function attachRequestId(response: Response, requestId: string) {
  response.headers.set(REQUEST_ID_HEADER, requestId);

  return response;
}

export { REQUEST_ID_HEADER };
