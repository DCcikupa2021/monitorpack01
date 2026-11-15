import { writable } from 'svelte/store'

// localStorage-persisted prefs, shared by Topbar dropdown + halaman Pengaturan.
// Subscribe di module level: terapkan ke <html> sekali saat load, sebelum paint.

const THEME_KEY = 'pack01_theme'
const FONT_KEY = 'pack01_font_size'
const NOTIF_KEY = 'pack01_notif'

function persisted(key, initial) {
  let start = initial
  try {
    const v = localStorage.getItem(key)
    if (v !== null) start = v
  } catch {}
  const store = writable(start)
  store.subscribe((v) => {
    try {
      localStorage.setItem(key, v)
    } catch {}
  })
  return store
}

export const theme = persisted(THEME_KEY, 'light') // 'light' | 'dark'
export const fontSize = persisted(FONT_KEY, 'md') // 'sm' | 'md' | 'lg'
export const notifications = persisted(NOTIF_KEY, '1') // '1' | '0'

theme.subscribe((v) => {
  document.documentElement.classList.toggle('dark', v === 'dark')
})

fontSize.subscribe((v) => {
  document.documentElement.setAttribute('data-font-size', v)
})
