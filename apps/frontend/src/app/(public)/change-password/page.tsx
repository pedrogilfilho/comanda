'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PASSWORD_MIN_LENGTH, ROLE_LABEL, passwordProblem } from '@comanda/shared'
import { changePassword, getMe, type LoggedUser } from '@/services/auth'
import { errorMessage, tokenStore } from '@/services/http'
import PasswordInput from '@/components/ui/PasswordInput'

const fieldStyle = (hasError: boolean) => ({
  background: 'rgba(255,249,242,0.07)',
  border: hasError ? '1.5px solid #d9534f' : '1.5px solid rgba(255,249,242,0.12)',
  color: '#faf6ef',
})

export default function ChangePasswordPage() {
  const router = useRouter()
  const [user, setUser] = useState<LoggedUser | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    if (!tokenStore.get()) {
      router.replace('/login')
      return
    }
    getMe()
      .then(setUser)
      .catch(() => router.replace('/login'))
  }, [router])

  // Primeiro acesso: a senha inicial já foi digitada no login, então não pedimos de novo
  const firstAccess = user?.needsPasswordChange ?? false

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')

    if (!firstAccess && !currentPassword) {
      setPasswordError('Digite a senha atual')
      return
    }
    const problem = passwordProblem(newPassword)
    if (problem) {
      setPasswordError(problem)
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem')
      return
    }

    setLoading(true)
    try {
      await changePassword(newPassword, firstAccess ? undefined : currentPassword)
      toast.success('Senha alterada')
      router.replace('/')
    } catch (error) {
      setPasswordError(errorMessage(error, 'Não foi possível alterar a senha'))
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-8"
         style={{ background: 'linear-gradient(160deg, #1e140d 0%, #2e1e10 50%, #3a2516 100%)' }}>

      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
             style={{ background: 'rgba(196,92,42,0.15)', border: '1px solid rgba(196,92,42,0.3)' }}>
          <span className="text-4xl" aria-hidden>🔐</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-[#faf6ef]" style={{ fontFamily: 'Georgia, serif' }}>
          Alterar senha
        </h1>
        <p className="text-[#a08060] mt-2 text-sm">{firstAccess ? 'Troca obrigatória no primeiro acesso' : 'Escolha uma senha nova'}</p>
      </div>

      <div className="w-full max-w-sm rounded-2xl p-5 sm:p-6"
           style={{ background: 'rgba(255,249,242,0.05)', border: '1px solid rgba(255,249,242,0.1)' }}>

        <div className="mb-6 p-4 rounded-xl"
             style={{ background: 'rgba(255,249,242,0.04)', border: '1px solid rgba(255,249,242,0.1)' }}>
          <p className="text-xs font-medium" style={{ color: '#a08060' }}>Usuário conectado</p>
          <p className="text-lg font-bold text-[#faf6ef] mt-1">{user.name}</p>
          <p className="text-xs mt-2" style={{ color: '#a08060' }}>{ROLE_LABEL[user.role] ?? user.role}</p>
        </div>

        <div className="mb-6 p-4 rounded-xl"
             style={{ background: 'rgba(61,92,58,0.15)', border: '1px solid rgba(61,92,58,0.3)' }}>
          <p className="text-sm font-medium text-[#9cc298]">Requisitos da senha</p>
          <ul className="text-xs mt-2 space-y-1" style={{ color: '#9cc298' }}>
            <li>Pelo menos {PASSWORD_MIN_LENGTH} caracteres</li>
            <li>Não pode ter só números</li>
            <li>Pode ter letras, números e símbolos</li>
          </ul>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          {!firstAccess && (
            <div>
              <label htmlFor="current-password" className="text-xs font-semibold block mb-1.5" style={{ color: '#a08060' }}>
                Senha atual
              </label>
              <PasswordInput
                id="current-password"
                placeholder="Digite a senha atual"
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError('') }}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={fieldStyle(!!passwordError)}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
          )}

          <div>
            <label htmlFor="new-password" className="text-xs font-semibold block mb-1.5" style={{ color: '#a08060' }}>
              Nova senha
            </label>
            <PasswordInput
              id="new-password"
              placeholder="Digite a nova senha"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPasswordError('') }}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={fieldStyle(!!passwordError)}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="text-xs font-semibold block mb-1.5" style={{ color: '#a08060' }}>
              Confirmar nova senha
            </label>
            <PasswordInput
              id="confirm-password"
              placeholder="Repita a nova senha"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError('') }}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={fieldStyle(!!passwordError)}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          {passwordError && (
            <div role="alert" className="p-3 rounded-xl text-xs text-white"
                 style={{ background: 'rgba(217,83,79,0.2)', border: '1px solid rgba(217,83,79,0.3)' }}>
              {passwordError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95 mt-6"
            style={{
              background: loading ? 'rgba(196,92,42,0.4)' : '#c45c2a',
              color: '#faf6ef',
              cursor: loading ? 'wait' : 'pointer'
            }}
          >
            {loading ? 'Alterando…' : 'Alterar senha'}
          </button>

          {!firstAccess && (
            <button type="button" onClick={() => router.back()} className="w-full text-xs mt-1" style={{ color: '#a08060' }}>
              Voltar
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
