"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";

type Step = 1 | 2 | 3 | "result";

export function HeroWizard() {
  const [step, setStep] = useState<Step>(1);
  const [residency, setResidency] = useState<string>("");
  const [entityType, setEntityType] = useState<string>("");
  const [state, setState] = useState<string>("");

  const handleNext = () => {
    if (step === 1 && residency) setStep(2);
    else if (step === 2 && entityType) setStep(3);
    else if (step === 3 && state) setStep("result");
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const reset = () => {
    setStep(1);
    setResidency("");
    setEntityType("");
    setState("");
  };

  const steps = {
    1: (
      <div className="animate-fade-in space-y-8">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Step 01
          </p>
          <h2 className="heading-serif text-3xl text-foreground tracking-tight">
            Where are you based?
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {["US Resident", "Non-US Resident"].map((option) => (
            <button
              key={option}
              onClick={() => {
                setResidency(option);
                setStep(2);
              }}
              className={cn(
                "p-5 text-left border rounded-xl transition-all duration-300 hover:shadow-md",
                residency === option
                  ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                  : "border-border/60 bg-background/50 hover:border-border hover:bg-background"
              )}
            >
              <span
                className={cn(
                  "text-sm font-semibold",
                  residency === option ? "text-primary" : "text-foreground"
                )}
              >
                {option}
              </span>
            </button>
          ))}
        </div>
      </div>
    ),
    2: (
      <div className="animate-fade-in space-y-8">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Step 02
          </p>
          <h2 className="heading-serif text-3xl text-foreground tracking-tight">
            What entity type?
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {["LLC", "Corporation"].map((option) => (
            <button
              key={option}
              onClick={() => {
                setEntityType(option);
                setStep(3);
              }}
              className={cn(
                "p-5 text-left border rounded-xl transition-all duration-300 hover:shadow-md",
                entityType === option
                  ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                  : "border-border/60 bg-background/50 hover:border-border hover:bg-background"
              )}
            >
              <span
                className={cn(
                  "text-sm font-semibold",
                  entityType === option ? "text-primary" : "text-foreground"
                )}
              >
                {option}
              </span>
            </button>
          ))}
        </div>
        <div className="pt-2">
          <button
            onClick={handleBack}
            className="max-w-fit flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />{" "}
            Back
          </button>
        </div>
      </div>
    ),
    3: (
      <div className="animate-fade-in space-y-8">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Step 03
          </p>
          <h2 className="heading-serif text-3xl text-foreground tracking-tight">
            State of formation?
          </h2>
        </div>
        <div className="space-y-6">
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full p-4 rounded-xl border border-border/60 bg-background/50 text-sm font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm cursor-pointer appearance-none"
            style={{
              backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`,
              backgroundPosition: "right 1rem center",
              backgroundRepeat: "no-repeat",
            }}
          >
            <option value="" disabled>
              Select a state
            </option>
            <option value="Wyoming">Wyoming</option>
            <option value="Delaware">Delaware</option>
            <option value="Florida">Florida</option>
            <option value="Texas">Texas</option>
            <option value="New Mexico">New Mexico</option>
            <option value="Other">Other (Specify)</option>
          </select>
          <div className="flex items-center justify-between gap-4 pt-2">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />{" "}
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={!state}
              className="flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-widest px-6 py-3 rounded-full hover:bg-primary/90 transition-all disabled:opacity-50 disabled:pointer-events-none group"
            >
              Analyze{" "}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    ),
    result: (
      <div className="animate-fade-in space-y-8 py-2">
        <div className="space-y-4">
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />{" "}
            Analysis Complete
          </p>
          <h2 className="heading-serif text-3xl md:text-4xl text-foreground leading-[1.1] tracking-tight">
            We&apos;ll track{" "}
            <span className="text-primary italic pr-1">{state}</span>{" "}
            {entityType} compliance for you under {residency} status.
          </h2>
        </div>

        <div className="flex flex-col gap-4 pt-6 border-t border-border/40">
          <Link href="/signup" className="w-full">
            <button className="w-full bg-primary text-primary-foreground font-semibold text-sm px-6 py-4 rounded-full shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex justify-between items-center group">
              <span>Initialize Workflow</span>
              <span className="text-primary-foreground/70 group-hover:text-primary-foreground transition-colors font-medium text-xs bg-primary-foreground/10 px-2 py-0.5 rounded-full">
                $20/YR
              </span>
            </button>
          </Link>
          <button
            onClick={reset}
            className="w-full flex justify-center items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors group py-2"
          >
            <RotateCcw className="w-4 h-4 group-hover:-rotate-90 transition-transform duration-300" />{" "}
            Start Over
          </button>
        </div>
      </div>
    ),
  };

  return (
    <div className="bg-background/80 backdrop-blur-xl border border-border/50 shadow-2xl rounded-3xl p-8 sm:p-10 relative overflow-hidden transition-all duration-500">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full pointer-events-none" />

      {/* Step Progress Minimal */}
      {step !== "result" && (
        <div className="flex gap-2 mb-10">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-500",
                step >= s ? "bg-primary" : "bg-primary/10"
              )}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 min-h-[260px] flex flex-col justify-center">
        {steps[step as keyof typeof steps]}
      </div>
    </div>
  );
}
