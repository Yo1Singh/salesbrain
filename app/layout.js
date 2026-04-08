import "./globals.css";

export const metadata = {
  title: "Sales Brain — AI Marketing Intelligence | Holaprime",
  description:
    "Turn any URL into a complete marketing kit. Deploy-ready landing pages, ad creatives, email sequences, and sales intelligence powered by AI.",
  openGraph: {
    title: "Sales Brain by Holaprime",
    description: "AI-powered marketing intelligence. Paste any URL, get a full marketing kit.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
