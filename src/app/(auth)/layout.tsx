export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.63 0.175 40 / 18%) 0%, transparent 70%), linear-gradient(160deg, #FAF8F5 0%, #FFF0E6 50%, #FAF8F5 100%)"
      }}
    >
      {/* Decorative bg dots */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-12 right-8 w-48 h-48 rounded-full opacity-[0.07]"
          style={{ background: "radial-gradient(circle, #E8651A 0%, transparent 70%)" }} />
        <div className="absolute bottom-16 left-4 w-64 h-64 rounded-full opacity-[0.05]"
          style={{ background: "radial-gradient(circle, #E8651A 0%, transparent 70%)" }} />
      </div>
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
}