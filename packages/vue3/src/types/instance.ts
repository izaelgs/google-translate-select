import type { ComponentPublicInstance } from 'vue'
import type { GoogleTranslateProps } from './props'

export type GoogleTranslateSelectInstance = ComponentPublicInstance<
  GoogleTranslateProps,
  {
    setLanguage: (code: string) => void
    handleTranslate: (code: string) => void
  }
>
