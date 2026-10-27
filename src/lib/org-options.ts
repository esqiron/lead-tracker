// Choices offered when setting up or editing an organization.

export const CURRENCIES = ["EUR", "USD", "GBP", "RON", "CHF", "CAD", "AUD", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "JPY", "INR", "BRL"];

export const DATE_FORMATS = [
  { value: "yyyy-MM-dd", example: "2026-03-14" },
  { value: "dd/MM/yyyy", example: "14/03/2026" },
  { value: "MM/dd/yyyy", example: "03/14/2026" },
  { value: "dd.MM.yyyy", example: "14.03.2026" },
];

export function timezones() {
  return ["UTC", ...Intl.supportedValuesOf("timeZone").filter((tz) => tz !== "UTC")];
}
