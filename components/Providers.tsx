'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Product } from '@/lib/mockData';
import { calcSubtotal } from '@/lib/cart-math';

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
export type CartLine = { product: Product; size: string; qty: number; variant?: string; variantPrice?: number };
const CART_STORAGE_KEY = 'atlas-cart';
const CartCtx = createContext<{
  lines: CartLine[];
  add: (p: Product, size: string, variant?: string, variantPrice?: number) => void;
  remove: (productId: string, size: string) => void;
  setQty: (productId: string, size: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  hydrated: boolean;
}>({ lines: [], add: () => {}, remove: () => {}, setQty: () => {}, clear: () => {}, count: 0, subtotal: 0, hydrated: false });
export const useCart = () => useContext(CartCtx);

function CartProvider({ children }: { children: ReactNode }) {
  // Was pure in-memory useState — any page refresh, closed tab, or a mobile
  // browser reclaiming a backgrounded tab (routine on iOS/Android) silently
  // wiped the entire cart with zero warning. Persisting to localStorage,
  // same pattern already used for theme. Hydration happens in an effect
  // (not the initial useState) since localStorage isn't available during
  // SSR — the first render is always empty on both server and client, so
  // there's no hydration mismatch, just a one-frame flash before real data
  // loads in.
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CART_STORAGE_KEY);
      if (stored) setLines(JSON.parse(stored));
    } catch {
      // Corrupted or unavailable storage — just start with an empty cart
      // rather than crash the app over it.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return; // don't overwrite real stored data with the empty initial state
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage full or unavailable (e.g. Safari private mode) — cart still
      // works for the current session, it just won't survive a refresh.
    }
  }, [lines, hydrated]);

  const add = (product: Product, size: string, variant?: string, variantPrice?: number) => {
    setLines(prev => {
      const existing = prev.find(l => l.product.id === product.id && l.size === size && l.variant === variant);
      if (existing) {
        return prev.map(l => (l === existing ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { product, size, qty: 1, variant, variantPrice }];
    });
  };

  const remove = (productId: string, size: string) => {
    setLines(prev => prev.filter(l => !(l.product.id === productId && l.size === size)));
  };

  const setQty = (productId: string, size: string, qty: number) => {
    setLines(prev => prev.map(l => (l.product.id === productId && l.size === size ? { ...l, qty: Math.max(1, qty) } : l)));
  };

  // Called after a successful checkout — was missing entirely, so a placed
  // order left the same items sitting in the cart. Refreshing /cart showed
  // items the customer already bought, and nothing stopped a resubmit from
  // creating a genuine duplicate order for the same items.
  const clear = () => setLines([]);

  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = calcSubtotal(lines);

  // Snapshot the cart to the DB (for the 24h recovery email) whenever it
  // changes, debounced. Only for signed-in users, and only when non-empty.
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || lines.length === 0) return;
    const t = setTimeout(() => {
      import('@/lib/supabase/client').then(async ({ createClient }) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const items = lines.map(l => ({ id: l.product.id, name: l.product.name, size: l.size, qty: l.qty, price: l.product.price }));
        // Upsert one open cart per user (delete prior open, insert fresh).
        await supabase.from('abandoned_carts').delete().eq('user_id', user.id).is('recovered_at', null).is('reminded_at', null);
        await supabase.from('abandoned_carts').insert({ user_id: user.id, email: user.email, items });
      });
    }, 3000);
    return () => clearTimeout(t);
  }, [lines]);

  return <CartCtx.Provider value={{ lines, add, remove, setQty, clear, count, subtotal, hydrated }}>{children}</CartCtx.Provider>;
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
type StaffRole = 'customer' | 'admin' | 'manager' | 'owner';
const AuthCtx = createContext<{ signedIn: boolean; loading: boolean; role: StaffRole; isStaff: boolean }>({
  signedIn: false, loading: true, role: 'customer', isStaff: false,
});
export const useAuth = () => useContext(AuthCtx);

function AuthProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<StaffRole>('customer');

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setLoading(false);
      return;
    }
    let unsub: (() => void) | undefined;
    import('@/lib/supabase/client').then(async ({ createClient }) => {
      const supabase = createClient();

      const loadRole = async (userId: string | undefined) => {
        if (!userId) { setRole('customer'); return; }
        const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
        setRole((data?.role as StaffRole) ?? 'customer');
      };

      const { data: { user } } = await supabase.auth.getUser();
      setSignedIn(!!user);
      await loadRole(user?.id);
      setLoading(false);
      // Keep the header in sync when the user signs in or out anywhere.
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setSignedIn(!!session?.user);
        loadRole(session?.user?.id);
      });
      unsub = () => data.subscription.unsubscribe();
    });
    return () => unsub?.();
  }, []);

  const isStaff = role === 'admin' || role === 'manager' || role === 'owner';
  return <AuthCtx.Provider value={{ signedIn, loading, role, isStaff }}>{children}</AuthCtx.Provider>;
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
