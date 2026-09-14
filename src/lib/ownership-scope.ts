export type OwnerTaxStatus = "us_person" | "foreign_person";

export type DirectIndividualOwner = {
  name: string;
  ownershipPct: number;
  country: string;
  taxIdType: string;
  usTaxStatus: OwnerTaxStatus;
};

export type OwnershipScopeMember = {
  ownershipPct: number;
  usTaxStatus?: OwnerTaxStatus;
};

export type OwnershipScopeProfile = {
  entityType: string;
  taxClassification: string | null;
  ownerResidency: string | null;
  ownersAreIndividuals?: boolean | null;
  ownershipIsDirect?: boolean | null;
  ownerCount?: number | null;
  foreignOwnerCount?: number | null;
  usOwnerCount?: number | null;
  members?: OwnershipScopeMember[] | null;
};

export type SupportedOwnershipRoute =
  | "foreign_owned_disregarded_entity"
  | "domestic_disregarded_entity"
  | "partnership";

export type OwnershipScopeAssessment = {
  supported: boolean;
  route: SupportedOwnershipRoute | null;
  reasons: string[];
};

export type OwnerTaxStatusSummary = {
  ownerCount: number;
  foreignOwnerCount: number;
  usOwnerCount: number;
  ownerResidency: "non_us" | "us_resident" | "mixed";
};

function isOneHundred(value: number) {
  return Math.abs(value - 100) < 0.01;
}

function getOwnerSummary(profile: OwnershipScopeProfile) {
  const members = profile.members ?? [];

  if (members.length > 0) {
    return {
      ownerCount: members.length,
      foreignOwnerCount: members.filter(
        (member) => member.usTaxStatus === "foreign_person"
      ).length,
      usOwnerCount: members.filter(
        (member) => member.usTaxStatus === "us_person"
      ).length,
      unknownTaxStatusCount: members.filter((member) => !member.usTaxStatus)
        .length,
      ownershipTotal: members.reduce(
        (total, member) => total + member.ownershipPct,
        0
      ),
    };
  }

  const ownerCount = profile.ownerCount ?? 0;
  const foreignOwnerCount = profile.foreignOwnerCount ?? 0;
  const usOwnerCount = profile.usOwnerCount ?? 0;

  return {
    ownerCount,
    foreignOwnerCount,
    usOwnerCount,
    unknownTaxStatusCount: Math.max(
      ownerCount - foreignOwnerCount - usOwnerCount,
      0
    ),
    ownershipTotal: ownerCount > 0 ? 100 : 0,
  };
}

export function assessOwnershipScope(
  profile: OwnershipScopeProfile
): OwnershipScopeAssessment {
  const reasons: string[] = [];
  const summary = getOwnerSummary(profile);

  if (profile.ownersAreIndividuals !== true) {
    reasons.push(
      profile.ownersAreIndividuals === false
        ? "Pax does not yet support owners that are companies, trusts, or other entities."
        : "Confirm that every owner is an individual."
    );
  }

  if (profile.ownershipIsDirect !== true) {
    reasons.push(
      profile.ownershipIsDirect === false
        ? "Pax does not yet support indirect ownership."
        : "Confirm that every listed owner holds their interest directly."
    );
  }

  if (summary.unknownTaxStatusCount > 0) {
    reasons.push(
      "Record whether every owner is a U.S. person or foreign person for U.S. tax purposes."
    );
  }

  if (!isOneHundred(summary.ownershipTotal)) {
    reasons.push("Ownership percentages must total 100%.");
  }

  if (profile.entityType === "single-member") {
    if (profile.taxClassification !== "disregarded") {
      reasons.push(
        "Pax only supports disregarded federal tax treatment for single-member LLCs."
      );
    }

    if (summary.ownerCount !== 1) {
      reasons.push("A single-member LLC must have exactly one recorded owner.");
    }
  } else if (profile.entityType === "multi-member") {
    if (profile.taxClassification !== "partnership") {
      reasons.push(
        "Pax only supports partnership federal tax treatment for multi-member LLCs."
      );
    }

    if (summary.ownerCount < 2) {
      reasons.push("A partnership must have at least two recorded owners.");
    }
  } else {
    reasons.push(
      "Pax currently supports only single-member and multi-member LLCs."
    );
  }

  if (reasons.length > 0) {
    return { supported: false, route: null, reasons };
  }

  if (profile.entityType === "multi-member") {
    return { supported: true, route: "partnership", reasons: [] };
  }

  return {
    supported: true,
    route:
      summary.foreignOwnerCount === 1
        ? "foreign_owned_disregarded_entity"
        : "domestic_disregarded_entity",
    reasons: [],
  };
}

export function summarizeOwnerTaxStatuses(
  members: OwnershipScopeMember[]
): OwnerTaxStatusSummary {
  const foreignOwnerCount = members.filter(
    (member) => member.usTaxStatus === "foreign_person"
  ).length;

  const usOwnerCount = members.filter(
    (member) => member.usTaxStatus === "us_person"
  ).length;

  return {
    ownerCount: members.length,
    foreignOwnerCount,
    usOwnerCount,
    ownerResidency:
      foreignOwnerCount === members.length
        ? "non_us"
        : usOwnerCount === members.length
          ? "us_resident"
          : "mixed",
  };
}

export function getOwnerResidency(
  ownerCount: number,
  foreignOwnerCount: number,
  usOwnerCount: number
): OwnerTaxStatusSummary["ownerResidency"] {
  if (foreignOwnerCount === ownerCount) return "non_us";

  if (usOwnerCount === ownerCount) return "us_resident";

  return "mixed";
}
