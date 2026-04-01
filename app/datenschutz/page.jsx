import Link from "next/link";
import Image from "next/image";

export default function DatenschutzPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "2rem auto", padding: "0 1rem" }}>
      <div style={{ marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href="/" title="Zurück">
          <Image src="/logo.png" alt="MyBuZiness" width={48} height={48} style={{ borderRadius: "8px" }} />
        </Link>
        <h1 style={{ fontSize: "2rem", margin: 0 }}>Datenschutzerklärung</h1>
      </div>

      <div className="card" style={{ padding: "2rem", lineHeight: 1.6 }}>
        <h2>1. Datenschutz auf einen Blick</h2>
        <h3>Allgemeine Hinweise</h3>
        <p>
          Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert,
          wenn Sie unsere Web-App nutzen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert
          werden können. Ausführliche Informationen zum Thema Datenschutz entnehmen Sie unserer unter diesem Text aufgeführten
          Datenschutzerklärung.
        </p>

        <h3>Datenerfassung auf dieser Website</h3>
        <p>
          Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Impressum dieser Website entnehmen.
        </p>
        <p>
          Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z. B. um Daten
          handeln, die Sie im Rahmen der Registrierung oder der Nutzung der App eingeben.
        </p>
        <p>
          Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website durch unsere IT-Systeme erfasst.
          Das sind vor allem technische Daten (z. B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs).
        </p>

        <h2>2. Hosting</h2>
        <h3>Railway</h3>
        <p>
          Wir hosten unsere Anwendung und Datenbanken bei Railway. Anbieter ist die Railway Corp., 140 10th St, San Francisco, CA 94103, USA
          (nachfolgend Railway). Wenn Sie unsere Website besuchen, erfasst Railway verschiedene Logfiles inklusive Ihrer IP-Adressen.
          Details entnehmen Sie der Datenschutzerklärung von Railway: <a href="https://railway.app/legal/privacy" target="_blank" rel="noopener noreferrer">https://railway.app/legal/privacy</a>.
        </p>
        <p>
          Die Verwendung von Railway erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Wir haben ein berechtigtes Interesse
          an einer möglichst zuverlässigen Darstellung unserer Web-App.
        </p>

        <h3>GitHub</h3>
        <p>
          Der Quellcode unserer Web-App wird auf GitHub gehostet. Anbieter ist die GitHub, Inc., 88 Colin P Kelly Jr St, San Francisco, CA 94107, USA.
          Weitere Informationen finden Sie in der Datenschutzerklärung von GitHub: <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" target="_blank" rel="noopener noreferrer">https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement</a>.
        </p>

        <h2>3. Datenerfassung auf unserer Website</h2>
        <h3>Cookies</h3>
        <p>
          Unsere Web-App verwendet sogenannte „Cookies“. Cookies sind kleine Textdateien, die keine Schäden auf Ihrem Endgerät
          anrichten. Sie werden entweder vorübergehend für die Dauer einer Sitzung (Session-Cookies) oder dauerhaft
          (permanente Cookies) auf Ihrem Endgerät gespeichert.
        </p>
        <p>
          Wir verwenden ausschließlich <strong>technisch notwendige Cookies</strong>. Hierzu gehört insbesondere das Session-Cookie,
          welches erforderlich ist, um Sie nach dem Login angemeldet zu halten und die sichere Nutzung der Web-App zu gewährleisten.
          Diese Cookies werden auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO gespeichert. Wir haben ein berechtigtes Interesse
          an der Speicherung von Cookies zur technisch fehlerfreien und optimierten Bereitstellung unserer Dienste.
        </p>

        <h3>Benutzerkonten und Registrierung</h3>
        <p>
          Um die Funktionen der Web-App nutzen zu können, ist eine Registrierung erforderlich. Die hierbei eingegebenen Daten
          (wie Name und E-Mail-Adresse) verwenden wir ausschließlich zum Zwecke der Nutzung des jeweiligen Angebotes oder Dienstes,
          für den Sie sich registriert haben. Die Verarbeitung der bei der Registrierung eingegebenen Daten erfolgt auf Grundlage
          Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) sowie zur Erfüllung eines Vertrags oder vorvertraglicher Maßnahmen (Art. 6 Abs. 1 lit. b DSGVO).
        </p>

        <br />
        <Link href="/" className="btn btn-ghost" style={{ display: "inline-flex" }}>Zurück zur Startseite</Link>
      </div>
    </div>
  );
}
