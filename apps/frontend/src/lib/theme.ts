export type Theme = 'light' | 'dark';

export const THEME_KEY = 'comanda:tema';

// Tema escolhido neste navegador; sem armazenamento, fica claro
export function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

// Aplica na página na hora e tenta lembrar para a próxima visita
export function applyTheme(theme: Theme): void {
  if (theme === 'dark') document.documentElement.dataset.theme = 'dark';
  else document.documentElement.removeAttribute('data-theme');
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // sem armazenamento: vale só até recarregar
  }
}

// Roda no <head> antes de pintar, para o tema escuro não piscar claro
export const THEME_BOOT_SCRIPT = `try{if(localStorage.getItem('${THEME_KEY}')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}`;
