<template>
  <template v-if="type === 'dropdown'">
    <div
      v-if="hasLanguages"
      ref="googleTranslateSelectEl"
      :class="getClass"
      @mouseenter="handleDropdownShowByHover"
      @mouseleave="handleDropdownHideByHover"
    >
      <div :class="[ns.b('dropdown')]">
        <div :class="[ns.be('dropdown', 'activator')]">
          <div :class="[ns.b('language')]">
            <div :class="[ns.b('flag')]">
              <div :class="[ns.be('flag', selectedLanguageOption.code)]" />
            </div>
            {{ selectedLanguageOption.name }}
          </div>
          <div
            v-if="showArrow"
            :class="[ns.b('icon'), visible ? ns.is('reverse') : '']"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
              <path
                fill="currentColor"
                d="M831.872 340.864 512 652.672 192.128 340.864a30.592 30.592 0 0 0-42.752 0 29.12 29.12 0 0 0 0 41.6L489.664 714.24a32 32 0 0 0 44.672 0l340.288-331.712a29.12 29.12 0 0 0 0-41.728 30.592 30.592 0 0 0-42.752 0z"
              />
            </svg>
          </div>
        </div>
        <transition name="google-translate-select-zoom-in-top">
          <div
            v-show="visible"
            :class="[ns.be('dropdown', 'menu'), dropdownClassName]"
            :style="dropdownStyle"
          >
            <ul>
              <li
                v-for="language in languages"
                :key="`language-${language.code}`"
                :class="[
                  ns.be('dropdown', 'menu__item'),
                  hoveredLanguageCode === language.code ? 'hover' : '',
                  selectedLanguageCode === language.code ? 'selected' : '',
                ]"
                :data-language-code="language.code"
                @click="() => handleTranslate(language.code)"
                @mouseenter.stop="() => (hoveredLanguageCode = language.code)"
                @mouseleave.stop="() => (hoveredLanguageCode = '')"
              >
                <div :class="[ns.b('language')]">
                  <div :class="[ns.b('flag')]">
                    <div :class="[ns.be('flag', language.code)]" />
                  </div>
                  {{ language.name }}
                </div>
              </li>
            </ul>
          </div>
        </transition>
      </div>
    </div>
  </template>
  <template v-else-if="type === 'list'">
    <div v-if="hasLanguages" ref="googleTranslateSelectEl" :class="getClass">
      <div :class="[ns.b('list')]">
        <ul :class="[ns.be('list', 'items')]">
          <li
            v-for="language in languages"
            :key="`language-${language.code}`"
            :class="[
              ns.be('list', 'item'),
              hoveredLanguageCode === language.code ? 'hover' : '',
              selectedLanguageCode === language.code ? 'selected' : '',
            ]"
            :data-language-code="language.code"
            @click="() => handleTranslate(language.code)"
            @mouseenter.stop="() => (hoveredLanguageCode = language.code)"
            @mouseleave.stop="() => (hoveredLanguageCode = '')"
          >
            <div :class="[ns.b('language')]">
              <div :class="[ns.b('flag')]">
                <div :class="[ns.be('flag', language.code)]" />
              </div>
              {{ language.name }}
            </div>
          </li>
        </ul>
      </div>
    </div>
  </template>
  <template v-else-if="type === 'carousel'">
    <div v-if="hasLanguages" ref="googleTranslateSelectEl" :class="getClass">
      <div
        :class="[ns.b('carousel'), { 'is-animating': isAnimating }]"
        tabindex="0"
        role="button"
        :aria-label="`Current language: ${selectedLanguageOption.name}. Press right arrow to switch to next language`"
        @keydown="handleKeyDown"
        @click="handleNextLanguage"
      >
        <div :class="[ns.be('carousel', 'container')]">
          <transition name="google-translate-select-slide" mode="out-in">
            <div
              :key="selectedLanguageOption.code"
              :class="[ns.be('carousel', 'item')]"
            >
              <div :class="[ns.b('language')]">
                <div :class="[ns.b('flag')]">
                  <div :class="[ns.be('flag', selectedLanguageOption.code)]" />
                </div>
                {{ selectedLanguageOption.name }}
              </div>
              <div :class="[ns.be('carousel', 'hint')]">
                Press → to switch language
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </template>
  <div :id="GOOGLE_TRANSLATE_ORIGINAL_DOM_ID" />
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  defineExpose,
  onBeforeUnmount,
  onMounted,
  ref,
  unref,
} from 'vue'
import {
  GoogleTranslateFireEvent,
  createGoogleTranslateJsonpCallback,
  createNamespace,
  createScriptTag,
  createStyleTag,
  getCookie,
  isString,
  removeIcon,
  useMutationObserver,
} from '@google-translate-select/utils'
import {
  GOOGLE_TRANSLATE_COOKIE_NAME,
  GOOGLE_TRANSLATE_JSSDK_URL,
  GOOGLE_TRANSLATE_ORIGINAL_DOM_ID,
  GOOGLE_TRANSLATE_ORIGINAL_SELECT_CLASSNAME,
  GOOGLE_TRANSLATE_STOP_TRANSLATE_CLASSNAME,
} from '@google-translate-select/constants'
import '@google-translate-select/theme-chalk/src/index.scss'
import { googleTranslateProps } from './types'
import type {
  CreateScriptTagReturn,
  UseMutationObserverReturn,
} from '@google-translate-select/utils'

