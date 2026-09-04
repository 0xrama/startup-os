"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  Clock,
  AlertTriangle,
  Shield,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Lesson = {
  id: string;
  title: string;
  icon: React.ElementType;
  duration: string;
  content: {
    heading: string;
    body: string;
    checklist?: string[];
    tip?: string;
  }[];
};

const COURSE: Lesson[] = [
  {
    id: "first-30-days",
    title: "Your first 30 days",
    icon: Clock,
    duration: "5 min",
    content: [
      {
        heading: "Get your EIN",
        body: "If you haven't already, apply for an Employer Identification Number (EIN) using IRS Form SS-4. Non-U.S. residents cannot use the online application — you must apply by mail, fax, or phone. Processing takes 4-6 weeks by mail or 2 weeks by fax.",
        checklist: [
          "Download or prepare IRS Form SS-4",
          "Have your LLC formation documents ready",
          "Choose application method: fax (preferred) or mail",
          "Track your application status",
        ],
        tip: "Fax is the fastest option for non-residents. Fax to (855) 641-6935 and expect a response within 2 weeks.",
      },
      {
        heading: "Open a U.S. bank account",
        body: "Many U.S. banks offer accounts to non-resident LLC owners. You'll typically need your EIN, Articles of Organization, Operating Agreement, and valid passport. Some banks require an in-person visit; others like Mercury or Relay offer remote opening.",
        checklist: [
          "Gather required documents: EIN letter, Articles of Organization, Operating Agreement",
          "Research bank options (Mercury, Relay, traditional banks)",
          "Apply for your business bank account",
          "Set up online banking access",
        ],
      },
      {
        heading: "Upload your documents to Pax",
        body: "Store your formation documents, EIN letter, and operating agreement in your secure document vault. This helps Pax Assistant give you accurate, personalized guidance.",
        checklist: [
          "Upload Articles of Organization",
          "Upload Operating Agreement",
          "Upload EIN letter (once received)",
          "Upload any registered agent confirmation",
        ],
      },
      {
        heading: "Review your compliance calendar",
        body: "Pax has auto-generated compliance tasks based on your LLC profile. Review the calendar to see your upcoming deadlines and set your reminder preferences.",
        checklist: [
          "Review auto-generated compliance tasks",
          "Confirm reminder notification preferences",
          "Note your first major deadline",
        ],
      },
    ],
  },
  {
    id: "annual-cycle",
    title: "The annual compliance cycle",
    icon: CalendarClock,
    duration: "4 min",
    content: [
      {
        heading: "January – March: Prepare for tax season",
        body: "Gather your financial records for the prior year. This includes bank statements, invoices, expenses, and any records of transactions between you and your LLC. If you have a multi-member LLC, begin preparing Schedule K-1s.",
        checklist: [
          "Collect all bank statements for the prior year",
          "Organize income and expense records",
          "Identify all reportable transactions with foreign owners",
        ],
      },
      {
        heading: "March – April: Federal tax filings",
        body: "Single-member LLCs with foreign owners must file Form 5472 + pro-forma 1120 by April 15. Multi-member LLCs file Form 1065 by March 15. Extensions are available (Form 7004) but don't extend the time to pay any tax due.",
        checklist: [
          "File Form 5472 + 1120 (single-member) by April 15",
          "Or file Form 1065 (multi-member) by March 15",
          "File FBAR (FinCEN 114) if applicable by April 15",
          "Request extension if needed via Form 7004",
        ],
        tip: "The penalty for late Form 5472 is $25,000 per form per year. Don't miss this deadline.",
      },
      {
        heading: "Your state's annual report month",
        body: "Each state has its own annual report or franchise tax deadline. Wyoming LLCs file in their anniversary month. Florida LLCs file by May 1. Delaware by June 1. Check your Pax calendar for your specific date.",
        checklist: [
          "Check your state's annual report deadline",
          "Prepare the filing (usually online)",
          "Pay the required fee",
        ],
      },
      {
        heading: "Throughout the year: Maintain records",
        body: "Keep your entity records current. Update your registered agent if it changes, maintain your core governing documents, and track material owner or company transactions. Good recordkeeping makes tax season much easier.",
        checklist: [
          "Renew your registered agent before expiration",
          "Keep financial records organized monthly",
          "Review whether BOI updates apply if your company is foreign-reporting",
          "Upload new documents to your Pax vault",
        ],
      },
    ],
  },
  {
    id: "what-if",
    title: "What to do when…",
    icon: AlertTriangle,
    duration: "4 min",
    content: [
      {
        heading: "…you receive an IRS notice",
        body: "Don't panic. IRS notices are common and usually straightforward. Read the notice carefully, note any deadline for response, and upload it to your Pax document vault immediately. The notice will specify what action is needed.",
        checklist: [
          "Read the notice carefully and note the response deadline",
          "Upload the notice to your Pax document vault",
          "Identify what action the IRS is requesting",
          "Consult a tax professional if the notice involves penalties or audits",
          "Respond before the deadline",
        ],
        tip: "Most IRS notices are about minor discrepancies or missing information, not audits. Respond promptly and the issue usually resolves quickly.",
      },
      {
        heading: "…you miss a deadline",
        body: "File as soon as possible. The IRS imposes penalties for late filing, but these increase the longer you wait. Form 5472 has a $25,000 late penalty per form, but you may be able to request penalty abatement for reasonable cause if it's your first time.",
        checklist: [
          "File the overdue return immediately",
          "Pay any associated fees or penalties",
          "Consider requesting First Time Penalty Abatement",
          "Set up Pax reminders to prevent future misses",
        ],
      },
      {
        heading: "…you want to close your LLC",
        body: "Closing a simple entity involves both state and federal steps. You'll need to file final tax returns, file dissolution paperwork with your state, cancel your registered agent, and close your bank account. The order matters.",
        checklist: [
          "File final federal tax return (Form 5472/1120 or 1065) and check the 'Final Return' box",
          "File Articles of Dissolution with your state",
          "Cancel your registered agent service",
          "Close your U.S. bank account",
          "Confirm whether any final BOI filing or update is still required",
          "Keep records for at least 3 years after dissolution",
        ],
      },
      {
        heading: "…you add a new member or change ownership",
        body: "Adding a member to a single-member LLC changes its tax classification from disregarded entity to partnership. This triggers several filings and may require a new EIN. Review whether any BOI update obligation applies to your entity before filing.",
        checklist: [
          "Update your Operating Agreement",
          "Apply for a new EIN (required for classification change)",
          "Check whether a BOI update is required under the current rule",
          "Update your LLC profile in Pax",
          "Review new filing obligations (Form 1065 instead of 5472)",
        ],
      },
    ],
  },
];

