import { db } from "@/lib/db";
import { llcCollaborators, complianceTasks, documents } from "@/lib/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import {
  Building2,
  CalendarClock,
  FolderOpen,
  MessageSquare,
  FileText,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LlcSecureDetails } from "@/components/dashboard/llc-secure-details";
import { requirePageLlcAccess } from "@/lib/access";
import { CollaboratorsPanel } from "@/components/dashboard/collaborators-panel";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion";

export default async function LLCOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { access, plan } = await requirePageLlcAccess(id);
  const llc = access.llc;

  const tasks = await db
    .select()
    .from(complianceTasks)
    .where(eq(complianceTasks.llcId, id));

  const docs = await db.select().from(documents).where(eq(documents.llcId, id));
  const collaborators = await db.query.llcCollaborators.findMany({
    where: eq(llcCollaborators.llcId, id),
  });

  const pendingTasks = tasks.filter((t) => t.status !== "completed");

  const quickLinks = [
    {
      label: "Documents",
      href: `/dashboard/llc/${id}/documents`,
      icon: FolderOpen,
      count: docs.length,
      desc: "Stored files",
    },
    {
      label: "Calendar",
      href: `/dashboard/llc/${id}/calendar`,
      icon: CalendarClock,
      count: pendingTasks.length,
      desc: "Pending tasks",
    },
    {
      label: "Filings",
      href: `/dashboard/llc/${id}/filings`,
      icon: FileText,
      count: tasks.filter((t) => t.status === "completed").length,
      desc: "Completed",
    },
    {
      label: "Assistant",
      href: `/dashboard/llc/${id}/assistant`,
      icon: MessageSquare,
      count: null,
      desc: "Ask Pax Assistant",
    },
  ];

  return (
    <div>
      {/* Header */}
      <FadeIn>
        <div className="mb-8 sm:mb-10">
          <div className="mb-1 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="heading-serif text-3xl">{llc.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{llc.state}</Badge>
                <span className="text-sm text-muted-foreground">
                  {llc.entityType}
                </span>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Quick links */}
      <FadeIn delay={0.05}>
        <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-10">
          {quickLinks.map((link) => (
            <StaggerItem key={link.label}>
              <Link
                href={link.href}
                className="card-warm card-warm-lift p-6 group block"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="icon-container w-11 h-11 rounded-lg bg-secondary flex items-center justify-center">
                    <link.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
                {link.count !== null && (
                  <p className="heading-serif text-3xl">{link.count}</p>
                )}
                <p className="font-semibold text-sm">{link.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {link.desc}
                </p>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </FadeIn>

      {/* Entity details — two-column layout */}
      <FadeIn delay={0.1}>
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: Entity Details */}
          <div className="lg:col-span-3 card-warm p-6">
            <h2 className="heading-serif text-xl mb-5">Entity Details</h2>
            <div className="grid gap-x-6 gap-y-5 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground text-xs mb-1">State</p>
                <div className="flex items-center gap-1.5 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {llc.state}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">
                  Entity Type
                </p>
                <p className="font-medium">{llc.entityType}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">
                  Founder Residency
                </p>
                <p className="font-medium">
                  {llc.ownerResidency === "us_resident"
                    ? "U.S. resident"
                    : "Non-U.S. resident"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">
                  Tax Classification
                </p>
                <p className="font-medium">{llc.taxClassification || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">EIN Status</p>
                <Badge variant="secondary" className="text-xs">
                  {llc.einStatus}
                </Badge>
              </div>
            </div>

            <LlcSecureDetails
              encryptedData={llc.encryptedData}
              fallbackEin={llc.ein}
              fallbackRegisteredAgent={llc.registeredAgent}
              fallbackMembers={
                (llc.members as
                  | {
                      name: string;
                      ownershipPct: number;
                      country: string;
                      taxIdType: string;
                    }[]
                  | null) ?? null
              }
            />
          </div>

          {/* Right: Key Dates */}
          <div className="lg:col-span-2 card-warm p-6">
            <h2 className="heading-serif text-xl mb-5">Key Dates</h2>
            <div className="space-y-5 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-1">
                  Tax Year End
                </p>
                <p className="font-medium font-mono">{llc.taxYearEnd || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">
                  Formation Date
                </p>
                <p className="font-medium font-mono">
                  {llc.formationDate || "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">
                  RA Renewal Date
                </p>
                <p className="font-medium font-mono">
                  {llc.raRenewalDate || "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">
                  Annual Report Month
                </p>
                <p className="font-medium">{llc.annualReportMonth || "—"}</p>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      <CollaboratorsPanel
        llcId={id}
        collaborators={collaborators}
        canManage={access.role === "owner"}
        collaboratorsEnabled={plan === "pro"}
      />
    </div>
  );
}
