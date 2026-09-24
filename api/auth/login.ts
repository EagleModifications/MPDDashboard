import { SignJWT } from "jose"

const secret = () =>
  new TextEncoder().encode(process.env.SESSION_SECRET!)

export async function GET() {
  const state = await new SignJWT({
    purpose: "discord-oauth",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret())

  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.DISCORD_REDIRECT_URI!,
    scope: "identify",
    state,
  })

  return Response.redirect(
    `https://discord.com/oauth2/authorize?${params}`,
  )
}