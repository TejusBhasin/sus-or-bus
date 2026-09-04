import React from 'react';
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes';

export function ThemeProvider({ children }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}

export function useTheme() {
  const { resolvedTheme, setTheme } = useNextTheme();
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light';
  return {
    theme,
    toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark')
  };
}