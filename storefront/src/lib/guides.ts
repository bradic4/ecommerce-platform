export interface BuyingGuideDto {
  slug: string;
  title: string;
  excerpt: string;
  categorySlug: string;
  categoryName: string;
  publishedAt: string;
  readingTimeMinutes: number;
  seoTitle: string;
  seoDescription: string;
  relatedQuery: string;
  sections: {
    heading: string;
    body: string;
  }[];
  faqs: {
    question: string;
    answer: string;
  }[];
}

export const STATIC_BUYING_GUIDES: BuyingGuideDto[] = [
  {
    slug: "kako-izabrati-aku-busilicu-odvrtac-18v",
    title: "Kako izabrati pravu aku bušilicu-odvrtač (18V) za kuću i radionicu",
    excerpt:
      "Detaljan vodič kroz obrtni moment (Nm), brushless motore bez četkica, kapacitet Li-Ion baterija (Ah) i razliku između standardne i udarne bušilice.",
    categorySlug: "aku-i-elektricni-alati",
    categoryName: "Aku i električni alati",
    publishedAt: "2026-11-10",
    readingTimeMinutes: 6,
    seoTitle: "Kako izabrati aku bušilicu 18V — Vodič za kupovinu | Alati & Domaćinstvo",
    seoDescription:
      "Saznajte koji obrtni moment (Nm), kapacitet baterije (2.0Ah vs 4.0Ah) i tip motora (bez četkica) vam je potreban za sklapanje nameštaja, drvo, metal ili opeku.",
    relatedQuery: "busilica",
    sections: [
      {
        heading: "1. Obrtni moment (Nm) i šta on zaista znači u praksi",
        body: "Obrtni moment izražen u njutn-metrima (Nm) pokazuje silu uvrtanja. Za kućne popravke i sklapanje pločastog nameštaja (iverica, MDF) sasvim je dovoljno 30–40 Nm. Međutim, ukoliko bušite tvrdo drvo, metalne profile ili uvijate duge konstrukcione šrafove (6x120 mm), birajte modele od 50 Nm do 65 Nm sa dvobrzinskim metalnim menjačem.",
      },
      {
        heading: "2. Motor bez četkica (Brushless) naspram klasičnog motora",
        body: "Savremeni alati sa brushless motorom nemaju grafitne četkice koje stvaraju trenje i varničenje. To donosi do 30% duže trajanje baterije po jednom punjenju, manju težinu alata u ruci i znatno duži radni vek bez potrebe za servisiranjem četkica.",
      },
      {
        heading: "3. Kapacitet baterije: 2.0 Ah ili 4.0 Ah?",
        body: "Za rad na merdevinama, montažu kuhinjskih elemenata i rad iznad glave, baterija od 2.0 Ah je idealna jer održava nisku težinu alata (oko 1.2 kg). Za celodnevno bušenje ili upotrebu na brusilici i testeri iz iste 18V serije, preporučujemo paket sa dve baterije ili prelazak na 4.0 Ah.",
      },
    ],
    faqs: [
      {
        question: "Mogu li običnom aku bušilicom da bušim armirani beton u zgradi?",
        answer:
          "Ne. Obična i udarna aku bušilica mogu probušiti punu ciglu, blok i malter, ali za armirani beton i panelne zidove neophodan je elektro-pneumatski čekić sa SDS-Plus prihvatom (minimum 2.4J udarne snage).",
      },
      {
        question: "Da li su baterije kompatibilne sa drugim alatima istog brenda?",
        answer:
          "Da, svi 18V Li-Ion modeli u našoj ponudi koriste standardizovanu 18V platformu unutar istog proizvođača.",
      },
    ],
  },
  {
    slug: "izbor-aparata-za-zavarivanje-inverter-160a-200a",
    title: "Inverter aparat za varenje: Kako odabrati model za domaćinstvo i bravariju",
    excerpt:
      "Objašnjenje intermitencije (radnog ciklusa), funkcija Hot Start, Arc Force i Anti-Stick, kao i izbora debljine rutilnih i bazičnih elektroda.",
    categorySlug: "aku-i-elektricni-alati",
    categoryName: "Aku i električni alati",
    publishedAt: "2026-11-11",
    readingTimeMinutes: 5,
    seoTitle: "Kako izabrati inverter aparat za varenje (IGBT) | Vodič za kupovinu",
    seoDescription:
      "Uporedite IGBT inverter aparate za varenje od 160A i 200A. Koja struja je potrebna za elektrodu 2.5mm i 3.2mm i zašto je važna intermitencija.",
    relatedQuery: "varenje",
    sections: [
      {
        heading: "1. Koja jačina struje (Ampera) vam je realno potrebna?",
        body: "Za 90% radova u dvorištu, izradu kapija, ograda i nadstrešnica koriste se elektrode prečnika 2.5 mm (rade na 70–95 A) i 3.2 mm (rade na 110–130 A). Kvalitetan IGBT inverter od 160A sa realnom snagom bez problema topi elektrodu 3.2 mm bez obaranja kućnog osigurača od 16A.",
      },
      {
        heading: "2. Šta znače funkcije Hot Start, Anti-Stick i Arc Force?",
        body: "Hot Start kratkotrajno povećava struju u trenutku paljenja luka kako se elektroda ne bi zalepila za hladan metal. Anti-Stick automatski obara struju ako se elektroda ipak zalepi, čime sprečava njeno usijavanje i oštećenje držača.",
      },
    ],
    faqs: [
      {
        question: "Da li inverter aparat može da radi na produžnom kablu?",
        answer:
          "Može, ali produžni kabl mora imati presek provodnika od najmanje 3x2.5 mm² i biti potpuno odmotan sa motalice kako se ne bi grejao.",
      },
    ],
  },
  {
    slug: "odrzavanje-travnjaka-i-opreme-za-dvoriste",
    title: "Vodič za izbor perača pod pritiskom i opreme za održavanje dvorišta",
    excerpt:
      "Zašto je aluminijumska glava pumpe presudna kod perača pod pritiskom (135–150 bar) i kako pravilno pripremiti uređaje pre zimske sezone.",
    categorySlug: "oprema-za-kucu-i-dvoriste",
    categoryName: "Oprema za kuću i dvorište",
    publishedAt: "2026-11-12",
    readingTimeMinutes: 5,
    seoTitle: "Kako izabrati perač pod pritiskom i opremu za dvorište | Saveti",
    seoDescription:
      "Saznajte razliku između kompozitnih i aluminijumskih pumpi kod perača pod pritiskom, potreban protok vode (l/h) i savete za dugotrajnost uređaja.",
    relatedQuery: "perac",
    sections: [
      {
        heading: "1. Aluminijumska naspram plastične glave pumpe",
        body: "Najvažniji deo svakog perača pod pritiskom je glava pumpe. Modeli sa aluminijumskom pumpom otporni su na duži neprekidan rad (pranje behatona, fasada, poljoprivrednih mašina i automobila) i podnose veće temperaturne oscilacije vode.",
      },
      {
        heading: "2. Pritisak (bar) i protok vode (l/h)",
        body: "Sam pritisak od 135 bar stvara udarnu silu mlaza, ali protok vode (420 l/h i više) je ono što efikasno ispira prljavštinu sa površine. Uvek gledajte kombinaciju oba parametra.",
      },
    ],
    faqs: [
      {
        question: "Kako zaštititi perač pod pritiskom tokom zime?",
        answer:
          "Pre prvog mraza obavezno ispustite svu vodu iz pumpe i creva (uključite uređaj na 5 sekundi bez priključenog dovoda vode) i čuvajte ga u prostoriji gde temperatura ne pada ispod 0°C.",
      },
    ],
  },
];
