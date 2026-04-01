import Link from "next/link";
import Image from "next/image";

export default function AGBPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "2rem auto", padding: "0 1rem" }}>
      <div style={{ marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href="/" title="Zurück">
          <Image src="/logo.png" alt="MyBuZiness" width={48} height={48} style={{ borderRadius: "8px" }} />
        </Link>
        <h1 style={{ fontSize: "2rem", margin: 0 }}>Allgemeine Geschäftsbedingungen</h1>
      </div>

      <div className="card" style={{ padding: "2rem", lineHeight: 1.6 }}>
        <h2>1. Geltungsbereich</h2>
        <p>
          Diese Allgemeinen Geschäftsbedingungen (nachfolgend &quot;AGB&quot;) der My BuZiness (nachfolgend &quot;Anbieter&quot;),
          gelten für alle Verträge über die Nutzung der Web-Applikation &quot;My BuZiness&quot;, die ein Nutzer oder eine
          Nutzerin (nachfolgend &quot;Kunde&quot;) mit dem Anbieter abschließt.
        </p>
        <p>
          Abweichende Bedingungen des Kunden werden nicht anerkannt, es sei denn, der Anbieter stimmt ihrer Geltung ausdrücklich schriftlich zu.
        </p>

        <h2>2. Leistungsbeschreibung</h2>
        <p>
          Der Anbieter stellt dem Kunden eine cloudbasierte Softwarelösung zur Verwaltung von Kunden, Terminen, Rechnungen
          und Finanzen zur Verfügung. Die Software wird als Software-as-a-Service (SaaS) über das Internet bereitgestellt.
        </p>

        <h2>3. Vertragsschluss und Registrierung</h2>
        <p>
          Die Nutzung der Software erfordert eine vorherige Registrierung. Der Kunde ist verpflichtet, bei der
          Registrierung wahrheitsgemäße Angaben zu machen. Mit Abschluss der Registrierung gibt der Kunde ein
          verbindliches Angebot zum Abschluss eines Vertrages über die Nutzung der Software ab.
        </p>

        <h2>4. Nutzungsrechte</h2>
        <p>
          Der Anbieter räumt dem Kunden für die Dauer des Vertrages ein einfaches, nicht übertragbares und nicht
          unterlizenzierbares Recht ein, die Software bestimmungsgemäß zu nutzen.
        </p>

        <h2>5. Pflichten des Kunden</h2>
        <p>
          Der Kunde ist verpflichtet, seine Zugangsdaten geheim zu halten und vor dem Zugriff durch unbefugte Dritte zu
          schützen. Die Nutzung der Software darf nicht gegen geltendes Recht oder diese AGB verstoßen.
        </p>

        <h2>6. Verfügbarkeit und Gewährleistung</h2>
        <p>
          Der Anbieter bemüht sich, die Software möglichst unterbrechungsfrei zur Verfügung zu stellen. Es wird jedoch
          keine Garantie für eine bestimmte Verfügbarkeit übernommen. Wartungsarbeiten, Sicherheitsgründe oder
          Ereignisse außerhalb des Einflussbereichs des Anbieters können zu Ausfallzeiten führen.
        </p>

        <h2>7. Haftung</h2>
        <p>
          Der Anbieter haftet bei Vorsatz und grober Fahrlässigkeit uneingeschränkt. Bei leichter Fahrlässigkeit haftet
          der Anbieter nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten).
        </p>

        <h2>8. Schlussbestimmungen</h2>
        <p>
          Auf Verträge zwischen dem Anbieter und dem Kunden findet das Recht der Bundesrepublik Deutschland Anwendung.
          Gerichtsstand für alle Streitigkeiten aus dem Vertragsverhältnis ist der Sitz des Anbieters, sofern der Kunde
          Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen ist.
        </p>

        <br />
        <Link href="/" className="btn btn-ghost" style={{ display: "inline-flex" }}>Zurück zur Startseite</Link>
      </div>
    </div>
  );
}
