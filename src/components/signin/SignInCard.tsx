import { LogIn } from "lucide-react"

import { Button } from "@/components/ui/button"

type SignInCardProps = {
  onSignIn: () => void
}

export default function SignInCard({
  onSignIn,
}: SignInCardProps) {
  return (
    <div className="w-full max-w-md">
      <div
        className="
          w-full
          rounded-2xl
          border
          border-border
          bg-card
          p-10
          text-center
          shadow-2xl
        "
      >
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <img
            src="/logo.png"
            alt="Metro Police Department"
            className="h-25 w-25 object-contain"
          />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          WELCOME TO THE
        </h1>

        <h2 className="mt-1 text-3xl font-bold tracking-tight text-blue-500">
          METRO POLICE
        </h2>

        <h2 className="text-3xl font-bold tracking-tight text-blue-500">
          DEPARTMENT
        </h2>

        {/* Description */}
        <p className="mx-auto mt-5 max-w-md text-sm text-muted-foreground">
          Sign in with your Discord account to continue
        </p>

        {/* Discord button */}
        <Button
          onClick={onSignIn}
          className="
            mt-7
            h-12
            w-full
            rounded-lg
            bg-[#5865F2]
            text-sm
            font-semibold
            text-white
            shadow-lg
            shadow-[#5865F2]/20
            transition-all
            hover:bg-[#4752C4]
            hover:shadow-[#5865F2]/30
          "
        >
          <LogIn className="mr-2 h-5 w-5" />
          Sign in with Discord
        </Button>
      </div>

      {/* Disclaimer */}
      <p className="mt-4 text-center text-xs text-muted-foreground">
        By signing in, you agree to the Metro Police Department's rules and guidelines.
      </p>
    </div>
  )
}