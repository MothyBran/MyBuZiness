export const metadata = {
  title: 'MyBuZiness',
  description: 'WebApp – Business Tool',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
