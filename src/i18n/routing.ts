// PATH: src/i18n/routing.ts
import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['nl', 'en', 'de', 'es'],
  defaultLocale: 'nl'
});
