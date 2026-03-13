const E164_REGEX = /^\+[1-9]\d{6,14}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function validateE164Phone(phone: string | undefined): boolean {
  if (!phone || phone.trim() === "") return true;
  return E164_REGEX.test(phone.trim());
}

export function validateEmail(email: string | undefined): boolean {
  if (!email || email.trim() === "") return true;
  return EMAIL_REGEX.test(email.trim());
}
