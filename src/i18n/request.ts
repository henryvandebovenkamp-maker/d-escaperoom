// PATH: src/i18n/request.ts
import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing';
import {hasLocale} from 'next-intl';

export default getRequestConfig(async ({requestLocale}) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? (requested as typeof routing.locales[number])
    : routing.defaultLocale;

  // berichten uit src/messages/<locale>.json
  const messages = (await import(`../messages/${locale}.json`)).default;
  return {locale, messages};
});
