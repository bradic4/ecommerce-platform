import type {
  CatalogProductItemDto,
  CategoryDto,
  CheckoutItemRequestDto,
  CheckoutQuoteResponseDto,
  ProductDetailDto,
} from "./api";
import { STORE_CONFIG } from "./store-config";

export interface TrainingProductRecord {
  id: string;
  variantId: string;
  name: string;
  slug: string;
  sku: string;
  ean: string;
  brandName: string;
  brandSlug: string;
  categoryName: string;
  categorySlug: string;
  shortSpecification: string;
  description: string;
  costPriceRsd: number;
  priceRsd: number;
  ownStockQty: number;
  reservedOwnStockQty: number;
  supplierStockQty: number;
  supplierLeadTimeDays: number;
  supplierName: string;
  imageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface TrainingOrderItem {
  variantId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPriceRsd: number;
  unitCostRsd: number;
  lineTotalRsd: number;
  fulfillmentSource: "OwnStock" | "SupplierDropship";
}

export interface TrainingOrderRecord {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerFullName: string;
  customerPhone: string;
  customerEmail: string;
  streetAndNumber: string;
  city: string;
  postalCode: string;
  deliveryNotes?: string;
  paymentMethod: "CashOnDelivery" | "IpsQr";
  status:
    | "PendingConfirmation"
    | "Confirmed"
    | "Dispatched"
    | "DeliveredPaid"
    | "ReturnedUnclaimed"
    | "Cancelled";
  riskLevel: "Low" | "Medium" | "High";
  riskNote: string;
  subtotalRsd: number;
  discountRsd: number;
  shippingRsd: number;
  totalRsd: number;
  appliedCouponCode?: string;
  courierName?: string;
  trackingNumber?: string;
  fiscalInvoiceNumber?: string;
  items: TrainingOrderItem[];
}

export interface TrainingSupplierRecord {
  id: string;
  name: string;
  code: string;
  reliabilityScore: number;
  defaultLeadTimeDays: number;
  pricesIncludeVat: boolean;
  skuColumn: string;
  nameColumn: string;
  costColumn: string;
  stockColumn: string;
  eanColumn: string;
  categoryColumn: string;
  lastSyncAt: string;
  activeSkusCount: number;
}

export interface TrainingPricingRuleRecord {
  id: string;
  name: string;
  categorySlug: string;
  targetGrossMarginPct: number;
  minMarginFloorPct: number;
  expectedUnclaimedCodRatePct: number;
  fixedReturnShippingRsd: number;
  psychologicalRounding: "90" | "99" | "100";
}

export interface TrainingCouponRecord {
  id: string;
  code: string;
  description: string;
  discountPercent: number;
  minOrderSubtotalRsd: number;
  minAllowedMarginAfterDiscountPct: number;
  isActive: boolean;
  usedCount: number;
}

export interface TrainingRmaRecord {
  id: string;
  rmaNumber: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  productSku: string;
  productName: string;
  type: "Withdrawal14Days" | "Warranty24Months";
  reason: string;
  createdAt: string;
   statutoryDeadlineDays: number;
  status: "Received" | "AnsweredWithin8Days" | "ResolvedRestocked" | "Rejected";
  adminResponseNote?: string;
}

export interface TrainingDatabase {
  categories: CategoryDto[];
  products: TrainingProductRecord[];
  orders: TrainingOrderRecord[];
  suppliers: TrainingSupplierRecord[];
  pricingRules: TrainingPricingRuleRecord[];
  coupons: TrainingCouponRecord[];
  rmas: TrainingRmaRecord[];
}

const STORAGE_KEY = "nalageru_training_db_v1";

export const INITIAL_TRAINING_DB: TrainingDatabase = {
  categories: [
    {
      id: "cat-tehnika",
      name: "Tehnika i elektronika",
      slug: "tehnika-i-elektronika",
      seoTitle: "Tehnika, računarska oprema i pametna elektronika | NaLageru.rs",
      seoDescription:
        "GaN punjači, mehaničke tastature, IPS monitori, UPS uređaji i pametna elektronika sa jasnim statusom lagera i brzom isporukom.",
      introText:
        "Proverena računarska periferija, napajanja i pametna elektronika sa tačnom informacijom da li se artikal šalje iz našeg magacina danas ili sa lagera uvoznika.",
      productCount: 4,
    },
    {
      id: "cat-alati",
      name: "Aku i električni alati",
      slug: "aku-i-elektricni-alati",
      seoTitle: "Aku i električni alati sa 24 meseca garancije | NaLageru.rs",
      seoDescription:
        "Aku bušilice, ugaone brusilice, digitalni multimetri i laserski niveliri sa fiskalnim računom i isporukom za 1 do 3 radna dana.",
      introText:
        "Pouzdani alati i merna oprema za servisere, električare i kućne majstore uz transparentan status zaliha.",
      productCount: 3,
    },
    {
      id: "cat-kuca",
      name: "Oprema za kuću i dvorište",
      slug: "oprema-za-kucu-i-dvoriste",
      seoTitle: "Oprema za kuću, radionicu i dvorište | NaLageru.rs",
      seoDescription:
        "Perači pod pritiskom, LED reflektori i oprema za održavanje domaćinstva sa garancijom od 24 meseca.",
      introText:
        "Praktična oprema za domaćinstvo, garažu i dvorište sa brzim kurirskim slanjem širom Srbije.",
      productCount: 1,
    },
  ],
  products: [
    {
      id: "prod-1",
      variantId: "var-101",
      name: "GaN Pro 65W Brzi Punjač USB-C PD 3.0 (3 porta, PPS)",
      slug: "gan-pro-65w-brzi-punjac-usb-c-pd3",
      sku: "NL-GAN-65W",
      ean: "8606019841010",
      brandName: "VoltCore",
      brandSlug: "voltcore",
      categoryName: "Tehnika i elektronika",
      categorySlug: "tehnika-i-elektronika",
      shortSpecification: "65W GaN III • 2× USB-C + 1× USB-A • Za laptop i telefon",
      description:
        "Kompaktni GaN III brzi punjač snage 65W sa dva USB-C PD 3.0 PPS izlaza i jednim USB-A QC 3.0 izlazom. Puni ultrabook laptopove (MacBook, ThinkPad, Dell), tablete i pametne telefone uz minimalno zagrevanje i aktivnu zaštitu od prenapona.",
      costPriceRsd: 2350,
      priceRsd: 3990,
      ownStockQty: 14,
      reservedOwnStockQty: 2,
      supplierStockQty: 45,
      supplierLeadTimeDays: 3,
      supplierName: "EWE Comp Beograd",
      seoTitle: "GaN Pro 65W USB-C PD 3.0 Brzi Punjač za laptop i telefon | NaLageru.rs",
      seoDescription:
        "Na našem lageru — slanje danas! GaN III 65W punjač sa 3 porta za laptop i telefon uz 24 meseca garancije.",
    },
    {
      id: "prod-2",
      variantId: "var-102",
      name: "Mehanička Tastatura Tactile Pro TKL (Hot-Swap, RGB, YU/US)",
      slug: "mehanicka-tastatura-tactile-pro-tkl-hotswap",
      sku: "NL-KB-TKL87",
      ean: "8606019841027",
      brandName: "KeyForge",
      brandSlug: "keyforge",
      categoryName: "Tehnika i elektronika",
      categorySlug: "tehnika-i-elektronika",
      shortSpecification: "87 tastera (TKL) • Hot-Swap 5-pin • PBT kapice • USB-C",
      description:
        "Mehanička TKL tastatura sa fabrički podmazanim taktilnim prekidačima, višeslojnom zvučnom izolacijom kućišta (Gasket mount), PBT double-shot kapicama i odvojivim USB-C kablom.",
      costPriceRsd: 4900,
      priceRsd: 7990,
      ownStockQty: 6,
      reservedOwnStockQty: 1,
      supplierStockQty: 20,
      supplierLeadTimeDays: 3,
      supplierName: "CT Computers",
      seoTitle: "Mehanička Tastatura Tactile Pro TKL Hot-Swap PBT | NaLageru.rs",
      seoDescription:
        "Mehanička TKL tastatura na našem lageru. Hot-swap prekidači, PBT kapice, isporuka za 1–2 radna dana.",
    },
    {
      id: "prod-3",
      variantId: "var-103",
      name: '27" QHD IPS Monitor 165Hz 1ms (2560×1440, USB-C 65W, Pivot)',
      slug: "monitor-27-qhd-ips-165hz-usbc-pivot",
      sku: "NL-MON-27QHD",
      ean: "8606019841034",
      brandName: "VisionTek",
      brandSlug: "visiontek",
      categoryName: "Tehnika i elektronika",
      categorySlug: "tehnika-i-elektronika",
      shortSpecification: '27" 2560×1440 IPS • 165Hz • USB-C 65W PD • Podesiv po visini',
      description:
        "Profesionalni i gejming 27-inčni QHD IPS monitor sa osvežavanjem od 165Hz, 99% sRGB pokrivenošću, ergonomskim postoljem sa pivot funkcijom i USB-C ulazom koji istovremeno prenosi sliku i puni laptop snagom do 65W.",
      costPriceRsd: 21500,
      priceRsd: 28990,
      ownStockQty: 0,
      reservedOwnStockQty: 0,
      supplierStockQty: 12,
      supplierLeadTimeDays: 3,
      supplierName: "Comtrade Distribution",
      seoTitle: '27" QHD IPS Monitor 165Hz sa USB-C 65W i Pivot postoljem | NaLageru.rs',
      seoDescription:
        "Dostupno na lageru dobavljača (isporuka 2–5 radnih dana). Besplatna dostava i 24 meseca garancije.",
    },
    {
      id: "prod-4",
      variantId: "var-104",
      name: "Line-Interactive UPS 1000VA / 600W sa AVR stabilizacijom i LCD ekranom",
      slug: "ups-1000va-600w-avr-lcd-stabilizator",
      sku: "NL-UPS-1000LCD",
      ean: "8606019841041",
      brandName: "VoltCore",
      brandSlug: "voltcore",
      categoryName: "Tehnika i elektronika",
      categorySlug: "tehnika-i-elektronika",
      shortSpecification: "1000VA / 600W • Automatska regulacija napona (AVR) • 2× Šuko",
      description:
        "Neprekidno napajanje (UPS) sa ugrađenim AVR stabilizatorom napona i preglednim LCD ekranom. Štiti računare, NAS servere, rutere i fiskalne kase od nestanka struje i naglih skokova napona.",
      costPriceRsd: 6200,
      priceRsd: 9490,
      ownStockQty: 4,
      reservedOwnStockQty: 0,
      supplierStockQty: 18,
      supplierLeadTimeDays: 3,
      supplierName: "EWE Comp Beograd",
    },
    {
      id: "prod-5",
      variantId: "var-105",
      name: "Digitalni True-RMS Multimetar Auto-Range (6000 counts, NCV, Temp)",
      slug: "digitalni-true-rms-multimetar-autorange-ncv",
      sku: "NL-DMM-6000",
      ean: "8606019841058",
      brandName: "ProTech",
      brandSlug: "protech",
      categoryName: "Aku i električni alati",
      categorySlug: "aku-i-elektricni-alati",
      shortSpecification: "True-RMS 6000 counts • Beskontaktna detekcija napona • Termosonda",
      description:
        "Precizni True-RMS digitalni multimetar za elektroničare i električare. Meri AC/DC napon do 1000V, struju do 10A, kapacitet, frekvenciju i temperaturu uz NCV beskontaktnu detekciju faze i pozadinsko osvetljenje.",
      costPriceRsd: 2600,
      priceRsd: 4490,
      ownStockQty: 9,
      reservedOwnStockQty: 0,
      supplierStockQty: 30,
      supplierLeadTimeDays: 3,
      supplierName: "ProTech Alati Srbija",
    },
    {
      id: "prod-6",
      variantId: "var-106",
      name: "Aku Bušilica-Odvrtač 18V Brushless (2× 2.0Ah Li-Ion, 55Nm, Kofer)",
      slug: "aku-busilica-odvrtac-18v-brushless-2x2ah",
      sku: "NL-AKU-18V55",
      ean: "8606019841065",
      brandName: "ProTech",
      brandSlug: "protech",
      categoryName: "Aku i električni alati",
      categorySlug: "aku-i-elektricni-alati",
      shortSpecification: "18V Motor bez četkica • 55 Nm • Metalni futer 13mm • 2 baterije",
      description:
        "Snažna akumulatorska bušilica-odvrtač sa Brushless motorom bez četkica, obrtnim momentom od 55 Nm, brzim metalnim futerom od 13 mm, dve Li-Ion baterije od 2.0 Ah i brzim punjačem u transportnom koferu.",
      costPriceRsd: 7800,
      priceRsd: 11990,
      ownStockQty: 5,
      reservedOwnStockQty: 1,
      supplierStockQty: 25,
      supplierLeadTimeDays: 3,
      supplierName: "ProTech Alati Srbija",
    },
    {
      id: "prod-7",
      variantId: "var-107",
      name: "4D Zeleni Laserski Nivelir 16 Linija (360°, 2 Baterije, Stativ + Daljinski)",
      slug: "4d-zeleni-laserski-nivelir-16-linija-360",
      sku: "NL-LAS-4D16",
      ean: "8606019841072",
      brandName: "ProTech",
      brandSlug: "protech",
      categoryName: "Aku i električni alati",
      categorySlug: "aku-i-elektricni-alati",
      shortSpecification: "16 zelenih linija (4×360°) • Samonivelisanje ±3° • IP54 zaštita",
      description:
        "Profesionalni 4D zeleni laserski nivelir sa 16 linija (dve horizontalne i dve vertikalne ravni od 360 stepeni), visokovidljivom Osram zelenom diodom, magnetnim zidnim nosačem, daljinskim upravljačem i dve punjive baterije.",
      costPriceRsd: 6900,
      priceRsd: 10490,
      ownStockQty: 0,
      reservedOwnStockQty: 0,
      supplierStockQty: 16,
      supplierLeadTimeDays: 3,
      supplierName: "ProTech Alati Srbija",
    },
    {
      id: "prod-8",
      variantId: "var-108",
      name: "Perač Pod Pritiskom 160 Bara 2200W (Aluminijumska pumpa, Kotur, 8m crevo)",
      slug: "perac-pod-pritiskom-160-bara-2200w-alu-pumpa",
      sku: "NL-WP-160B",
      ean: "8606019841089",
      brandName: "AquaForce",
      brandSlug: "aquaforce",
      categoryName: "Oprema za kuću i dvorište",
      categorySlug: "oprema-za-kucu-i-dvoriste",
      shortSpecification: "160 bar • 2200W • Aluminijumska glava pumpe • Posuda za šampon",
      description:
        "Visokopritisni perač snage 2200W sa izdržljivom aluminijumskom pumpom, radnim pritiskom do 160 bara, armiranim crevom dužine 8 metara na koturu i penomatom za beskontaktno pranje automobila, terasa i fasada.",
      costPriceRsd: 10900,
      priceRsd: 15990,
      ownStockQty: 3,
      reservedOwnStockQty: 0,
      supplierStockQty: 14,
      supplierLeadTimeDays: 4,
      supplierName: "Agromarket Kragujevac",
    },
  ],
  orders: [
    {
      id: "ord-1",
      orderNumber: "ORD-20261119-001",
      createdAt: "2026-11-19T09:15:00",
      customerFullName: "Marko Petrović",
      customerPhone: "0641234567",
      customerEmail: "marko.petrovic@example.rs",
      streetAndNumber: "Bulevar oslobođenja 84/12",
      city: "Novi Sad",
      postalCode: "21000",
      deliveryNotes: "Interfon Petrović, 3. sprat. Pozvati 15 min pre dostave.",
      paymentMethod: "CashOnDelivery",
      status: "PendingConfirmation",
      riskLevel: "Low",
      riskNote: "Validan +381 broj i poštanski broj 21000. Nema istorije nepreuzetih paketa.",
      subtotalRsd: 11980,
      discountRsd: 0,
      shippingRsd: 0,
      totalRsd: 11980,
      items: [
        {
          variantId: "var-101",
          sku: "NL-GAN-65W",
          productName: "GaN Pro 65W Brzi Punjač USB-C PD 3.0 (3 porta, PPS)",
          quantity: 1,
          unitPriceRsd: 3990,
          unitCostRsd: 2350,
          lineTotalRsd: 3990,
          fulfillmentSource: "OwnStock",
        },
        {
          variantId: "var-102",
          sku: "NL-KB-TKL87",
          productName: "Mehanička Tastatura Tactile Pro TKL (Hot-Swap, RGB, YU/US)",
          quantity: 1,
          unitPriceRsd: 7990,
          unitCostRsd: 4900,
          lineTotalRsd: 7990,
          fulfillmentSource: "OwnStock",
        },
      ],
    },
    {
      id: "ord-2",
      orderNumber: "ORD-20261119-002",
      createdAt: "2026-11-19T10:40:00",
      customerFullName: "Jelena Nikolić",
      customerPhone: "0639876543",
      customerEmail: "jelena.nikolic@example.rs",
      streetAndNumber: "Cara Dušana 19",
      city: "Niš",
      postalCode: "18000",
      paymentMethod: "IpsQr",
      status: "Confirmed",
      riskLevel: "Low",
      riskNote: "IPS QR uplata evidentirana. Spremno za pakovanje i štampu otpremnice.",
      subtotalRsd: 11990,
      discountRsd: 1199,
      shippingRsd: 0,
      totalRsd: 10791,
      appliedCouponCode: "DOBRODOSLI10",
      items: [
        {
          variantId: "var-106",
          sku: "NL-AKU-18V55",
          productName: "Aku Bušilica-Odvrtač 18V Brushless (2× 2.0Ah Li-Ion, 55Nm, Kofer)",
          quantity: 1,
          unitPriceRsd: 11990,
          unitCostRsd: 7800,
          lineTotalRsd: 11990,
          fulfillmentSource: "OwnStock",
        },
      ],
    },
    {
      id: "ord-3",
      orderNumber: "ORD-20261118-019",
      createdAt: "2026-11-18T14:20:00",
      customerFullName: "Dejan Ilić",
      customerPhone: "0654443322",
      customerEmail: "dejan.ilic@example.rs",
      streetAndNumber: "Vojvode Stepe 214",
      city: "Beograd",
      postalCode: "11000",
      paymentMethod: "CashOnDelivery",
      status: "Dispatched",
      riskLevel: "Medium",
      riskNote: "Visoka vrednost pouzeća (>25.000 RSD) — potvrđeno telefonskim pozivom.",
      subtotalRsd: 28990,
      discountRsd: 0,
      shippingRsd: 0,
      totalRsd: 28990,
      courierName: "PostExpress",
      trackingNumber: "PE984120394RS",
      fiscalInvoiceNumber: "PFR-2026-88412-09",
      items: [
        {
          variantId: "var-103",
          sku: "NL-MON-27QHD",
          productName: '27" QHD IPS Monitor 165Hz 1ms (2560×1440, USB-C 65W, Pivot)',
          quantity: 1,
          unitPriceRsd: 28990,
          unitCostRsd: 21500,
          lineTotalRsd: 28990,
          fulfillmentSource: "SupplierDropship",
        },
      ],
    },
  ],
  suppliers: [
    {
      id: "sup-1",
      name: "EWE Comp Beograd (IT & Napajanja)",
      code: "EWE-RS",
      reliabilityScore: 98,
      defaultLeadTimeDays: 3,
      pricesIncludeVat: false,
      skuColumn: "SifraArtikla",
      nameColumn: "NazivProizvoda",
      costColumn: "VpCenaBezPdv",
      stockColumn: "StanjeLager",
      eanColumn: "BarkodEAN",
      categoryColumn: "Grupa",
      lastSyncAt: "2026-11-19 08:30",
      activeSkusCount: 2,
    },
    {
      id: "sup-2",
      name: "ProTech Alati Srbija (Alati i Merna oprema)",
      code: "PROTECH-RS",
      reliabilityScore: 95,
      defaultLeadTimeDays: 3,
      pricesIncludeVat: true,
      skuColumn: "SKU",
      nameColumn: "Naziv",
      costColumn: "NabavnaSaPDV",
      stockColumn: "Kolicina",
      eanColumn: "EAN13",
      categoryColumn: "Kategorija",
      lastSyncAt: "2026-11-19 07:45",
      activeSkusCount: 3,
    },
    {
      id: "sup-3",
      name: "Comtrade Distribution (Monitori i Periferija)",
      code: "CT-DIST",
      reliabilityScore: 97,
      defaultLeadTimeDays: 3,
      pricesIncludeVat: false,
      skuColumn: "ProductCode",
      nameColumn: "ProductName",
      costColumn: "DealerNetPrice",
      stockColumn: "AvailableQty",
      eanColumn: "EAN",
      categoryColumn: "Category",
      lastSyncAt: "2026-11-19 09:00",
      activeSkusCount: 2,
    },
  ],
  pricingRules: [
    {
      id: "rule-1",
      name: "Tehnika i elektronika — Standard",
      categorySlug: "tehnika-i-elektronika",
      targetGrossMarginPct: 28,
      minMarginFloorPct: 16,
      expectedUnclaimedCodRatePct: 3.5,
      fixedReturnShippingRsd: 820,
      psychologicalRounding: "90",
    },
    {
      id: "rule-2",
      name: "Aku i električni alati — Standard",
      categorySlug: "aku-i-elektricni-alati",
      targetGrossMarginPct: 32,
      minMarginFloorPct: 18,
      expectedUnclaimedCodRatePct: 4.0,
      fixedReturnShippingRsd: 950,
      psychologicalRounding: "90",
    },
    {
      id: "rule-3",
      name: "Oprema za kuću i dvorište — Kabasti paketi",
      categorySlug: "oprema-za-kucu-i-dvoriste",
      targetGrossMarginPct: 30,
      minMarginFloorPct: 18,
      expectedUnclaimedCodRatePct: 4.5,
      fixedReturnShippingRsd: 1250,
      psychologicalRounding: "90",
    },
  ],
  coupons: [
    {
      id: "cup-1",
      code: "DOBRODOSLI10",
      description: "10% popusta za prvu porudžbinu (uz zaštitu minimalne marže od 14%)",
      discountPercent: 10,
      minOrderSubtotalRsd: 5000,
      minAllowedMarginAfterDiscountPct: 14,
      isActive: true,
      usedCount: 12,
    },
    {
      id: "cup-2",
      code: "MAJSTOR5",
      description: "5% popusta na alate i mernu opremu",
      discountPercent: 5,
      minOrderSubtotalRsd: 4000,
      minAllowedMarginAfterDiscountPct: 15,
      isActive: true,
      usedCount: 7,
    },
  ],
  rmas: [
    {
      id: "rma-1",
      rmaNumber: "RMA-2026-004",
      orderNumber: "ORD-20261112-008",
      customerName: "Milan Kovačević",
      customerPhone: "0623334455",
      customerEmail: "milan.kovacevic@example.rs",
      productSku: "NL-GAN-65W",
      productName: "GaN Pro 65W Brzi Punjač USB-C PD 3.0 (3 porta, PPS)",
      type: "Withdrawal14Days",
      reason: "Kupac želi zamenu ili odustanak u roku od 14 dana (neotpakovano, želi jači model od 100W).",
      createdAt: "2026-11-18",
      statutoryDeadlineDays: 14,
      status: "Received",
    },
    {
      id: "rma-2",
      rmaNumber: "RMA-2026-003",
      orderNumber: "ORD-20261029-014",
      customerName: "Stefan Pavlović",
      customerPhone: "0647778899",
      customerEmail: "stefan.pavlovic@example.rs",
      productSku: "NL-DMM-6000",
      productName: "Digitalni True-RMS Multimetar Auto-Range (6000 counts, NCV, Temp)",
      type: "Warranty24Months",
      reason: "Prekid na termosondi za merenje temperature. Zakonski rok za odgovor je 8 dana.",
      createdAt: "2026-11-16",
      statutoryDeadlineDays: 8,
      status: "AnsweredWithin8Days",
      adminResponseNote:
        "Reklamacija uvažena u roku od 48h. Poslata nova termosonda i zamenski uređaj o našem trošku.",
    },
  ],
};

function normalizeSerbianSearch(input: string): string {
  const cyrToLat: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    ђ: "dj",
    е: "e",
    ж: "z",
    з: "z",
    и: "i",
    ј: "j",
    к: "k",
    л: "l",
    љ: "lj",
    м: "m",
    н: "n",
    њ: "nj",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    ћ: "c",
    у: "u",
    ф: "f",
    х: "h",
    ц: "c",
    ч: "c",
    џ: "dz",
    ш: "s",
  };

