import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Korumalı sayfalar - giriş yapılmamışsa login'e yönlendir
  const protectedPaths = ['/feed', '/profil', '/etkinlikler', '/bildirimler', '/ayarlar', '/kesfet', '/ara', '/admin']
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/giris'
    return NextResponse.redirect(url)
  }

  // Kullanıcı onay kontrolü (admin hariç korumalı sayfalarda)
  if (user && isProtectedPath && !request.nextUrl.pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_approved, role')
      .eq('id', user.id)
      .single()

    // Admin ve moderatörler her zaman erişebilir
    if (profile && profile.role !== 'admin' && profile.role !== 'moderator') {
      // Onaylanmamış kullanıcıları bekle sayfasına yönlendir
      if (!profile.is_approved && !request.nextUrl.pathname.startsWith('/beklemede')) {
        const url = request.nextUrl.clone()
        url.pathname = '/beklemede'
        return NextResponse.redirect(url)
      }
    }
  }

  // Beklemede sayfasındaki kullanıcı onaylanmışsa feed'e yönlendir
  if (user && request.nextUrl.pathname.startsWith('/beklemede')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_approved')
      .eq('id', user.id)
      .single()

    if (profile?.is_approved) {
      const url = request.nextUrl.clone()
      url.pathname = '/feed'
      return NextResponse.redirect(url)
    }
  }

  // Giriş yapmış kullanıcı auth sayfalarına gitmeye çalışırsa feed'e yönlendir
  const authPaths = ['/giris', '/kayit']
  const isAuthPath = authPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isAuthPath && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/feed'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