const ns = createNamespace('select')

export default defineComponent({
  name: ns.n,
  inheritAttrs: false,
  props: googleTranslateProps,
  emits: ['select'],
  setup(props, { emit, attrs }) {
    const googleTranslateSelectEl = ref<HTMLElement | null>(null)
    const visible = ref<boolean>(false)
    const selectedLanguageCode = ref<string>('')
    const hoveredLanguageCode = ref<string>('')
    const setTimeoutId = ref<number>(-1)
    const jsonCallbackFnName = ref<string>('')
    const scriptTag = ref<CreateScriptTagReturn | null>(null)
    const googleTranslateOriginSelectObserve =
      ref<Partial<UseMutationObserverReturn> | null>({})
    const htmlAttrLangObserve = ref<Partial<UseMutationObserverReturn> | null>(
      {}
    )
    const isAnimating = ref<boolean>(false)

    const getClass = computed(() => {
      return [ns.b(), GOOGLE_TRANSLATE_STOP_TRANSLATE_CLASSNAME, attrs.class]
    })

    const hasLanguages = computed(
      () => props.languages && props.languages.length
    )

    /** cache current select language */
    const selectedLanguageOption = computed(() => getSelectedLanguageOption())

    /**
     * get current select language
     */
    function getSelectedLanguageOption() {
      const selectedLanguageOption = props.languages.find(
        (language) => language.code === unref(selectedLanguageCode)
      )
      if (selectedLanguageOption) {
        return selectedLanguageOption
      } else {
        const defaultSelectedLanguageOption = props.languages.find(
          (language) => language.code === props.defaultLanguageCode
        )
        return defaultSelectedLanguageOption!
      }
    }

    /**
     * dynamic insert style for GoogleTranslate
     */
    function createStyle() {
      return createStyleTag(
        `body { top: 0 !important; } .skiptranslate { display: none !important; }`
      )
    }

    /**
     * create jsonp callback for GoogleTranslate, when GoogleTranslate loaded callback will be triggered
     */
    function createJsonCallback() {
      const pageLanguage = props.defaultPageLanguageCode
      const { jsonpCallbackName } = createGoogleTranslateJsonpCallback(
        {
          pageLanguage,
        },
        setSelectedLanguageCode
      )
      jsonCallbackFnName.value = jsonpCallbackName
    }

    /**
     * pass jsonp callback to GoogleTranslate
     */
    function createScript() {
      return createScriptTag(
        props.googleScriptUrl.length
          ? `${props.googleScriptUrl}?cb=${unref(jsonCallbackFnName)}`
          : `${GOOGLE_TRANSLATE_JSSDK_URL}?cb=${unref(jsonCallbackFnName)}`
      )
    }

    /**
     * GoogleTranslate init
     */
    function createGoogleTranslate() {
      createStyle()
      createJsonCallback()
      scriptTag.value = createScript()
    }

    /**
     * Triggers translations by observe changes in the DOM of GoogleTranslate's original select.
     *
     * Because the callback function passed in JSONP can only be called after the GOOGLE_TRANSLATE_JSSDK_URL resource is loaded,
     * and the GOOGLE_TRANSLATE_JSSDK_URL will import the resource that generated the original DOM, observe is used here🤓
     */
    function createGoogleTranslateOriginSelectObserve() {
      googleTranslateOriginSelectObserve.value = useMutationObserver(
        document.querySelector(GOOGLE_TRANSLATE_ORIGINAL_SELECT_CLASSNAME)!,
        (records) => {
          records.forEach((record) => {
            if (
              record.addedNodes[0] &&
              (record.addedNodes[0] as HTMLOptionElement).value
            ) {
              if (
                selectedLanguageCode.value ===
                (record.addedNodes[0] as HTMLOptionElement).value
              ) {
                triggerTranslate(
                  (record.addedNodes[0] as HTMLOptionElement).value
                )
              }
            }
          })
        },
        {
          childList: true,
          subtree: true,
        }
      )

      unref(googleTranslateOriginSelectObserve)!.start!()
    }

    /**
     * When GoogleTranslate's original executes, the attribute 'lang' of HTML will have an auto state,
     * in order to overwrite the auto state, we call the 'handleTranslate' again
     */
    function createHtmlAttrLangObserve() {
      htmlAttrLangObserve.value = useMutationObserver(
        document.querySelector('html')!,
        (records) => {
          records.forEach((record) => {
            if (record.attributeName === 'lang') {
              const currentValue = (record.target as HTMLElement).getAttribute(
                'lang'
              )
              const oldValue = record.oldValue
              // 修复auto的中间状态，如果页面当中内容较多，gt会有一个翻译的过程，就会抛出lang = auto，此时我们手动再触发一次翻译覆盖掉上次未进行完的翻译操作
              if (
                oldValue !== currentValue &&
                oldValue &&
                oldValue !== 'auto' &&
                currentValue === 'auto'
              ) {
                handleTranslate(unref(selectedLanguageCode))
              }
            }
          })
          removeIcon()
        },
        {
          attributes: true,
          attributeOldValue: true,
        }
      )

      unref(htmlAttrLangObserve)!.start!()
    }

    /**
     * Simulates the change event of select to manually trigger GoogleTranslate
     *
     * @param select
     */
    function triggerTranslate(select: HTMLSelectElement | string) {
      if (!select) {
        return
      }
      const selectValue = isString(select) ? select : select.value ?? ''
      const googleTranslateOriginalSelectEl = document.querySelector(
        GOOGLE_TRANSLATE_ORIGINAL_SELECT_CLASSNAME
      ) as HTMLSelectElement | null
      const googleTranslateSelectEl = document.querySelector(`.${ns.b()}`)

      if (
        selectValue == props.defaultLanguageCode &&
        selectedLanguageCode.value &&
        selectValue != selectedLanguageCode.value
      ) {
        // const reloadEvent = new Event('reload')

        // window.dispatchEvent(reloadEvent)
        console.log('reload')
        props.reload()
      }

      if (
        !googleTranslateSelectEl ||
        !googleTranslateOriginalSelectEl ||
        googleTranslateSelectEl.innerHTML.length === 0 ||
        googleTranslateOriginalSelectEl.options.length === 0
      ) {
        createGoogleTranslateOriginSelectObserve()
      } else {
        googleTranslateOriginalSelectEl.value = selectValue
        GoogleTranslateFireEvent(googleTranslateOriginalSelectEl, 'change')
        unref(googleTranslateOriginSelectObserve) &&
          unref(googleTranslateOriginSelectObserve)!.stop!()
      }
    }

    /**
     * Determines whether the current select language exists in the props.languages
     *
     * @param code
     */
    function isLanguageCodeInLanguages(code: string) {
      // 如果 code 不存在于语言列表中默认使用英语
      const result = props.languages.find((language) => language.code === code)
      return result ? code : 'en'
    }

    /**
     * Get browser language
     */
    function getBrowserLanguage() {
      const browserLanguage =
        window.navigator.language || document.documentElement.lang || 'en'

      const filterLanguages = ['zh-CN', 'zh-TW']
      if (filterLanguages.every((l) => l !== browserLanguage)) {
        if (browserLanguage.indexOf('-') > -1) {
          return browserLanguage.split('-')[0]
        }
      }
      return browserLanguage
    }

    /**
     * After triggering GoogleTranslate Translate, a cookie called 'googtrans' is generated, such as '/en/tr'
     */
    function getGoogleCookieLanguage() {
      const googleTranslateCookie = getCookie(GOOGLE_TRANSLATE_COOKIE_NAME)

      if (googleTranslateCookie) {
        const googleTranslateCookieResult = googleTranslateCookie.split('/')
        return googleTranslateCookieResult[2]
          ? googleTranslateCookieResult[2]
          : 'en'
      } else {
        return ''
      }
    }

    /**
     * Use browser language、cookie 'googtrans' to get language code
     */
    function setSelectedLanguageCode() {
      const isFetchBrowserLanguageOpen = props.fetchBrowserLanguage
      const browserLanguage = isFetchBrowserLanguageOpen
        ? isLanguageCodeInLanguages(getBrowserLanguage())
        : ''
      const googleCookieLanguage = getGoogleCookieLanguage()
      const isGoogleCookieLanguageExist = !!googleCookieLanguage

      const handleDefaultLanguage = () => {
        if (props.defaultLanguageCode) {
          return props.defaultLanguageCode
        } else {
          return 'en'
        }
      }

      const handleBrowserLanguageInLanguages = () => {
        const isBrowserLanguageInLanguages = !!props.languages.find(
          (language) => language.code === browserLanguage
        )
        if (isBrowserLanguageInLanguages) {
          return browserLanguage
        } else {
          return handleDefaultLanguage()
        }
      }

      const handleGoogleCookieLanguageInLanguages = () => {
        const isGoogleCookieLanguageInLanguages = !!props.languages.find(
          (language) => language.code === googleCookieLanguage
        )
        if (isGoogleCookieLanguageInLanguages) {
          return googleCookieLanguage
        } else {
          return handleDefaultLanguage()
        }
      }

      let selectedCode = handleDefaultLanguage()
      if (!isGoogleCookieLanguageExist) {
        // 首次
        if (isFetchBrowserLanguageOpen)
          selectedCode = handleBrowserLanguageInLanguages()
      } else {
        // 非首次
        // 越过浏览器语言判断直接去列表中匹配
        selectedCode = handleGoogleCookieLanguageInLanguages()
      }

      handleTranslate(selectedCode)
    }

    function handleTranslate(code: string) {
      triggerTranslate(code)
      selectedLanguageCode.value = code

      emit('select', getSelectedLanguageOption())
    }

    function clearSettimeout() {
      clearTimeout(unref(setTimeoutId))
      setTimeoutId.value = -1
    }

    function handleDropdownShowByHover(e: Event) {
      if (props.trigger === 'hover') {
        clearSettimeout()
        setTimeoutId.value = window.setTimeout(() => {
          const target = e.target as HTMLElement
          if (
            unref(googleTranslateSelectEl) &&
            unref(googleTranslateSelectEl)?.contains(target)
          ) {
            visible.value = true
          }
        }, 0)
      }
    }

    function handleDropdownHideByHover() {
      if (props.trigger === 'hover') {
        clearSettimeout()
        setTimeoutId.value = window.setTimeout(() => {
          visible.value = false
        }, props.animateTimeout)
      }
    }

    function handleDropdownShowOrHideByClick(e: Event) {
      const target = e.target as HTMLElement
      if (
        unref(googleTranslateSelectEl) &&
        unref(googleTranslateSelectEl)?.contains(target)
      ) {
        visible.value = true
      } else {
        visible.value = false
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (props.type === 'carousel') {
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          handleNextLanguage()
        }
      }
    }

    function handleNextLanguage() {
      if (!props.languages.length || isAnimating.value) return

      const currentIndex = props.languages.findIndex(
        (language) => language.code === selectedLanguageCode.value
      )

      // If current language not found, start from first language
      if (currentIndex === -1) {
        handleTranslate(props.languages[0].code)
        return
      }

      // If it's the last language, go to first; otherwise go to next
      const nextIndex =
        currentIndex === props.languages.length - 1 ? 0 : currentIndex + 1

      // Set animation state
      isAnimating.value = true

      // Handle translate with animation delay
      setTimeout(() => {
        handleTranslate(props.languages[nextIndex].code)
        setTimeout(() => {
          isAnimating.value = false
        }, 300) // Animation duration
      }, 50)
    }

    onMounted(() => {
      createGoogleTranslate()
      createHtmlAttrLangObserve()

      if (props.trigger === 'click')
        document.addEventListener('click', handleDropdownShowOrHideByClick)

      if (props.type === 'carousel')
        document.addEventListener('keydown', handleKeyDown)
    })

    onBeforeUnmount(() => {
      if (unref(googleTranslateOriginSelectObserve)?.stop) {
        unref(googleTranslateOriginSelectObserve)!.stop!()
      }

      if (unref(htmlAttrLangObserve)?.stop) {
        unref(htmlAttrLangObserve)!.stop!()
      }

      if (unref(scriptTag)?.unload) {
        unref(scriptTag)!.unload!()
      }
      if (props.trigger === 'click')
        document.removeEventListener('click', handleDropdownShowOrHideByClick)

      if (props.type === 'carousel')
        document.removeEventListener('keydown', handleKeyDown)
    })

    defineExpose({
      handleTranslate,
    })

    return {
      ns,
      googleTranslateSelectEl,
      visible,
      selectedLanguageCode,
      hoveredLanguageCode,
      isAnimating,
      getClass,
      hasLanguages,
      selectedLanguageOption,
      handleTranslate,
      handleDropdownShowByHover,
      handleDropdownHideByHover,
      handleKeyDown,
      handleNextLanguage,
      GOOGLE_TRANSLATE_ORIGINAL_DOM_ID,
    }
  },
})
</script>
