export async function GET(request: Request) {
  const url = new URL(request.url)

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${url.origin}/`,
      "Set-Cookie":
        "mpd_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
    },
  })
}