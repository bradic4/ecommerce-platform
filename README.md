# Custom .NET 10 + Next.js SSR/ISR E-Commerce Platforma (v1.1)

Tehnički utegnuta B2C e-commerce platforma za porodičnu prodavnicu u Srbiji (**RSD**, hibridni lager: sopstveni magacin + virtuelne zalihe dobavljača, SEO-first organski saobraćaj, anti-fraud zaštita za pouzeće).

Kompletna tehnička specifikacija i presek stanja za nastavak rada na drugom računaru nalaze se u:
- **[HANDOVER_STATUS_I_DALJI_KORACI.md](./HANDOVER_STATUS_I_DALJI_KORACI.md)** — Detaljan presek svega što je urađeno, uputstvo za pokretanje na novom računaru i plan narednih koraka.
- `docs/Specifikacija_v1.1.pdf` (28 strana, revizija v1.1)

---

## Arhitektura i projekti u repozitorijumu

### 1. Backend (.NET 10 Modularni Monolit — `Ecommerce.sln`)
- `src/Ecommerce.Domain` — Domenski entiteti sa `UUIDv7` ključevima (`Product`, `ProductVariant`, `Supplier`, `SupplierOffer` sa `UNIQUE(SupplierId, SupplierSku)`, `PricingRule`, `PriceRecord`, `StockMovement`, `StockReservation`, `Order`, `Shipment`, `CodRemittance`, `CustomerRiskRecord`, `ImportRun`, `RedirectRule`, `Article`, `AuditLog`, `OutboxMessage`) i `SerbianTextNormalizer` (ćirilica -> latinica, dijakritici `čćžšđ`, `đ/dj`, E.164 `+381`, EAN validacija, SHA-256).
- `src/Ecommerce.Application` — Čista poslovna pravila:
  - `PricingEngine` (hijerarhija pravila, razlika *Markup vs. Gross Margin*, ugradnja troška nepreuzetih COD pošiljaka `ExpectedUnclaimedRate * EstimatedTwoWayShippingCostRsd`).
  - `SupplierFeedService` (deterministički decimal parser, uparivanje po `(SupplierId, SupplierSku)` pa EAN-u, blokada >20% nestanka kataloga na punom feed-u, karantin >30% skoka cene).
  - `HybridInventoryService` (prioritet sopstvenog magacina nad svežim feed-om dobavljača uz safety buffer i prozor svežine).
  - `AntiFraudRiskEvaluator` (P0 pravila protiv lažnih porudžbina pouzećem: istorija nepreuzetih paketa po SHA-256 hešu, 5-cifreni poštanski broj, brzina naručivanja, prag vrednosti).
  - `SerbianCatalogSearchService` (srpska pretraga otporna na pismo, ošišanu latinicu i slovne greške poput `busilca` -> `bušilica`).
  - `AdminSecurityService` (RBAC matrica pristupa `OwnerAdmin` vs `Operator` + RFC 6238 TOTP MFA verifikacija).
- `src/Ecommerce.Infrastructure` — `EcommerceDbContext` (PostgreSQL `Npgsql` + fallback `InMemory` za lokalni razvoj bez Docker-a), `CatalogSeeder`, `CheckoutOrderService`, `AdminOperationsService`.
- `src/Ecommerce.Api` — Javni Storefront JSON API + XML Sitemap + 301 Redirect middleware (`http://localhost:5080`).
- `src/Ecommerce.Admin` — **ASP.NET Core Razor Pages Operativni Radni Centar** (`http://localhost:5090`):
  - `/` — Dashboard i pregled zaliha
  - `/Orders` — Obrada porudžbina, potvrda, slanje (kurir + tracking + PFR fiskalna referenca), sravnjivanje COD otkupnina (`CodRemittance`), evidencija nepreuzetih pošiljaka
  - `/Suppliers` — Dry-Run pregled i bezbedna primena CSV/XML feed-a dobavljača
  - `/Pricing` — Simulacija i primena pravila marži (*Markup vs. Gross Margin*) i istorija `PriceRecord`
  - `/Inventory` — Ručna korekcija sopstvenog magacina (`StockMovement`) i promena URL sluga sa automatskim 301 `RedirectRule` bez lanaca
  - `/Content` — Upravljanje vodičima za kupovinu (`Draft -> Review -> Published`) i SEO metapodacima
  - `/Audit` — `AuditLog`, `OutboxMessage` red i `CustomerRiskRecord` evidencija
  - `/Login` — RBAC sesija (`OwnerAdmin` / `Operator`) i TOTP MFA verifikacija
- `src/Ecommerce.Worker` — Pozadinski `OutboxMessage` procesor koji šalje HMAC-SHA256 potpisane webhook zahteve ka Next.js `/api/revalidate`.
- `tests/Ecommerce.UnitTests` — Automatizovani xUnit testovi koji pokrivaju kriterijume prihvatanja iz specifikacije (`AT-01` do `AT-21`).

### 2. Storefront (`storefront/` — Next.js 16 App Router, TypeScript, Tailwind CSS)
- `/` — Početna stranica i srpska pretraga kataloga
- `/kategorija/[slug]` — SSR stranica kategorije sa `BreadcrumbList` + `ItemList` JSON-LD šemama i sortiranjem
- `/proizvod/[slug]` — SSR stranica proizvoda sa `Product` + `Offer` (`priceCurrency: "RSD"`) JSON-LD šemom i prikazom statusa isporuke
- `/vodici` i `/vodici/[slug]` — SEO tehnički vodiči za kupovinu sa `Article` + `FAQPage` JSON-LD šemama i ugrađenim karticama proizvoda
- `/checkout` — Jednostranični Guest Checkout (pouzeće, E.164 validacija telefona, 5-cifreni poštanski broj, `Idempotency-Key`)
- `/potvrda/[orderNumber]` — Potvrda porudžbine bez curenja PII podataka u URL-u
- `/provera-porudzbine` — Javna provera statusa porudžbine po broju porudžbine
- `/uslovi-kupovine` — Zakonska usklađenost u RS (14 dana pravo na odustanak, 24 meseca saobraznost)
- `/api/revalidate` — HMAC-SHA256 potpisani endpoint za ciljano osvežavanje Next.js keša (`revalidateTag` / `revalidatePath`)
- `/sitemap.xml` i `/robots.txt` — Tehnički SEO resursi
