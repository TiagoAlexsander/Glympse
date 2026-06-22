import { useEffect, useState } from 'react';

export function useMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);

    const updateValue = (): void => {
      setIsMobile(mediaQuery.matches);
    };

    updateValue();
    mediaQuery.addEventListener('change', updateValue);

    return () => {
      mediaQuery.removeEventListener('change', updateValue);
    };
  }, [breakpoint]);

  return isMobile;
}