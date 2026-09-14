"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Flag, Landmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEncryption } from "@/components/security/encryption-provider";
import { decryptJson, type CipherPayload } from "@/lib/e2ee";
import type { SecureLlcPayload } from "@/lib/secure-llc";
import {
  COMPLIANCE_STATUS_LABELS,
  computeComplianceStatus,
  type ComplianceNoticeSummary,
  type ComplianceStatusLevel,
  type ComplianceStatusReason,
  type ComplianceTaskSummary,
} from "@/lib/compliance-status";
import {
  assessFederalTaxFiling,
  buildPreparationChecks,
  type TaxEntityProfile,
} from "@/lib/tax-copilot";

type ComplianceCockpitProps = {
  profile: TaxEntityProfile;
  encryptedData: CipherPayload | null;
  tasks: ComplianceTaskSummary[];
  notices: ComplianceNoticeSummary[];
  state: string;
  formationDate: string | null;
  wyAnnualFeeReminderEnabled: boolean | null | undefined;
};

function statusBadgeVariant(status: ComplianceStatusLevel) {
  if (status === "action_required" || status === "outside_supported_scope") {
    return "destructive" as const;
  }

  return "secondary" as const;
}

function ReasonList({ reasons }: { reasons: ComplianceStatusReason[] }) {
  if (reasons.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Nothing needs attention right now.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {reasons.map((reason) => (
        <li key={reason.detail} className="text-xs leading-5">
          <span className="text-muted-foreground">{reason.detail}</span>{" "}
          <span className="ml-1 whitespace-nowrap rounded bg-secondary/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {reason.source}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ComplianceCockpit({
  profile,
  encryptedData,
  tasks,
  notices,
  state,
  formationDate,
  wyAnnualFeeReminderEnabled,
}: ComplianceCockpitProps) {
  const { masterKey } = useEncryption();

  const [securePayload, setSecurePayload] = useState<SecureLlcPayload | null>(
    profile.ein || profile.members
      ? {
          ein: profile.ein ?? null,
          registeredAgent: null,
          members: profile.members ?? [],
        }
      : null
  );

  useEffect(() => {
    let cancelled = false;

    async function decrypt() {
      if (!masterKey || !encryptedData) return;

      const value = await decryptJson<SecureLlcPayload>(
        masterKey,
        encryptedData
      );

      if (!cancelled) setSecurePayload(value);
    }

    void decrypt().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [encryptedData, masterKey]);

  const mergedProfile = useMemo(
    () => ({
      ...profile,
      ein: securePayload?.ein ?? profile.ein,
      members: securePayload?.members ?? profile.members,
    }),
    [profile, securePayload]
  );

  const report = useMemo(() => {
    const assessment = assessFederalTaxFiling(mergedProfile);
    const checks = buildPreparationChecks(mergedProfile, assessment);

    return {
      assessment,
      status: computeComplianceStatus({
        assessment,
        checks,
        tasks,
        notices,
        state,
        formationDate,
        wyAnnualFeeReminderEnabled,
      }),
    };
  }, [
    formationDate,
    mergedProfile,
    notices,
    state,
    tasks,
    wyAnnualFeeReminderEnabled,
  ]);

  return (
    <section aria-label="Compliance cockpit" className="mb-10">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="heading-serif text-xl">Compliance cockpit</h2>
        <Badge variant={statusBadgeVariant(report.status.overall)}>
          {COMPLIANCE_STATUS_LABELS[report.status.overall]}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-warm p-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Flag className="h-4 w-4 text-primary" />
              Federal
            </h3>
            <Badge variant={statusBadgeVariant(report.status.federal.status)}>
              {COMPLIANCE_STATUS_LABELS[report.status.federal.status]}
            </Badge>
          </div>
          <p className="text-sm font-medium">{report.assessment.title}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-muted-foreground">Tax year</dt>
              <dd className="mt-0.5 font-mono font-medium">
                {report.status.federal.taxYear}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Calculated due date</dt>
              <dd className="mt-0.5 font-mono font-medium">
                {report.status.federal.dueDate ?? "Depends on owner return"}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">Next tracked task</dt>
              <dd className="mt-0.5 font-medium">
                {report.status.federal.nextTaskTitle
                  ? `${report.status.federal.nextTaskTitle} · due ${report.status.federal.nextTaskDueDate}`
                  : "None scheduled"}
              </dd>
            </div>
          </dl>
          <div className="mt-4 border-t border-border pt-3">
            <ReasonList reasons={report.status.federal.reasons} />
          </div>
        </div>

        <div className="card-warm p-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Landmark className="h-4 w-4 text-primary" />
              State
            </h3>
            {report.status.wyoming.applicable ? (
              <Badge variant={statusBadgeVariant(report.status.wyoming.status)}>
                {report.status.wyoming.reminderEnabled
                  ? COMPLIANCE_STATUS_LABELS[report.status.wyoming.status]
                  : "Reminder off"}
              </Badge>
            ) : (
              <Badge variant="secondary">No state automation</Badge>
            )}
          </div>

          {report.status.wyoming.applicable ? (
            <>
              <p className="text-sm font-medium">
                Wyoming annual report license tax
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Reminder</dt>
                  <dd className="mt-0.5 font-medium">
                    {report.status.wyoming.reminderEnabled ? "On" : "Off"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    Next anniversary date
                  </dt>
                  <dd className="mt-0.5 font-mono font-medium">
                    {report.status.wyoming.nextDueDate ??
                      "Needs formation date"}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 border-t border-border pt-3">
                <ReasonList reasons={report.status.wyoming.reasons} />
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-4 text-muted-foreground">
                <CalendarClock className="mt-0.5 h-3 w-3 shrink-0" />
                Pax reminds you only. The state filing is submitted by you
                through the official Wyoming portal.
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              State automation is limited to Wyoming. Verify your state&apos;s
              requirements with the Secretary of State or a professional.
            </p>
          )}
        </div>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Statuses reflect facts Pax can see in your profile, calendar, and notice
        inbox. Anything you record yourself, such as a marked-filed package, is
        a user record that Pax does not verify.
      </p>
    </section>
  );
}
