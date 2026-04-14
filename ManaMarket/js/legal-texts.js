const legalTexts = {
  allmannaVillkor: `<h3>Allmänna villkor</h3>
    <p><strong>1. Företagsinformation</strong><br>
    [Företagsnamn]<br>
    Organisationsnummer: [XXXXXX-XXXX]<br>
    Adress: [Adress]<br>
    E-post: [E-postadress]</p>

    <p><strong>2. Allmänt</strong><br>
    Dessa villkor gäller för alla köp som görs via [hemsidans namn]. Genom att genomföra ett köp accepterar kunden dessa villkor. För att handla måste kunden vara minst 18 år eller ha målsmans godkännande.</p>

    <p><strong>3. Produkter (Kosttillskott)</strong><br>
    Produkterna som säljs är kosttillskott och ska inte användas som ersättning för en varierad kost. Rekommenderad daglig dos bör inte överskridas. Produkter bör förvaras oåtkomligt för barn. Vid medicinska tillstånd, graviditet eller amning bör läkare konsulteras före användning.</p>

    <p><strong>4. Priser och betalning</strong><br>
    Alla priser anges i svenska kronor (SEK) inklusive moms. Eventuella fraktkostnader tillkommer och visas i kassan. Betalning sker via de betalningsalternativ som erbjuds i kassan.</p>

    <p><strong>5. Leverans</strong><br>
    Leveranstid anges i kassan och kan variera beroende på vald leveransmetod. Risken för varan övergår till kunden när varan mottagits.</p>

    <p><strong>6. Ångerrätt</strong><br>
    Enligt distansavtalslagen har kunden 14 dagars ångerrätt från det att varan mottagits. Ångerrätten gäller inte om förseglingen brutits på hygienprodukter eller kosttillskott där hälsoskyddsskäl föreligger. Vid utnyttjande av ångerrätten står kunden för returfrakten.</p>

    <p><strong>7. Reklamation</strong><br>
    Vid fel på vara har kunden rätt att reklamera enligt konsumentköplagen. Reklamation ska ske inom skälig tid efter att felet upptäckts. Vid godkänd reklamation ersätts varan eller återbetalas.</p>

    <p><strong>8. Ansvarsbegränsning</strong><br>
    Företaget ansvarar inte för indirekta skador som kan uppstå vid användning av produkterna. Produkten används på eget ansvar i enlighet med rekommendationer.</p>

    <p><strong>9. Personuppgifter</strong><br>
    Personuppgifter hanteras i enlighet med gällande dataskyddslagstiftning (GDPR). Se separat dataskyddspolicy för mer information.</p>

    <p><strong>10. Tvist</strong><br>
    Vid eventuell tvist följs beslut från Allmänna reklamationsnämnden (ARN). Tvister kan även lösas via EU:s tvistlösningsplattform.</p>

    <p><strong>11. Ändringar av villkor</strong><br>
    Företaget förbehåller sig rätten att när som helst ändra dessa villkor. De villkor som gäller vid beställningstillfället är de som tillämpas på köpet.</p>`,

  gdpr: `<h3>Dataskyddspolicy (GDPR)</h3>
    <p><strong>1. Personuppgiftsansvarig</strong><br>
    [Företagsnamn]<br>
    Organisationsnummer: [XXXXXX-XXXX]<br>
    Adress: [Adress]<br>
    E-post: [E-postadress]</p>

    <p><strong>2. Vilka uppgifter vi samlar in</strong><br>
    Vi samlar in personuppgifter som du själv lämnar till oss vid beställning eller kontakt, exempelvis namn, adress, e-postadress, telefonnummer och betalningsinformation. Vi kan även samla in teknisk information såsom IP-adress och cookies.</p>

    <p><strong>3. Ändamål med behandlingen</strong><br>
    Personuppgifterna används för att hantera och leverera beställningar, kommunicera med dig som kund, uppfylla rättsliga skyldigheter (bokföring m.m.) samt förbättra vår webbplats och tjänster.</p>

    <p><strong>4. Laglig grund</strong><br>
    Vi behandlar dina personuppgifter baserat på avtal, rättslig förpliktelse (t.ex. bokföringslagen), berättigat intresse (t.ex. kundservice) samt samtycke.</p>

    <p><strong>5. Lagring av uppgifter</strong><br>
    Vi sparar personuppgifter så länge det är nödvändigt för ändamålet. Orderuppgifter sparas enligt bokföringslagen (vanligtvis 7 år). Övriga uppgifter raderas när de inte längre behövs.</p>

    <p><strong>6. Delning av uppgifter</strong><br>
    Vi delar endast uppgifter med tredje part när det är nödvändigt, exempelvis betalningsleverantörer, fraktbolag och IT-tjänsteleverantörer. Alla parter behandlar uppgifterna enligt gällande dataskyddslagstiftning.</p>

    <p><strong>7. Dina rättigheter</strong><br>
    Du har rätt att begära utdrag, rättelse, radering ("rätten att bli bortglömd"), invända mot viss behandling, begära begränsning eller få dina uppgifter överförda (dataportabilitet). Kontakta oss via e-post för att utöva dina rättigheter.</p>

    <p><strong>8. Cookies</strong><br>
    Vi använder cookies för att förbättra användarupplevelsen och analysera trafik. Du kan själv ändra dina cookieinställningar i din webbläsare.</p>

    <p><strong>9. Säkerhet</strong><br>
    Vi vidtar lämpliga tekniska och organisatoriska åtgärder för att skydda dina personuppgifter.</p>

    <p><strong>10. Ändringar i policyn</strong><br>
    Vi förbehåller oss rätten att uppdatera denna policy vid behov. Den senaste versionen finns alltid tillgänglig på webbplatsen.</p>`,

  leveransvillkor: `<h3>Leveransvillkor</h3>
    <p><strong>1. Leveransmetoder</strong><br>
    Vi erbjuder leverans via de fraktalternativ som visas i kassan. Val av leveransmetod görs i samband med beställning.</p>

    <p><strong>2. Leveranstid</strong><br>
    Normal leveranstid är 1–5 arbetsdagar inom Sverige, om inget annat anges. Vid hög belastning eller särskilda omständigheter kan leveranstiden vara längre.</p>

    <p><strong>3. Fraktkostnader</strong><br>
    Fraktkostnader anges i kassan innan köp genomförs. Eventuell fri frakt gäller enligt de villkor som anges på webbplatsen.</p>

    <p><strong>4. Orderbekräftelse</strong><br>
    När en beställning genomförts skickas en orderbekräftelse till angiven e-postadress. Det är kundens ansvar att kontrollera att uppgifterna är korrekta.</p>

    <p><strong>5. Ej uthämtade paket</strong><br>
    Om ett paket inte hämtas ut inom angiven tid och returneras till oss förbehåller vi oss rätten att debitera en avgift för hantering och fraktkostnader.</p>

    <p><strong>6. Transportskador</strong><br>
    Om varan är skadad vid leverans ska detta anmälas till fraktombudet direkt vid mottagandet eller så snart som möjligt. Kontakta även oss via e-post.</p>

    <p><strong>7. Ansvar vid leverans</strong><br>
    Risken för varan övergår till kunden när varan har levererats till angiven adress eller utlämningsställe.</p>

    <p><strong>8. Förseningar</strong><br>
    Vid leveransförsening meddelas kunden så snart som möjligt. Kunden har rätt att häva köpet vid väsentlig försening.</p>`,

  betalningsvillkor: `<h3>Betalningsvillkor</h3>
    <p><strong>1. Allmänt</strong><br>
    Alla priser anges i svenska kronor (SEK) inklusive moms om inget annat anges. Eventuella avgifter för frakt eller betalning visas i kassan.</p>

    <p><strong>2. Betalningsmetoder</strong><br>
    Vi erbjuder de betalningsmetoder som visas i kassan, exempelvis kortbetalning (Visa/Mastercard), faktura, delbetalning och direktbetalning via bank.</p>

    <p><strong>3. Betalningsleverantör</strong><br>
    Betalningar kan hanteras av tredje part, exempelvis Klarna eller motsvarande leverantör. Vid val av faktura eller delbetalning gäller betalningsleverantörens villkor.</p>

    <p><strong>4. Faktura</strong><br>
    Vid betalning via faktura gäller den betalningsfrist som anges i kassan eller på fakturan (vanligtvis 14 dagar).</p>

    <p><strong>5. Kortbetalning</strong><br>
    Vid kortbetalning reserveras beloppet vid köptillfället och debiteras när ordern skickas.</p>

    <p><strong>6. Säkerhet</strong><br>
    Alla betalningar sker via krypterad anslutning (HTTPS/SSL) genom Stripe. Vi lagrar inga kortuppgifter. Stripe är PCI-DSS compliant</p>

    <p><strong>7. Felaktiga betalningar</strong><br>
    Om felaktig debitering skett, kontakta oss snarast så att vi kan rätta till felet.</p>

    <p><strong>8. Återbetalningar</strong><br>
    Vid godkänd retur eller reklamation sker återbetalning via samma betalningsmetod som användes vid köpet, normalt inom 14 dagar.</p>`,

  angerratt: `<h3>Ångerrätt, Retur & Byte</h3>
    <p><strong>1. Ångerrätt</strong><br>
    Enligt distansavtalslagen har du som kund rätt att ångra ditt köp inom 14 dagar från det att du mottagit varan. Meddela oss via e-post innan fristen löpt ut.</p>

    <p><strong>2. Undantag från ångerrätt</strong><br>
    Ångerrätten gäller inte för kosttillskott där förseglingen har brutits eller hygienprodukter som inte kan återlämnas av hälso- eller hygienskäl.</p>

    <p><strong>3. Retur</strong><br>
    Varan ska returneras inom 14 dagar från att du meddelat oss. Produkten ska vara i oförändrat skick och i originalförpackning. Kunden står för returfrakten.</p>

    <p><strong>4. Återbetalning</strong><br>
    Vid godkänd retur återbetalas hela beloppet inklusive eventuell standardfrakt inom 14 dagar från det att vi mottagit returen.</p>

    <p><strong>5. Byte</strong><br>
    Vi erbjuder i första hand återbetalning. Önskar du byta en vara rekommenderas en ny beställning.</p>

    <p><strong>6. Reklamation</strong><br>
    Om varan är felaktig eller skadad har du rätt att reklamera enligt konsumentköplagen.</p>

    <p><strong>7. Returadress</strong><br>
    [Mnt-Naze AB]<br>
    [Edeforsgatan 24<br>
    97438 Luleå]</p>

    <p><strong>8. Ej uthämtade paket</strong><br>
    För paket som inte hämtas ut debiteras en avgift för frakt och hantering.</p>`,

  returformular: `<h3>Retur- och ångerformulär</h3>
    <p><a href="Vilkor/ReturFormular.docx">Ladda ner returformulär här</a></p>
    <p><strong>Observera:</strong><br>
    - Retur ska ske inom 14 dagar.<br>
    - Produkten ska vara oanvänd och i originalförpackning.<br>
    - För kosttillskott gäller inte ångerrätten om förseglingen brutits.</p>`,

  kontakt: `<h3>Kontakt</h3>
    <p><strong>Företagsinformation</strong><br>
    [Företagsnamn]<br>
    Organisationsnummer: [XXXXXX-XXXX]<br>
    Adress: [Adress], [Postnummer och Ort], Sverige</p>

    <p><strong>E-post:</strong> [E-postadress]<br>
    <strong>Telefon:</strong> [Telefonnummer]</p>

    <p><strong>Öppettider</strong><br>
    Måndag – Fredag: [tider]<br>
    Helger: Stängt</p>

    <p><strong>Kundservice</strong><br>
    Vi strävar efter att besvara alla ärenden inom 24–48 timmar under vardagar. Ange ordernummer för snabbare hantering.</p>`,

  cookieinstallningar: `<h3>Cookieinställningar</h3>
    <p><strong>Vad är cookies?</strong><br>
    Cookies är små textfiler som sparas på din enhet för att få webbplatsen att fungera korrekt, förbättra användarupplevelsen och analysera trafik.</p>

    <p><strong>Vilka typer av cookies använder vi?</strong><br>
    - <strong>Nödvändiga cookies:</strong> Krävs för grundläggande funktioner som varukorg och säkerhet.<br>
    - <strong>Analyscookies:</strong> Hjälper oss förstå hur webbplatsen används (t.ex. Google Analytics).<br>
    - <strong>Marknadsföringscookies:</strong> Används för relevanta annonser.</p>

    <p><strong>Hantera cookies</strong><br>
    Du kan välja vilka cookies du vill acceptera vid ditt första besök eller ändra inställningarna i din webbläsare. Tredjepartstjänster kan också sätta cookies.</p>

    <p><strong>Kontakt</strong><br>
    Har du frågor om cookies? Kontakta oss via [E-postadress].</p>`
};
