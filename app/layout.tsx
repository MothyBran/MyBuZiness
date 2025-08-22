// app/layout.tsx
import "./globals.css"; // WICHTIG: Global-Styles NUR hier importieren

export const metadata = {
  title: "MyBuZiness",
  description: "Business Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
