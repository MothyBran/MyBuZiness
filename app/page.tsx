// app/page.tsx
"use client";

import "../src/theme/theme.css";        // <- unser globales Theme
import App from "../src/App";           // <- die neue App aus /src

export default function Page() {
  return <App />;
}
