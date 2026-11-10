import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ArrowRight, Flower2, LoaderCircle, LockKeyhole } from 'lucide-react'
import App from './RealDashboard'
import { supabase } from './lib/supabase'

type Mode = 'login' | 'register' | 'reset' | 'password'
const callbackParams = new URLSearchParams(location.hash.slice(1))
const callbackType = callbackParams.get('type')
const needsPassword = callbackType === 'invite' || callbackType === 'recovery'
const callbackFailed = callbackParams.has('error') || new URLSearchParams(location.search).has('error')

function authError(code?: string) {
  switch (code) {
    case 'invalid_credentials': return 'El correo o la contraseña no son correctos.'
    case 'email_not_confirmed': return 'Confirma tu correo antes de iniciar sesión.'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit': return 'Hay demasiados intentos. Espera unos minutos antes de volver a probar.'
    case 'weak_password': return 'Elige una contraseña más segura, con letras, números y símbolos.'
    case 'same_password': return 'Elige una contraseña diferente a la anterior.'
    default: return 'No se pudo completar la operación. Comprueba tu conexión e inténtalo de nuevo.'
  }
}

export default function AuthGate() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>(needsPassword ? 'password' : 'login')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(callbackFailed ? 'El enlace no es válido o ha caducado. Solicita uno nuevo desde «Recuperar acceso».' : '')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const client = supabase
    if (!client) {
      setLoading(false)
      return
    }
    let active = true
    const { data: { subscription } } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') setMode('password')
      if (event === 'SIGNED_OUT') setMode('login')
    })
    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      setSession(data.session)
      if (sessionError) setError('No se pudo recuperar tu sesión. Intenta iniciar sesión de nuevo.')
      if (needsPassword && !data.session) {
        setMode('reset')
        setError('No se pudo validar el enlace. Solicita un nuevo correo de recuperación.')
      }
      setLoading(false)
    }).catch(() => {
      if (!active) return
      setError('No se pudo conectar con Supabase. Comprueba tu conexión y vuelve a cargar la página.')
      setLoading(false)
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  function changeMode(nextMode: Mode) {
    setMode(nextMode)
    setError('')
    setMessage('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || busy) return
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    if (mode === 'password' && password !== form.get('confirmPassword')) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    const redirectTo = `${location.origin}${import.meta.env.BASE_URL}`
    try {
      if (mode === 'reset') {
        const { error: requestError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
        if (requestError) setError(authError(requestError.code))
        else setMessage('Si el correo tiene una cuenta, recibirás un enlace para establecer una nueva contraseña. Revisa también spam.')
      } else if (mode === 'password') {
        const { error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) setError(authError(updateError.code))
        else setMode('login')
      } else if (mode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })
        if (signUpError) setError(authError(signUpError.code))
        else if (!data.session) setMessage('Revisa tu correo para confirmar el registro. Si ya tienes cuenta, usa «Recuperar acceso».')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) setError(authError(signInError.code))
      }
    } catch {
      setError('No se pudo conectar. Comprueba tu conexión e inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    if (!supabase || busy) return
    setBusy(true)
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
      if (signOutError) setError('No se pudo cerrar la sesión. Inténtalo de nuevo.')
    } catch {
      setError('No se pudo cerrar la sesión. Comprueba tu conexión.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <main className="grid min-h-dvh place-content-center bg-paper"><p role="status" className="flex items-center gap-3 text-sm text-muted"><LoaderCircle className="animate-spin" size={18} /> Comprobando tu sesión…</p></main>

  if (session && mode !== 'password') return <><App onSignOut={() => void signOut()} />{error && <div role="alert" className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md rounded-lg border border-coral bg-paper p-4 text-sm">{error}<button onClick={() => setError('')} className="ml-3 underline">Cerrar</button></div>}</>

  const title = mode === 'password' ? 'Tu nueva contraseña' : mode === 'reset' ? 'Recupera tu acceso' : mode === 'register' ? 'Tu primer paso' : 'Bienvenida a Menta'
  const inputStyle = 'mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 text-base text-ink'

  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-5 py-10">
      <div className="page-enter w-full max-w-sm">
        <div className="mb-10 flex items-center gap-2"><Flower2 size={32} className="text-coral" /><span className="font-display text-3xl">menta</span></div>
        <img src="/myAvatar.png" alt="Avatar de Cecilia Perdomo" className="mb-5 size-16 rounded-full bg-mint object-cover" />
        <h1 className="font-display text-3xl">{title}</h1>
        <p className="mb-7 mt-2 text-sm text-muted">{mode === 'password' ? 'Elige una contraseña para tu cuenta.' : mode === 'reset' ? 'Te enviaremos un enlace a tu correo.' : 'Un espacio para tus finanzas personales.'}</p>
        {!supabase && <p role="alert" className="mb-4 text-sm text-coral">Falta configurar la conexión con Supabase.</p>}
        <form key={mode} onSubmit={handleSubmit} className="space-y-5">
          <fieldset disabled={busy || !supabase} className="space-y-5 disabled:opacity-60">
            {mode !== 'password' && <label className="block text-sm font-medium">Correo electrónico<input name="email" type="email" required autoComplete="email" className={inputStyle} /></label>}
            {mode !== 'reset' && <label className="block text-sm font-medium">{mode === 'password' ? 'Nueva contraseña' : 'Contraseña'}<input name="password" type="password" required minLength={mode === 'login' ? undefined : 8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className={inputStyle} />{mode !== 'login' && <span className="mt-1 block text-xs text-muted">Como mínimo, 8 caracteres.</span>}</label>}
            {mode === 'password' && <label className="block text-sm font-medium">Repetir contraseña<input name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" className={inputStyle} /></label>}
            <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#293e31] px-4 py-3 text-sm font-medium text-white hover:bg-[#405b48]">{busy ? <LoaderCircle size={17} className="animate-spin" /> : <ArrowRight size={17} />}{mode === 'password' ? 'Guardar contraseña' : mode === 'reset' ? 'Enviar enlace' : mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión'}</button>
          </fieldset>
          {error && <p role="alert" className="text-sm text-[#b4452d]">{error}</p>}
          {message && <p role="status" className="rounded-lg bg-mint p-3 text-sm text-[#355c48]">{message}</p>}
        </form>
        {mode !== 'password' && <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm"><button disabled={busy} onClick={() => changeMode(mode === 'login' ? 'reset' : 'login')} className="py-2 text-muted underline underline-offset-4">{mode === 'login' ? 'Recuperar acceso' : 'Volver a iniciar sesión'}</button>{mode === 'login' && <button disabled={busy} onClick={() => changeMode('register')} className="py-2 text-[#355c48] underline underline-offset-4">Crear cuenta</button>}</div>}
        {mode === 'password' && <button disabled={busy} onClick={() => void signOut()} className="mt-4 py-2 text-sm text-muted underline">Cancelar y cerrar sesión</button>}
        <p className="mt-10 flex items-center gap-2 border-t border-line pt-5 text-xs text-muted"><LockKeyhole size={14} /> Cecilia Perdomo · Finanzas personales</p>
      </div>
    </main>
  )
}