  return input
    .toLowerCase()
    .split("")
    .map((ch) => cyrToLat[ch] ?? ch)
    .join("")
    .replace(/đ/g, "dj")
    .replace(/[čć]/g, "c")
    .replace(/š/g, "s")
    .replace(/ž/g, "z");
}

export function loadTrainingDb(): TrainingDatabase {
  if (typeof window === "undefined") {
    return INITIAL_TRAINING_DB;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TRAINING_DB));
      return INITIAL_TRAINING_DB;
    }
    const parsed = JSON.parse(raw) as TrainingDatabase;
    if (!parsed.products || !parsed.orders) {
      return INITIAL_TRAINING_DB;
    }
    return parsed;
  } catch {
    return INITIAL_TRAINING_DB;
  }
}

export function saveTrainingDb(db: TrainingDatabase): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Ignore storage quota issues
  }
}

export function resetTrainingDb(): TrainingDatabase {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TRAINING_DB));
  }
  return JSON.parse(JSON.stringify(INITIAL_TRAINING_DB)) as TrainingDatabase;
}

export function toCatalogProductItem(p: TrainingProductRecord): CatalogProductItemDto {
  const freeOwn = Math.max(0, p.ownStockQty - p.reservedOwnStockQty);
  const ownStockAvailable = freeOwn > 0;
  const isOrderable = freeOwn > 0 || p.supplierStockQty > 0;
  const availabilityLabel = ownStockAvailable
    ? "Na našem lageru (1–2 radna dana)"
    : p.supplierStockQty > 0
      ? `Lager dobavljača (2–${Math.max(4, p.supplierLeadTimeDays + 1)} radnih dana)`
      : "Trenutno rasprodato";

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    brandName: p.brandName,
    brandSlug: p.brandSlug,
    categoryName: p.categoryName,
    categorySlug: p.categorySlug,
    shortSpecification: p.shortSpecification,
    variantId: p.variantId,
    sku: p.sku,
    ean: p.ean,
    priceRsd: p.priceRsd,
    currency: "RSD",
    isOrderable,
    ownStockAvailable,
    availabilityLabel,
  };
}