export default function CoursePage() {
  const [activeLesson, setActiveLesson] = useState<string>(COURSE[0].id);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    new Set()
  );

  const currentLesson = COURSE.find((l) => l.id === activeLesson)!;
  const progress = (completedLessons.size / COURSE.length) * 100;

  function markComplete(lessonId: string) {
    setCompletedLessons((prev) => new Set([...prev, lessonId]));
    const currentIdx = COURSE.findIndex((l) => l.id === lessonId);
    if (currentIdx < COURSE.length - 1) {
      setActiveLesson(COURSE[currentIdx + 1].id);
    }
  }

  return (
    <div>
      <div className="mb-10">
        <h1 className="heading-serif text-3xl mb-1">Onboarding Course</h1>
        <p className="text-sm text-muted-foreground">
          Learn the core compliance obligations for your simple entity step by step.
        </p>
        {/* Progress bar */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {completedLessons.size}/{COURSE.length} complete
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar */}
        <nav className="space-y-1">
          {COURSE.map((lesson) => {
            const isActive = lesson.id === activeLesson;
            const isComplete = completedLessons.has(lesson.id);
            return (
              <button
                key={lesson.id}
                type="button"
                onClick={() => setActiveLesson(lesson.id)}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-all text-left ${
                  isActive
                    ? "bg-primary/6 text-primary font-medium border-accent-left shadow-sm"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-[#2D6A4F] flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate">{lesson.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {lesson.duration}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 opacity-50" />
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center icon-container">
              <currentLesson.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="heading-serif text-2xl">{currentLesson.title}</h2>
              <p className="text-xs text-muted-foreground font-mono">
                {currentLesson.duration} read
              </p>
            </div>
          </div>

          {currentLesson.content.map((section, i) => (
            <div key={i} className="card-warm p-6 transition-all hover:shadow-sm">
              <h3 className="heading-serif text-lg mb-3">{section.heading}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {section.body}
              </p>

              {section.checklist && (
                <div className="space-y-2 mb-4">
                  {section.checklist.map((item, j) => (
                    <label
                      key={j}
                      className="flex items-start gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 rounded accent-primary"
                      />
                      {item}
                    </label>
                  ))}
                </div>
              )}

              {section.tip && (
                <div className="callout-warm p-3 text-xs flex items-start gap-2">
                  <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Tip:</strong> {section.tip}
                  </p>
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end pt-4">
            <Button
              onClick={() => markComplete(currentLesson.id)}
              disabled={completedLessons.has(currentLesson.id)}
              className="gap-2 btn-warm border-0"
            >
              {completedLessons.has(currentLesson.id) ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Completed
                </>
              ) : (
                <>
                  Mark as complete
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
