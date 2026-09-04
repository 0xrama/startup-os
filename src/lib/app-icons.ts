import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Bot,
  Building2,
  CalendarClock,
  File,
  Files,
  FileStack,
  FileText,
  FolderOpen,
  Image,
  Landmark,
  ReceiptText,
  ScrollText,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

export function getDashboardMetricIcon(
  metric: "entities" | "deadlines" | "documents"
): LucideIcon {
  switch (metric) {
    case "entities":
      return Building2;
    case "deadlines":
      return CalendarClock;
    case "documents":
      return FileStack;
    default:
      return Building2;
  }
}

export function getWorkspaceSectionIcon(
  section:
    | "overview"
    | "documents"
    | "calendar"
    | "filings"
    | "assistant"
    | "course"
): LucideIcon {
  switch (section) {
    case "overview":
      return ShieldCheck;
    case "documents":
      return FolderOpen;
    case "calendar":
      return CalendarClock;
    case "filings":
      return ScrollText;
    case "assistant":
      return Bot;
    case "course":
      return BadgeCheck;
    default:
      return ShieldCheck;
  }
}

export function getDocumentIcon(
  fileType: string | null,
  category: string | null
): LucideIcon {
  switch (category) {
    case "notice":
      return Landmark;
    case "ein_letter":
      return BadgeCheck;
    case "tax_return":
    case "invoice":
      return ReceiptText;
    case "operating_agreement":
    case "compliance":
      return ScrollText;
  }

  if (fileType?.startsWith("image/")) {
    return Image;
  }

  if (fileType?.includes("pdf")) {
    return FileText;
  }

  if (fileType?.includes("word") || fileType?.includes("document")) {
    return FileStack;
  }

  return File;
}

export function getCitationSourceIcon(sourceType: string): LucideIcon {
  switch (sourceType) {
    case "irs":
      return ScrollText;
    case "state":
      return Landmark;
    default:
      return Files;
  }
}

export function getCollaboratorStatusIcon(status: string): LucideIcon {
  switch (status) {
    case "active":
      return Users;
    default:
      return UserPlus;
  }
}