export function toProductDetailDto(p: TrainingProductRecord): ProductDetailDto {
  const item = toCatalogProductItem(p);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    shortSpecification: p.shortSpecification,
    gtinEan: p.ean,
    seoTitle: p.seoTitle || `${p.name} | NaLageru.rs`,
    seoDescription: p.seoDescription || p.description,
    category: {
      name: p.categoryName,
      slug: p.categorySlug,
    },
    variants: [
      {
        id: p.variantId,
        internalSku: p.sku,
        title: "Standardno fabričko pakovanje (24m garancije)",
        gtinEan: p.ean,
        attributeSummary: p.shortSpecification,
        priceRsd: p.priceRsd,
        currency: "RSD",
        isOrderable: item.isOrderable,
        ownStockAvailable: item.ownStockAvailable,
        publicStatusLabel: item.availabilityLabel,
        estimatedLeadTimeDays: item.ownStockAvailable ? 1 : p.supplierLeadTimeDays,
        schemaAvailability: item.isOrderable
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      },
    ],
    aggregateRating: {
      ratingValue: 4.9,
      reviewCount: 7,
    },
    reviews: [
      {
        id: `rev-${p.id}-1`,
        authorName: "Nikola S. (Novi Sad)",
        isVerifiedPurchase: true,
        rating: 5,
        title: "Tačan status lagera i brza isporuka",
        comment:
          "Poručeno radnim danom pre 13h, stiglo sutradan PostExpressom uz fiskalni račun i obrazac za garanciju.",
        adminTechnicalReply:
          "Hvala Nikola! Svi artikli sa oznakom 'Naš lager' šalju se istog dana iz našeg magacina.",
        createdAt: "2026-11-14T11:20:00",
      },
    ],
  };
}

