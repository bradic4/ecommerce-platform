# Presek Stanja Projekta i Dalji Koraci (Handover Dokument za Drugi Računar)

**Datum preseka:** Novembar 2026.  
**Verzija specifikacije i koda:** `v1.1` (kompletna revidirana specifikacija nalazi se u `docs/Specifikacija_v1.1.pdf`, 28 strana)  
**Tehnološki stek:** `.NET 10` (Modularni Monolit + ASP.NET Core Razor Pages Admin + Background Worker) + `Next.js 15` (App Router, TypeScript, Tailwind CSS, SSR/ISR) + `PostgreSQL 17` (sa `InMemory` fallback režimom za rad bez Docker-a).

---

## 1. Šta je do sada urađeno (100% kompajlirano i testirano)

### 1.1 Tehnička specifikacija (`docs/Specifikacija_v1.1.pdf`)
- Urađena revizija inicijalne specifikacije i proširena na **28 strana (`v1.1`)** sa Sekcijom 25 (*Dopune specifikacije v1.1*):
  - Realan **10–13 nedelja MVP plan** za jednog developer-vlasnika.
  - Operativni modeli isporuke i naplate pouzeća (**Model A** sopstveni magacin, **Model B** cross-dock preko nas, **Model C** direktno slanje od dobavljača + `CodRemittance` evidencija otkupnina).
  - P0 Anti-Fraud zaštita za lažne porudžbine pouzećem (`CustomerRiskRecord` po SHA-256 hešu telefona/emaila, E.164 normalizacija `+381...`, 5-cifreni poštanski broj, brzina naručivanja).
  - Srpska pretraga kataloga (ćirilica u latinicu, skidanje dijakritika `čćžšđ`, `đ/dj`, trigram tolerancija na slovne greške poput `busilca` -> `bušilica`).
  - Izdvajanje Admin panela u **ASP.NET Core Razor Pages** unutar `.NET` rešenja (bez izlaganja `/api/v1/admin/*` javnom internetu).
  - HMAC-SHA256 potpisani webhook `/api/revalidate` za ciljano osvežavanje Next.js keša.

---

### 1.2 Backend i Domenski Sloj (`Ecommerce.sln`)
Svi projekti se nalaze u `src/` i `tests/` i prolaze `dotnet build` i `dotnet test` (`21/21 Passed`):

1. **`src/Ecommerce.Domain`**
   - `Entities/DomainEntities.cs`: Svi entiteti koriste sekvencijalne `UUIDv7` ključeve (`Guid.CreateVersion7()`) radi brzine B-tree indeksa:
     - Katalog: `Category`, `Brand`, `Product`, `ProductVariant` (`decimal` cene u `RSD`, nikad `float`).
     - Dobavljači: `Supplier`, `SupplierOffer` sa kanonskim ograničenjem `UNIQUE(SupplierId, SupplierSku)` i `ImportRun`.
     - Cene i marže: `PricingRule`, `PriceRecord` (istorija svake promene nabavne i prodajne cene), `Coupon` (promo kodovi sa `ProtectMinimumMarginFloor` zaštitom).
     - Zalihe: `InventoryLocation`, `StockMovement` (nepromenljivi ledger ulaza/izlaza sa obaveznim razlogom), `StockReservation` (atomska rezervacija pri checkout-u).
     - Porudžbine i otprema: `Order`, `OrderItem`, `Shipment`, `CodRemittance` (uparivanje otkupnina kurira), `SupplierPurchaseOrder` (`PO-2026...` nalozi dobavljačima), `CustomerRiskRecord`.
     - Zakonske reklamacije: `ReturnRequest` (`RMA-2026...` sa automatskim zakonskim rokom od **8 dana** za odgovor i **15 dana** za rešenje po Zakonu o zaštiti potrošača RS).
     - Sadržaj, SEO i infrastruktura: `Article` (vodiči za kupovinu `Draft -> Review -> Published`), `RedirectRule` (301 redirekcije bez lanaca), `AuditLog`, `OutboxMessage`.
   - `Common/SerbianTextNormalizer.cs`: Transliteracija ćirilice u latinicu, uklanjanje dijakritika, normalizacija srpskih brojeva telefona u E.164 (`064 123-4567` -> `+381641234567`), EAN/GTIN validacija (odbija Excel naučnu notaciju `8.60E+12`), SHA-256 heširanje.

