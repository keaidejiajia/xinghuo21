import { useState, useEffect } from 'react';

export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    const forced = localStorage.getItem('app_mobile_view');
    if (forced !== null) return forced === 'true';
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const check = () => {
      const forced = localStorage.getItem('app_mobile_view');
      if (forced !== null) {
        setIsMobile(forced === 'true');
      } else {
        setIsMobile(window.innerWidth < 768);
      }
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('mobile-view-changed', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('mobile-view-changed', check);
    };
  }, []);

  return isMobile;
}

export function toggleMobileView(): boolean {
  const current = localStorage.getItem('app_mobile_view') === 'true';
  const next = !current;
  localStorage.setItem('app_mobile_view', String(next));
  document.documentElement.classList.toggle('mobile-view', next);
  window.dispatchEvent(new Event('mobile-view-changed'));
  return next;
}