export function getFallbackCategories(): CategoryDto[] {
  const db = loadTrainingDb();
  return db.categories.map((c) => ({
    ...c,
    productCount: db.products.filter((p) => p.categorySlug === c.slug).length,
  }));
}

export function getFallbackCatalogProducts(params?: {
  q?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  inStockOnly?: boolean;
}): CatalogProductItemDto[] {
  const db = loadTrainingDb();
  let list = db.products.map(toCatalogProductItem);

  if (params?.category) {
    list = list.filter((p) => p.categorySlug === params.category);
  }
  if (params?.brand) {
    list = list.filter((p) => p.brandSlug === params.brand);
  }
  if (params?.minPrice !== undefined) {
    list = list.filter((p) => p.priceRsd >= params.minPrice!);
  }
  if (params?.maxPrice !== undefined) {
    list = list.filter((p) => p.priceRsd <= params.maxPrice!);
  }
  if (params?.inStockOnly) {
    list = list.filter((p) => p.isOrderable);
  }
  if (params?.q) {
    const qNorm = normalizeSerbianSearch(params.q.trim());
    list = list.filter((p) => {
      const hay = normalizeSerbianSearch(
        `${p.name} ${p.sku || ""} ${p.ean || ""} ${p.brandName || ""} ${p.shortSpecification || ""} ${p.categoryName || ""}`
      );
      return hay.includes(qNorm);
    });
  }

  if (params?.sort === "price_asc") {
    list.sort((a, b) => a.priceRsd - b.priceRsd);
  } else if (params?.sort === "price_desc") {
    list.sort((a, b) => b.priceRsd - a.priceRsd);
  }

  return list;
}

