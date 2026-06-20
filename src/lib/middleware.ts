import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/agency') || pathname.startsWith('/admin')) {
    let response = NextResponse.next({
      request: { headers: request.headers },
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            response = NextResponse.next()
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            response = NextResponse.next()
            response.cookies.delete({ name, ...options })
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/agency/:path*', '/admin/:path*'],
}