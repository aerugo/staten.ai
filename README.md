# Staten.ai

*[Readme in English](https://github.com/aerugo/staten.ai/blob/main/README-EN.md)*

En öppen marknadsplats för Model Context Protocol (MCP)-appar – med fokus på svenska öppna data från offentlig sektor och civilsamhälle.

[Ladda ned senaste macOS-versionen ⇩](https://github.com/aerugo/staten/releases/latest/download/Staten.dmg)

- [Apache 2.0-licens](LICENSE)
- [Vad är MCP?](https://modelcontextprotocol.io)
- [Staten.ai är en fork av Fleur](https://www.fleurmcp.com/)

---

## Innehåll

1. [Varför Staten.ai?](#varför-statenai)
2. [Funktioner](#funktioner)
3. [Kom igång](#kom-igång)
4. [Installation](#installation)
5. [Använda MCP-servrar](#använda-mcp-servrar)
6. [Bidra med en egen MCP-server](#bidra-med-en-egen-mcp-server)
7. [Utveckling](#utveckling)
8. [Arkitektur](#arkitektur)
9. [Roadmap](#roadmap)
10. [Licens](#licens)

---

## Varför Staten.ai?

Sverige ligger i framkant när det gäller öppna data – från rikstäckande ekonomisk statistik hos Riksbanken till kommunala nyckeltal från Kolada.

Staten.ai visar hur AI-modeller enkelt kan kopplas till dessa datakällor med hjälp av Model Context Protocol (MCP):

- **Medborgare och journalister** kan ställa frågor och få svar baserade på officiell statistik.
- **Tjänstepersoner** kan automatisera och effektivisera arbetsflöden inom beslutsstödsystem.
- **Utvecklare** får en tydlig mall för att bygga MCP-servrar baserade på offentliga API:er.

Tänk på Staten.ai som en öppen ”App Store” för dataplug-ins till Claude Desktop och andra MCP-klienter – helt anpassad för svenska förhållanden.

---

## Funktioner

- **Marknadsplats för appar**: Hitta, installera och hantera MCP-appar för svenska datakällor.
- **Fokus på svenska datakällor**: SwemoMCP (Riksbanken) och KoladaMCP ingår redan från start.
- **Automatiska uppdateringar**: Staten håller både appar och sig själv uppdaterade.
- **Ingen terminal krävs**: Enkel installation och användning, byggd med Rust och Tauri (storlek under 20 MB).
- **Öppen källkod**: Apache 2.0-licens, redo för community-utveckling.

---

## Installation

- [Ladda ned senaste macOS-version (.dmg)](https://github.com/aerugo/staten.ai/releases/latest/download/Staten.dmg)

---

## Använda MCP-servrar

| Server | Datakälla | Exempel på frågor |
|--------|-----------|--------------------|
| **SwemoMCP** | Riksbankens API (BNP, KPI, ränta m.m.) | ”Hur har Riksbankens BNP-prognoser förändrats sedan 2020?” |
| **KoladaMCP** | Kolada (kommunala nyckeltal och statistik) | ”Jämför skolresultat mellan Malmö och Lund 2019–2024.” |

### Vill du lägga till fler servrar?

Du kan enkelt bidra med nya MCP-servrar via [app-registret](https://github.com/aerugo/staten.ai-app-registry).

---

## Bidra med en egen MCP-server

Har du ett API från offentlig sektor eller civilsamhället? Gör det enkelt tillgängligt genom att skapa en MCP-server:

1. Läs [introduktionen till MCP](https://modelcontextprotocol.io/introduction).
2. Använd befintliga exempel (t.ex. SwemoMCP eller KoladaMCP) som utgångspunkt.
3. Publicera din server kostnadsfritt som öppen källkod på GitHub.
4. Lägg till metadata om din server i `apps.json` och skicka en pull request.

---

## Utveckling

**Förutsättningar**:

- Node.js ≥ 18 och Bun
- Rust (för Tauri)
- macOS ≥ 13 (för native builds)

```bash
git clone https://github.com/statenistes/staten.git
cd staten
bun install
bun tauri dev
```

**Kör tester**:

```bash
cd src-tauri
cargo test
```

---

## Arkitektur

Staten.ai består av två delar:

- **Frontend** (React och Bun): Visar appar från ett centralt app-register via REST-API.
- **Backend** (Rust/Tauri): Hanterar lokala MCP-serverprocesser och kommunicerar med MCP-klienter som Claude Desktop.

---

## Roadmap

Planerade funktioner och förbättringar:

- [ ] Windows-stöd
- [ ] Fler klienter
- [ ] Inbyggd key-value store i Staten-backend för cachning av API-svar från MCP-servrar

[Följ och bidra till utvecklingen på GitHub](https://github.com/aerugo/staten.ai/issues).

---

## Licens

Staten.ai är licensierad under **Apache License 2.0**.

Projektet är en fork av [Fleur](https://www.fleurmcp.com/) men saknar formell koppling till Fleur eller dess skapare. Alla varumärken tillhör respektive ägare.