export function getFallbackProductBySlug(slug: string): ProductDetailDto | null {
  const db = loadTrainingDb();
  const found = db.products.find((p) => p.slug === slug);
  return found ? toProductDetailDto(found) : null;
}

export function buildFallbackCheckoutQuote(
  items: CheckoutItemRequestDto[],
  couponCode?: string
): CheckoutQuoteResponseDto {
  const db = loadTrainingDb();
  const lines = items.map((req) => {
    const prod = db.products.find((p) => p.variantId === req.variantId);
    if (!prod) {
      return {
        variantId: req.variantId,
        internalSku: "NEPOZNATO",
        productName: "Artikal nije pronađen",
        quantity: req.quantity,
        unitPriceRsd: 0,
        lineTotalRsd: 0,
        fulfillmentSource: "Unavailable",
        publicAvailabilityLabel: "Nedostupno",
        isAvailable: false,
      };
    }
    const freeOwn = Math.max(0, prod.ownStockQty - prod.reservedOwnStockQty);
    const totalAvail = freeOwn + prod.supplierStockQty;
    const isAvailable = totalAvail >= req.quantity;
    const fromOwn = freeOwn >= req.quantity;

    return {
      variantId: prod.variantId,
      internalSku: prod.sku,
      productName: prod.name,
      quantity: req.quantity,
      unitPriceRsd: prod.priceRsd,
      lineTotalRsd: prod.priceRsd * req.quantity,
      fulfillmentSource: fromOwn ? "OwnStock" : "SupplierDropship",
      publicAvailabilityLabel: fromOwn
        ? "Na našem lageru (isporuka 1–2 radna dana)"
        : "Sa lagera dobavljača (isporuka 2–5 radnih dana)",
      isAvailable,
    };
  });

  const subtotalRsd = lines.reduce((acc, l) => acc + l.lineTotalRsd, 0);
  let discountRsd = 0;
  let appliedCouponCode: string | undefined;
  let couponMessage: string | undefined;

  if (couponCode && couponCode.trim()) {
    const code = couponCode.trim().toUpperCase();
    const coupon = db.coupons.find((c) => c.code.toUpperCase() === code && c.isActive);
    if (!coupon) {
      couponMessage = "Uneti promo kod nije aktivan ili ne postoji.";
    } else if (subtotalRsd < coupon.minOrderSubtotalRsd) {
      couponMessage = `Minimalni iznos porudžbine za kupon ${coupon.code} je ${coupon.minOrderSubtotalRsd} RSD.`;
    } else {
      discountRsd = Math.round((subtotalRsd * coupon.discountPercent) / 100);
      appliedCouponCode = coupon.code;
      couponMessage = `Kupon ${coupon.code} (-${coupon.discountPercent}%) je uspešno obračunat.`;
    }
  }

  const afterDiscount = Math.max(0, subtotalRsd - discountRsd);
  const shippingCostRsd =
    afterDiscount >= STORE_CONFIG.freeShippingThresholdRsd || afterDiscount === 0
      ? 0
      : STORE_CONFIG.standardShippingFeeRsd;
  const totalRsd = afterDiscount + shippingCostRsd;
  const canProceed = lines.length > 0 && lines.every((l) => l.isAvailable);

  return {
    lines,
    subtotalRsd,
    discountRsd,
    appliedCouponCode,
    couponMessage,
    shippingCostRsd,
    totalRsd,
    canProceed,
    validationError: canProceed
      ? undefined
      : "Jedan ili više artikala u korpi trenutno nema dovoljnu količinu na lageru.",
  };
}
