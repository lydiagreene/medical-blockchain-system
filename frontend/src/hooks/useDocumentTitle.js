import { useEffect } from 'react'

export default function useDocumentTitle(title) {
  useEffect(() => {
    const prev = document.title
    document.title = title ? `${title} | VerifyDoc Uganda` : 'VerifyDoc Uganda — Blockchain Medical Credentials'
    return () => { document.title = prev }
  }, [title])
}
