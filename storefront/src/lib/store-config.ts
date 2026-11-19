/**
 * Centralna konfiguracija brenda NaLageru (nalageru.rs).
 */
export const STORE_CONFIG = {
  brandName: "NaLageru",
  domain: "nalageru.rs",
  brandTagline:
    "Tehnika, elektronika i oprema uz jasan status lagera i roka isporuke",
  metaTitleSuffix: "Tehnika i oprema sa proverenim stanjem lagera",
  metaDescription:
    "NaLageru.rs: tehnika, elektronika i praktična oprema. Jasno razdvojen sopstveni magacin (1–2 dana) i lager dobavljača (2–5 dana) uz plaćanje pouzećem ili NBS IPS QR kodom.",
  delivery: { own: "1–2 radna dana", supplier: "2–5 radnih dana" },
  badgeLabel: "PROVEREN LAGER",
  domainUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://nalageru.rs",
  supportPhoneDisplay: "011 / 400-55-00",
  supportPhoneHref: "tel:+381114005500",
  supportEmail: "podrska@nalageru.rs",
  workingHours: "Pon – Pet: 08:00 – 17:00h | Sub: 09:00 – 14:00h",
  freeShippingThresholdRsd: 12000,
  standardShippingCostRsd: 490,
  standardShippingFeeRsd: 490,
  couriers: ["PostExpress (Pošta Srbije)", "BEX Express", "D Express"],
  legalInfo: {
    companyName: "NALAGERU DOO BEOGRAD (u osnivanju)",
    activityCode:
      "4791 — Trgovina na malo posredstvom pošte ili preko interneta",
    pib: "110000000 (u pripremi)",
    maticniBroj: "65000000 (u pripremi)",
    city: "Beograd, Republika Srbija",
  },
  quickSearchSuggestions: [
    "GaN 65W",
    "mehanička tastatura",
    "monitor 27",
    "UPS 1000VA",
    "bušilica 18V",
    "multimetar",
  ],
  trustHighlights: [
    {
      title: "Plaćanje pri preuzimanju ili IPS QR",
      desc: "Platite gotovinom kuriru tek kada paket stigne na vašu adresu ili instant m-banking nalogom.",
    },
    {
      title: "14 dana pravo na odustanak",
      desc: "Potpuna zakonska zaštita potrošača uz online RMA portal bez skrivenih uslova.",
    },
    {
      title: "24 meseca zakonske saobraznosti",
      desc: "Svaki uređaj dolazi sa fiskalnim računom i punom garancijom od 2 godine u Srbiji.",
    },
    {
      title: "Iskren prikaz izvora i roka",
      desc: "Jasno odvajamo artikle u našem magacinu (1–2 dana) od artikala sa centralnog lagera dobavljača (2–5 dana).",
    },
  ],
};
