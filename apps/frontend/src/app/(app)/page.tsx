'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import { homeFor } from '@/constants'
import Skeleton from '@/components/ui/Skeleton'

// "/" leva cada perfil para a sua tela inicial
export default function HomePage() {
  const { user } = useSession()
  const router = useRouter()

  useEffect(() => {
    router.replace(homeFor(user.role))
  }, [router, user.role])

  return <Skeleton />
}
