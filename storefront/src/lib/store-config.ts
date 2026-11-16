/**
 * Centralna konfiguracija brenda, niše i prodajnih parametara.
 * Kada odaberete konačno ime prodavnice i nišu proizvoda, dovoljno je izmeniti samo ovaj fajl.
 */
export const STORE_CONFIG = {
  brandName: "Alati & Domaćinstvo",
  brandTagline: "Specijalizovana prodavnica alata, merne opreme i uređaja za dvorište",
  badgeLabel: "PROVEREN KVALITET",
  domainUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://prodavnica.rs",
  supportPhoneDisplay: "011 / 400-55-00",
  supportPhoneHref: "tel:+381114005500",
  supportEmail: "podrska@prodavnica.rs",
  workingHours: "Pon – Pet: 08:00 – 17:00h | Sub: 09:00 – 14:00h",
  freeShippingThresholdRsd: 12000,
  standardShippingCostRsd: 490,
  couriers: ["PostExpress (Pošta Srbije)", "BEX Express", "D Express"],
  legalInfo: {
    companyName: "ALATI I DOMAĆINSTVO PR BEOGRAD",
    activityCode: "4791 — Trgovina na malo posredstvom pošte ili preko interneta",
    pib: "110000000 (u pripremi)",
    maticniBroj: "65000000 (u pripremi)",
    city: "Beograd, Republika Srbija",
  },
  quickSearchSuggestions: [
    "aku bušilica 18V",
    "inverter varenje",
    "perač pod pritiskom",
    "ugaona brusilica",
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
      title: "Tačan i iskren status lagera",
      desc: "Jasno odvajamo artikle u našem magacinu (1–2 dana) od artikala sa lagera dobavljača (2–5 dana).",
    },
  ],
};
