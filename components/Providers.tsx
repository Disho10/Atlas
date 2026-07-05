'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Product } from '@/lib/mockData';

// ---------------------------------------------------------------------------
// THEME — dark/light, auto-detected from system preference, toggleable,
// applied site-wide via the `dark` class on <html>.
// ---------------------------------------------------------------------------
type Theme = 'light' | 'dark';
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'light', toggle: () => {} });
export const useTheme = () => useContext(ThemeCtx);

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const stored = window.localStorage.getItem('atlas-theme') as Theme | null;
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    setTheme(stored ?? system);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('atlas-theme', theme);
  }, [theme]);

  return (
    <ThemeCtx.Provider value={{ theme, toggle: () => setTheme(t => (t === 'light' ? 'dark' : 'light')) }}>
      {children}
    </ThemeCtx.Provider>
  );
}

// ---------------------------------------------------------------------------
// CURRENCY — USD / LBP display toggle
// ---------------------------------------------------------------------------
type Currency = 'USD' | 'LBP';
const CurrencyCtx = createContext<{ currency: Currency; setCurrency: (c: Currency) => void }>({
  currency: 'USD', setCurrency: () => {},
});
export const useCurrency = () => useContext(CurrencyCtx);

function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('USD');
  return <CurrencyCtx.Provider value={{ currency, setCurrency }}>{children}</CurrencyCtx.Provider>;
}

// ---------------------------------------------------------------------------
// CART
// ---------------------------------------------------------------------------
export type CartLine = { product: Product; size: string; qty: number };
const CartCtx = createContext<{
  lines: CartLine[];
  add: (p: Product, size: string) => void;
  remove: (productId: string, size: string) => void;
  setQty: (productId: string, size: string, qty: number) => void;
  count: number;
  subtotal: number;
}>({ lines: [], add: () => {}, remove: () => {}, setQty: () => {}, count: 0, subtotal: 0 });
export const useCart = () => useContext(CartCtx);

function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const add = (product: Product, size: string) => {
    setLines(prev => {
      const existing = prev.find(l => l.product.id === product.id && l.size === size);
      if (existing) {
        return prev.map(l => (l === existing ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { product, size, qty: 1 }];
    });
  };

  const remove = (productId: string, size: string) => {
    setLines(prev => prev.filter(l => !(l.product.id === productId && l.size === size)));
  };

  const setQty = (productId: string, size: string, qty: number) => {
    setLines(prev => prev.map(l => (l.product.id === productId && l.size === size ? { ...l, qty: Math.max(1, qty) } : l)));
  };

  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.qty * l.product.price, 0);

  return <CartCtx.Provider value={{ lines, add, remove, setQty, count, subtotal }}>{children}</CartCtx.Provider>;
}

// ---------------------------------------------------------------------------
// WISHLIST
// ---------------------------------------------------------------------------
const WishlistCtx = createContext<{ ids: string[]; toggle: (id: string) => void }>({ ids: [], toggle: () => {} });
export const useWishlist = () => useContext(WishlistCtx);

function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return; // prototype mode — stays local-only
    // Lazy import so this file doesn't pull the Supabase client into every
    // page load if you haven't set up env vars yet.
    import('@/lib/supabase/client').then(async ({ createClient }) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from('wishlist_items').select('product_id').eq('user_id', user.id);
      if (data) setIds(data.map(d => d.product_id));
    });
  }, []);

  const toggle = async (id: string) => {
    setIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    if (!userId) return; // guest — stays local-only for this session
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (ids.includes(id)) {
      await supabase.from('wishlist_items').delete().eq('user_id', userId).eq('product_id', id);
    } else {
      await supabase.from('wishlist_items').insert({ user_id: userId, product_id: id });
    }
  };

  return <WishlistCtx.Provider value={{ ids, toggle }}>{children}</WishlistCtx.Provider>;
}

// ---------------------------------------------------------------------------
// AUTH — tracks whether someone is signed in, live. Drives the header's
// "Sign in" button vs. account icon. In prototype mode (no Supabase env vars)
// it simply reports signed-out.
// ---------------------------------------------------------------------------
const AuthCtx = createContext<{ signedIn: boolean; loading: boolean }>({ signedIn: false, loading: true });
export const useAuth = () => useContext(AuthCtx);

function AuthProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setLoading(false);
      return;
    }
    let unsub: (() => void) | undefined;
    import('@/lib/supabase/client').then(async ({ createClient }) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setSignedIn(!!user);
      setLoading(false);
      // Keep the header in sync when the user signs in or out anywhere.
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setSignedIn(!!session?.user);
      });
      unsub = () => data.subscription.unsubscribe();
    });
    return () => unsub?.();
  }, []);

  return <AuthCtx.Provider value={{ signedIn, loading }}>{children}</AuthCtx.Provider>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <CartProvider>
          <WishlistProvider>
            <AuthProvider>{children}</AuthProvider>
          </WishlistProvider>
        </CartProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}
