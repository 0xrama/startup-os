export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#064e3b] text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle decorative elements */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/[0.04] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-white/[0.03] rounded-full blur-2xl pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative">
          <span className="heading-serif text-2xl">Pax</span>
        </div>
        <div className="relative">
          <h2 className="heading-serif text-4xl xl:text-5xl leading-[1.1] mb-6">
            Never miss an
            <br />
            LLC obligation
            <br />
            <em className="text-[#6ee7b7]">again.</em>
          </h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-sm">
            Calendar, document vault, smart reminders, and an AI compliance
            assistant — all in one place for non-resident founders.
          </p>
        </div>
        <p className="text-white/40 text-xs relative">
          © {new Date().getFullYear()} Integrofy LLC
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-background px-4 py-10 sm:px-6 sm:py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
