import Script from "next/script";

export default function InlineScript({ id, html }) {
  return (
    <Script
      id={id}
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
