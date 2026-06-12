import "./globals.css";

export const metadata = {
  title: "Health Coach",
  description: "Your personal 30-day wellness coach",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
