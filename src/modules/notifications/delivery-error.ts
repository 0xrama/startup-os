export class DeliveryUncertainError extends Error {
  override name = "DeliveryUncertainError";
}

export function isDeliveryUncertainError(
  error: unknown
): error is DeliveryUncertainError {
  return error instanceof DeliveryUncertainError;
}