2. **`src/Ecommerce.Application`**
   - `Services/PricingEngine.cs`: Hijerarhija pravila cena, eksplicitno razdvajanje **Markup %** od **Gross Margin %**, ugradnja očekivanog troška nepreuzetih pošiljaka (`ExpectedUnclaimedRate * EstimatedTwoWayShippingCostRsd`) i zaštitni prag minimalne zarade (`MinProfitFloorRsd`).
   - `Services/SupplierFeedService.cs`: Deterministički decimal parser (`1232.0000` -> `1232.00`), uparivanje po `(SupplierId, SupplierSku)` pa jednoznačnom EAN-u, automatska blokada ako na punom feed-u nestane `> 20%` aktivnih artikala, karantin za skok/pad cene `> 30%`.
   - `Services/HybridInventoryAndRiskServices.cs`: Projekcija dostupnosti (sopstveni magacin ima prioritet nad virtuelnim lagerom dobavljača uz safety buffer i proveru starosti feed-a) + `AntiFraudRiskEvaluator`.
   - `Services/SerbianCatalogSearchService.cs`: Rangirana pretraga po tačnom SKU/EAN-u, prefiksu, tokenima i trigram sličnosti.
   - `Services/AdminSecurityService.cs`: RBAC matrica (`OwnerAdmin` vs `Operator`) + RFC 6238 TOTP MFA generator i verifikator.
   - `Services/CourierAndPaymentService.cs`: Generator zvaničnog **NBS IPS QR** zapisa (`K:PR|V:01|C:1|...`), izvoz CSV manifesta za **PostExpress**, **BEX** i **D Express**, i parser CSV izvoda otkupnina kurira.
   - `Services/PromotionAndReturnService.cs`: Evaluacija kupona sa automatskim ograničavanjem popusta na prag minimalne marže i kreiranje zakonskih RMA zahteva.
   - `Services/TransactionalEmailRenderer.cs`: Srpski HTML šabloni za transakcione emailove (`OrderPlaced` sa NBS IPS QR zapisom i poukom o odustanku u roku od 14 dana, `OrderShipped` sa tracking i PFR fiskalnim brojem, `ReturnSubmitted` sa RMA rokom od 8/15 dana).
   - `Services/ProfitabilityAnalyticsService.cs`: Obračun finansijskih KPI-jeva (naplaćeni COD prihod naspram otkupnina u tranzitu, COGS, stvarni gubitak na nepreuzetim pošiljkama `ActualUnclaimedRate %` naspram `ExpectedUnclaimedRate %` i profitabilnost po artiklu).

3. **`src/Ecommerce.Infrastructure`**
   - `Persistence/EcommerceDbContext.cs` i `CatalogSeeder.cs`: Automatsko punjenje baze sa 10 realističnih proizvoda (alati i oprema za domaćinstvo), 2 dobavljača (uključujući deljeni `SHARED-SKU-100` radi testiranja kanonskog modela), početnim stanjem sopstvenog magacina, globalnim pravilom marži, 3 SEO vodiča za kupovinu i 2 promo kupona (`DOBRODOSLI10`, `MAJSTOR500`).
   - `Services/CheckoutOrderService.cs` i `AdminOperationsService.cs`: Idempotentni checkout sa semaforom/zaključavanjem zaliha, transakcioni `OutboxMessage` upis i sve operativne akcije.

4. **`src/Ecommerce.Api` (Port `5080`)**
   - Javni JSON API za Storefront (`GET /api/v1/catalog/categories`, `GET /api/v1/catalog/products`, `GET /api/v1/products/{slug}`, `POST /api/v1/checkout/quote`, `POST /api/v1/checkout/confirm`, `GET /api/v1/orders/lookup`, `POST /api/v1/returns/submit`, `GET /api/v1/returns/lookup`, `GET /api/v1/content/guides`, `GET /sitemap.xml`, `/health` i 301 Redirect middleware).

