export function buildExtractionContext(pdfText: string): string {
  const termsIndex = pdfText.indexOf("Terms and Conditions");
  const authorizationIndex = pdfText.indexOf("Customer Authorization");

  const mainSection =
    termsIndex >= 0
      ? pdfText.slice(0, termsIndex)
      : pdfText;

  const signatureSection =
    authorizationIndex >= 0
      ? pdfText.slice(authorizationIndex)
      : "";

  return `${mainSection}\n\n${signatureSection}`.trim();
}