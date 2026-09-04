const REQUEST_ID_HEADER = "x-request-id";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function resolveRequestId(
  request?: Pick<Request, "headers"> | Headers | null
) {
  if (!request) {
    return crypto.randomUUID();
  }

  const headers = request instanceof Headers ? request : request.headers;
  const candidate = headers.get(REQUEST_ID_HEADER);

  return isNonEmptyString(candidate) ? candidate : crypto.randomUUID();
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
