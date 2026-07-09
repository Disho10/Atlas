// Core translation dictionary. Scope, deliberately: navigation, footer,
// language switching, and the most common cross-page actions (sign in,
// cart, checkout labels, search). This is NOT full-site coverage — product
// descriptions, the admin panel, and most account subpages are still
// English-only. Extending coverage means adding more keys here and calling
// t('your.key') wherever that string is rendered; the provider/switcher/RTL
// plumbing already supports it, this file is the bottleneck to extend.
export type Locale = 'en' | 'ar';

export const translations = {
  en: {
    'nav.allLeagues': 'All Leagues',
    'nav.sportswear': 'Sportswear',
    'nav.aboutUs': 'About Us',
    'nav.myAccount': 'My Account',
    'nav.signIn': 'Sign in',
    'nav.staffPanel': 'Staff Panel',
    'nav.search': 'Search',
    'nav.wishlist': 'Wishlist',
    'nav.account': 'Account',
    'nav.cart': 'Cart',
    'nav.darkMode': 'Dark mode',
    'nav.lightMode': 'Light mode',
    'nav.freeShipping': 'Free shipping on orders over $110 · Cash on delivery across Lebanon',
    'nav.searchPlaceholder': 'Search by name, team, player, or nationality',
    'nav.language': 'العربية',

    'footer.tagline': 'Football culture, carried. Authentic kits and match-day gear for every league, shipped across Lebanon.',
    'footer.leagues': 'Leagues',
    'footer.support': 'Support',
    'footer.trackOrder': 'Track an order',
    'footer.returns': 'Returns & exchanges',
    'footer.whatsapp': 'WhatsApp us',
    'footer.matchResults': 'Match results',
    'footer.atlas': 'Atlas',
    'footer.ourStory': 'Our story',
    'footer.staffPanel': 'Staff panel',
    'footer.rights': 'All rights reserved.',
    'footer.terms': 'Terms & Conditions',
    'footer.privacy': 'Privacy',

    'cart.title': 'Your cart',
    'cart.empty': 'Your cart is empty.',
    'cart.continueShopping': 'Continue shopping',
    'cart.subtotal': 'Subtotal',
    'cart.checkout': 'Checkout',
    'cart.remove': 'Remove',

    'checkout.title': 'Checkout',
    'checkout.name': 'Full name',
    'checkout.phone': 'Phone number',
    'checkout.address': 'Delivery address',
    'checkout.city': 'City',
    'checkout.email': 'Email (optional)',
    'checkout.paymentMethod': 'Payment method',
    'checkout.placeOrder': 'Place order',
    'checkout.cod': 'Cash on Delivery',
    'checkout.card': 'Card',

    'product.addToCart': 'Add to cart',
    'product.outOfStock': 'Out of stock',
    'product.notifyMe': 'Notify me',
  },
  ar: {
    'nav.allLeagues': 'كل الدوريات',
    'nav.sportswear': 'ملابس رياضية',
    'nav.aboutUs': 'من نحن',
    'nav.myAccount': 'حسابي',
    'nav.signIn': 'تسجيل الدخول',
    'nav.staffPanel': 'لوحة الموظفين',
    'nav.search': 'بحث',
    'nav.wishlist': 'المفضلة',
    'nav.account': 'الحساب',
    'nav.cart': 'السلة',
    'nav.darkMode': 'الوضع الداكن',
    'nav.lightMode': 'الوضع الفاتح',
    'nav.freeShipping': 'شحن مجاني للطلبات فوق 110$ · الدفع عند الاستلام في جميع أنحاء لبنان',
    'nav.searchPlaceholder': 'ابحث بالاسم أو الفريق أو اللاعب أو الجنسية',
    'nav.language': 'English',

    'footer.tagline': 'ثقافة كرة القدم، محمولة. قمصان أصلية وعتاد يوم المباراة لكل الدوريات، يصل إلى جميع أنحاء لبنان.',
    'footer.leagues': 'الدوريات',
    'footer.support': 'الدعم',
    'footer.trackOrder': 'تتبع الطلب',
    'footer.returns': 'الإرجاع والاستبدال',
    'footer.whatsapp': 'راسلنا عبر واتساب',
    'footer.matchResults': 'نتائج المباريات',
    'footer.atlas': 'أطلس',
    'footer.ourStory': 'قصتنا',
    'footer.staffPanel': 'لوحة الموظفين',
    'footer.rights': 'جميع الحقوق محفوظة.',
    'footer.terms': 'الشروط والأحكام',
    'footer.privacy': 'الخصوصية',

    'cart.title': 'سلتك',
    'cart.empty': 'سلتك فارغة.',
    'cart.continueShopping': 'متابعة التسوق',
    'cart.subtotal': 'المجموع الفرعي',
    'cart.checkout': 'إتمام الشراء',
    'cart.remove': 'إزالة',

    'checkout.title': 'إتمام الشراء',
    'checkout.name': 'الاسم الكامل',
    'checkout.phone': 'رقم الهاتف',
    'checkout.address': 'عنوان التوصيل',
    'checkout.city': 'المدينة',
    'checkout.email': 'البريد الإلكتروني (اختياري)',
    'checkout.paymentMethod': 'طريقة الدفع',
    'checkout.placeOrder': 'إتمام الطلب',
    'checkout.cod': 'الدفع عند الاستلام',
    'checkout.card': 'بطاقة',

    'product.addToCart': 'أضف إلى السلة',
    'product.outOfStock': 'نفدت الكمية',
    'product.notifyMe': 'أعلمني',
  },
} as const;

export type TranslationKey = keyof typeof translations['en'];

// For Server Components (like Footer) that can't use the client-side
// LocaleProvider context — read the cookie directly and look up strings.
export function translate(locale: Locale, key: TranslationKey): string {
  return translations[locale][key] ?? translations.en[key] ?? key;
}