5. **`src/Ecommerce.Admin` (Port `5090` — ASP.NET Core Razor Pages Operativni Radni Centar)**
   - `/` (`Index.cshtml`) — Dashboard, KPI kartice i pregled hibridnog lagera.
   - `/Orders` (`Orders.cshtml`) — Obrada porudžbina, potvrda dostupnosti, otprema (kurir + tracking + PFR fiskalni broj), preuzimanje CSV manifesta za PostExpress/BEX/D Express, kreiranje `PO-2026...` narudžbenica dobavljaču, masovni CSV uvoz i sravnjivanje COD otkupnina i evidencija nepreuzetih paketa.
   - `/Catalog` (`Catalog.cshtml`) — PIM editor kataloga, dodavanje proizvoda, izmena cena/statusa i SEO polja.
   - `/Suppliers` (`Suppliers.cshtml`) — Dry-Run simulacija i bezbedna primena CSV/XML feed-a dobavljača.
   - `/Pricing` (`Pricing.cshtml`) — Simulacija i primena pravila marži (*Markup vs. Gross Margin*) i istorija `PriceRecord`.
   - `/Coupons` (`Coupons.cshtml`) — Upravljanje promo kodovima uz zaštitu minimalne marže.
   - `/Inventory` (`Inventory.cshtml`) — Korekcija sopstvenog magacina (`StockMovement`) i promena URL sluga sa automatskim 301 `RedirectRule` bez lanaca.
   - `/Returns` (`Returns.cshtml`) — Elektronska knjiga reklamacija (rok 8/15 dana) i povrat robe na stanje.
   - `/Content` (`Content.cshtml`) — Upravljanje vodičima za kupovinu (`Draft -> Review -> Published`).
   - `/Analytics` (`Analytics.cshtml`) — Finansijska analitika, profitabilnost po artiklu, praćenje stope nepreuzetih paketa i stručni odgovori na recenzije kupaca.
   - `/OrderPrint` (`OrderPrint.cshtml`) — A4 štampa otpremnice / liste za pakovanje + zakonskog obrasca za odustanak od ugovora u roku od 14 dana.
   - `/Audit` (`Audit.cshtml`) & `/Login` (`Login.cshtml`) — `AuditLog`, `OutboxMessage`, `CustomerRiskRecord`, `NotificationLog` i RBAC + TOTP MFA sesija.

6. **`src/Ecommerce.Worker`**
   - Pozadinski procesor koji čita neobrađene `OutboxMessage` događaje i šalje HMAC-SHA256 potpisane webhook zahteve ka Next.js `/api/revalidate`.

---

### 1.3 Next.js SSR/ISR Storefront (`storefront/` — Port `3000`)
Sve 14 rute prolaze `npm run build` i TypeScript proveru:
- `/` — Početna stranica i srpska pretraga kataloga.
- `/kategorija/[slug]` — SSR stranica kategorije sa filterima (`Samo dostupno`, `Do 6.000 RSD`, sortiranje), `BreadcrumbList` + `ItemList` JSON-LD šemama i SEO `canonical` / `noindex, follow` zaštitom za parametarske URL-ove.
- `/proizvod/[slug]` — SSR stranica proizvoda sa `Product` + `Offer` (`priceCurrency: "RSD"`) JSON-LD šemom i jasnim prikazom roka isporuke.
- `/vodici` i `/vodici/[slug]` — SEO vodiči za kupovinu sa `Article` + `FAQPage` JSON-LD šemama i ugrađenim karticama proizvoda.
- `/uporedi` — Uporedni pregled tehničkih specifikacija i cena do 4 izabrana alata/uređaja.
- `/checkout` — Jednostranični Guest Checkout (pouzeće ili NBS IPS QR uplata na račun, promo kupon `DOBRODOSLI10`, indikator do besplatne isporuke od `12.000 RSD`, `Idempotency-Key`, E.164 validacija telefona).
- `/potvrda/[orderNumber]` — Potvrda porudžbine (`noindex, nofollow`, bez PII podataka u URL-u) sa prikazom generisanog **NBS IPS QR** naloga za instant m-banking plaćanje.
- `/provera-porudzbine` — Javna provera statusa porudžbine i pošiljke po broju porudžbine.
- `/reklamacije` — Online podnošenje zahteva za odustanak (14 dana) ili reklamaciju (24 meseca) sa izdavanjem `RMA-...` broja i proverom statusa.
- `/uslovi-kupovine`, `/api/revalidate`, `/sitemap.xml`, `/robots.txt`.

