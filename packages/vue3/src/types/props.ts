import { GOOGLE_TRANSLATE_SELECT_LANGUAGES } from '@google-translate-select/constants'
import type { Language as ILanguage } from '@google-translate-select/constants'
import type { CSSProperties, ExtractPropTypes, PropType } from 'vue'

export const googleTranslateProps = {
  /** select dropdown option */
  languages: {
    type: Array as PropType<ILanguage[]>,
    default: () => GOOGLE_TRANSLATE_SELECT_LANGUAGES,
  },
  /** select input default language*/
  defaultLanguageCode: {
    type: String,
    default: 'en',
  },
  /** page(browser) content language */
  defaultPageLanguageCode: {
    type: String,
    default: 'en',
  },
  /** get browser default language  */
  fetchBrowserLanguage: {
    type: Boolean,
    default: true,
  },
  /** select dropdown animate */
  animateTimeout: {
    type: Number,
    default: 150,
  },
  dropdownClassName: {
    type: String,
    default: '',
  },
  dropdownStyle: {
    type: Object as PropType<CSSProperties>,
    default: () => ({}),
  },
  showArrow: {
    type: Boolean,
    default: true,
  },
  trigger: {
    type: String as PropType<'click' | 'hover'>,
    default: 'hover',
  },
  googleScriptUrl: {
    type: String,
    default: '',
  },
  reload: {
    type: Function as PropType<() => void>,
    default: () => {
      console.log('reload is not defined')
    },
  },
  type: {
    type: String as PropType<'dropdown' | 'list'>,
    default: 'dropdown',
  },
} as const

export type GoogleTranslateProps = ExtractPropTypes<typeof googleTranslateProps>

export type Language = GoogleTranslateProps['languages'][number]
