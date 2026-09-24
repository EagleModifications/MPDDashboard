import SignInCard from "@/components/signin/SignInCard"

export default function SignIn() {
  const handleSignIn = () => {
    window.location.href = "/api/auth/login"
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background text-foreground">
      {/* Subtle background glow */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[radial-gradient(circle_at_center,var(--accent)_0%,transparent_55%)]
          opacity-30
        "
      />

      {/* Login card */}
      <div className="relative z-10 flex w-full items-center justify-center px-6">
        <SignInCard onSignIn={handleSignIn} />
      </div>
    </main>
  )
}