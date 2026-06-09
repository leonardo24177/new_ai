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

  const path = request.nextUrl.pathname

  // Percorsi che richiedono autenticazione
  const protectedPaths = ['/chat', '/profile', '/admin', '/in-attesa']
  const isProtected = protectedPaths.some(p => path.startsWith(p))

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && (path === '/login' || path === '/register')) {
    return NextResponse.redirect(new URL('/chat', request.url))
  }

  // Controllo approvazione: /chat e /profile richiedono app_metadata.approvato = true
  // /admin ha il suo controllo interno; /in-attesa e /onboarding sono sempre accessibili
  const approvalPaths = ['/chat', '/profile']
  const needsApproval = approvalPaths.some(p => path.startsWith(p))

  if (user && needsApproval && user.app_metadata?.approvato !== true) {
    return NextResponse.redirect(new URL('/in-attesa', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/chat/:path*', '/profile/:path*', '/admin/:path*', '/login', '/register', '/onboarding', '/forgot-password', '/reset-password', '/in-attesa'],
}
