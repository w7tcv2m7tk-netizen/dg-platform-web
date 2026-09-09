/**
 * Site chrome footer. Renders immediately so the footer is reliably present on
 * first paint. (Previously it was deferred to `requestIdleCallback`, which could
 * leave the footer missing or appearing late on some sessions.)
 */
export function ChromeFooterHtml({ html }: { html: string }) {
  return (
    <section
      className="wb-section wb-html-block wb-site-chrome wb-site-chrome-footer"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
