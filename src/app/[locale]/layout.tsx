// PATH: src/app/[locale]/layout.tsx
import {NextIntlClientProvider, hasLocale} from 'next-intl';
import {getMessages, setRequestLocale} from 'next-intl/server';
import {routing} from '@/i18n/routing';
import CookieConsent from '@/components/CookieConsent';
import Footer from '@/components/Footer';

type Props = {
  children: React.ReactNode;
  params: Promise<{locale: string}>; // <-- Promise!
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({children, params}: Props) {
  const {locale} = await params;            // <-- await params
  if (!hasLocale(routing.locales, locale)) {
    throw new Error('Unsupported locale');
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <CookieConsent />
      {children}
      <Footer />
    </NextIntlClientProvider>
  );
}
