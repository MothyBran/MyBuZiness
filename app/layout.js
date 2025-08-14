import Header from "./components/Header";

export const metadata = {
  title: "MyBuZiness",
  description: "WebApp – Business Tool",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, background: "#fafafa" }}>
        <Header />
        <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
          {children}
        </div>
      </body>
    </html>
  );
}