---

## 2. Kako pokrenuti projekat na drugom računaru (za 5 minuta)

### Preduslovi na novom računaru
1. **.NET 10 SDK** (`v10.0.x`) — preuzeti sa zvaničnog Microsoft sajta ili pokrenuti:
   ```powershell
   Invoke-WebRequest -Uri https://dot.net/v1/dotnet-install.ps1 -OutFile dotnet-install.ps1
   powershell -NoProfile -ExecutionPolicy Bypass -File .\dotnet-install.ps1 -Channel 10.0
   ```
2. **Node.js (v20 ili v22 LTS)** za `storefront/`.
3. **Docker Desktop** *(opciono)* — za PostgreSQL 17 bazu. Projekat u `appsettings.json` ima uključen `"UseInMemoryDatabase": true` kao podrazumevani razvojni režim, tako da sve radi odmah i bez podignutog Docker-a! Kada želiš puni PostgreSQL 17, pokreni `docker compose up -d` i promeni `"UseInMemoryDatabase": false`.

### Koraci nakon `git clone`
```powershell
# 1. Pokreni sve backend testove (21 test prihvatanja AT-01 do AT-21)
dotnet test .\Ecommerce.sln

# 2. Pokreni Javni Storefront API (na http://localhost:5080)
dotnet run --project .\src\Ecommerce.Api\Ecommerce.Api.csproj --urls "http://localhost:5080"

# 3. U drugom terminalu pokreni Operativni Admin Panel (na http://localhost:5090)
dotnet run --project .\src\Ecommerce.Admin\Ecommerce.Admin.csproj --urls "http://localhost:5090"

# 4. U trećem terminalu pokreni Next.js Storefront (na http://localhost:3000)
cd .\storefront
npm install
npm run dev
```

---

## 3. Dalji koraci (Plan rada na drugom računaru)

1. **Prilagođavanje konkretnoj niši proizvoda i unos prvog pravog dobavljača:**
   - Kada definišeš tačnu nišu i dobiješ prvi CSV/XML cenovnik od dobavljača u Srbiji, kroz Admin panel (`/Suppliers`) uradi **Dry-Run** uvoz i mapiraj njegove kolone u `AdminOperationsService.ParseCsvFeed`.
   - Podesi stvarni žiro račun firme i naziv pravnog lica u `CourierAndPaymentService.GenerateNbsIpsQrPayload` (trenutno je postavljen demo račun `160000000123456789`).
2. **Prebacivanje sa `InMemory` na produkcioni PostgreSQL 17 + EF Core Migracije:**
   - Pokrenuti `docker compose up -d` (koji automatski izvršava `infra/postgres/init/01-extensions.sql` za `unaccent` i `pg_trgm`).
   - Postaviti `"UseInMemoryDatabase": false` u `src/Ecommerce.Api/appsettings.json` i `src/Ecommerce.Admin/appsettings.json`.
   - Generisati inicijalnu EF Core migraciju (`dotnet ef migrations add InitialCreate --project src/Ecommerce.Infrastructure --startup-project src/Ecommerce.Api`).
3. **Produkciona autentifikacija i SMTP email notifikacije:**
   - U `Ecommerce.Worker` povezati slanje transakcionih emailova (`OrderPlaced`, `OrderShipped`, `ReturnRequestSubmitted`) preko **Postmark / Resend / SMTP** provajdera.
   - Zameniti razvojni cookie-switcher na `/Login` stranici sa produkcionim ASP.NET Core Identity / kredencijalima vlasnika iz `.env` varijabli.
4. **Produkciono postavljanje (Deployment — Sekcija 17.2):**
   - Podizanje na Hetzner Cloud VPS (Ubuntu 24.04 LTS + Caddy/Nginx reverse proxy sa automatskim Let's Encrypt TLS sertifikatom) i aktiviranje `infra/scripts/backup-postgres.ps1` u cron-u.
