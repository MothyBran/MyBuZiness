import Link from "next/link";
import Image from "next/image";

export default function ImpressumPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "2rem auto", padding: "0 1rem" }}>
      <div style={{ marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href="/" title="Zurück">
          <Image src="/logo.png" alt="MyBuZiness" width={48} height={48} style={{ borderRadius: "8px" }} />
        </Link>
        <h1 style={{ fontSize: "2rem", margin: 0 }}>Impressum</h1>
      </div>

      <div className="card" style={{ padding: "2rem", lineHeight: 1.6 }}>
        <h2>Angaben gemäß § 5 TMG</h2>
        <p>
          <strong>My BuZiness (Musterfirma)</strong><br />
          Musterstraße 1<br />
          12345 Musterstadt<br />
          Deutschland
        </p>

        <h3>Vertreten durch:</h3>
        <p>Max Mustermann</p>

        <h3>Kontakt</h3>
        <p>
          Telefon: +49 (0) 123 456 789<br />
          E-Mail: info@musterfirma.de
        </p>

        <h3>Umsatzsteuer-ID</h3>
        <p>
          Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
          DE123456789
        </p>

        <h3>Verbraucherstreitbeilegung/Universalschlichtungsstelle</h3>
        <p>
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
        </p>
        <br />
        <Link href="/" className="btn btn-ghost" style={{ display: "inline-flex" }}>Zurück zur Startseite</Link>
      </div>
    </div>
  );
}
