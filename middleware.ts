import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Redirige al login se non autenticato e sta cercando di accedere all'app
  if (!user && request.nextUrl.pathname.startsWith('/chat')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirige alla chat se già autenticato e sta cercando login/register
  if (user && (
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/register'
  )) {
    return NextResponse.redirect(new URL('/chat', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/chat/:path*', '/login', '/register', '/onboarding', '/forgot-password', '/reset-password'],
}
