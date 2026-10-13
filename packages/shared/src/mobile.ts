/**
 * Mobile number helpers. Numbers are stored in E.164 form (+919876543210) so they
 * can be used directly for WhatsApp links. A bare 10-digit number is assumed Indian.
 */

export function normalizeMobile(input: string, defaultCountryCode = '91'): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (hasPlus) {
    return digits.length >= 10 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (digits.length === 10) {
    return /^[6-9]/.test(digits) || defaultCountryCode !== '91' ? `+${defaultCountryCode}${digits}` : null;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return normalizeMobile(digits.slice(1), defaultCountryCode);
  }
  if (digits.length === 12 && digits.startsWith(defaultCountryCode)) return `+${digits}`;
  return null;
}

/** Digits only, as required by https://wa.me/<number>. */
export function whatsappNumber(mobile: string): string {
  return mobile.replace(/\D/g, '');
}

/** "+919876543210" → "+91 98765 43210" for display. */
export function formatMobile(mobile: string): string {
  const m = /^\+91(\d{5})(\d{5})$/.exec(mobile);
  return m ? `+91 ${m[1]} ${m[2]}` : mobile;
}
