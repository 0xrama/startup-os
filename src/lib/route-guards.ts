import { NextResponse } from "next/server";
import { checkFeatureAccess, getUpgradeStatusCode, type FeatureCode } from "./feature-gate";
import {
  canEditLlc,
  canManageCollaborators,
  getLlcAccess,
  requireSubscribedSession,
} from "./access";

export type GateResponse = {
  error: string;
  gate?: {
    code?: "plan_required" | "limit_reached" | "feature_locked";
    reason?: string;
    currentUsage?: number;
    limit?: number;
  };
};

export function routeErrorResponse(
  error: string,
  status: number,
  gate?: GateResponse["gate"]
) {
  return NextResponse.json<GateResponse>({ error, gate }, { status });
}

export async function requireApiContext(options?: { feature?: FeatureCode }) {
  try {
    const { session, subscription, plan } = await requireSubscribedSession();

    if (options?.feature) {
      const gate = await checkFeatureAccess(session.user.id, options.feature);
      if (!gate.allowed) {
        return {
          response: routeErrorResponse(
            gate.reason ?? "Feature access denied",
            getUpgradeStatusCode(gate),
            gate
          ),
        };
      }
    }

    return { session, subscription, plan };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { response: routeErrorResponse("Unauthorized", 401) };
    }

    if (error instanceof Error && error.message === "SUBSCRIPTION_REQUIRED") {
      return { response: routeErrorResponse("Active subscription required", 402) };
    }

    throw error;
  }
}

export async function requireApiLlcAccess(
  userId: string,
  llcId: string,
  options?: { editable?: boolean; manageable?: boolean }
) {
  const access = await getLlcAccess(userId, llcId);

  if (!access) {
    return { response: routeErrorResponse("Not found", 404) };
  }

  if (options?.editable && !canEditLlc(access.role)) {
    return { response: routeErrorResponse("Forbidden", 403) };
  }

  if (options?.manageable && !canManageCollaborators(access.role)) {
    return { response: routeErrorResponse("Forbidden", 403) };
  }

  return { access };
}

