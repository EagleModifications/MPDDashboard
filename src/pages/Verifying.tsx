import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2 } from "lucide-react"

export default function Verifying() {
  const navigate = useNavigate()

  useEffect(() => {
    const verify = async () => {
      const response = await fetch(
        "/api/auth/session",
        {
          credentials: "include",
        },
      )

      if (response.ok) {
        navigate("/", {
          replace: true,
        })
      } else {
        navigate("/signed-out", {
          replace: true,
        })
      }
    }

    verify()
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="mx-auto mb-5 h-10 w-10 animate-spin text-blue-500" />

        <h1 className="text-xl font-semibold">
          Verifying your session
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Checking your Discord account and department
          permissions...
        </p>
      </div>
    </div>
  )
}