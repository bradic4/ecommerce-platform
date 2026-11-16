using Ecommerce.Application.Services;
using Ecommerce.Domain.Common;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Infrastructure.Persistence;

public static class CatalogSeeder
{
    public static async Task SeedAsync(EcommerceDbContext db, CancellationToken ct = default)
    {
        if (await db.Products.AnyAsync(ct))
            return;

        var pricingEngine = new PricingEngine();

        var globalRule = new PricingRule
        {
            Name = "Standardna porodična marža (x1.35 + COD zaštita)",
            Scope = PricingRuleScope.Global,
            MarkupMultiplier = 1.35m,
            FixedHandlingFeeRsd = 80m,
            MinGrossMarginPercent = 18m,
            MinProfitFloorRsd = 450m,
            ExpectedUnclaimedRate = 0.06m,
            EstimatedTwoWayShippingCostRsd = 750m,
            RoundToWholeTenRsd = true,
            IsActive = true
        };
        db.PricingRules.Add(globalRule);

        var ownLocation = new InventoryLocation
        {
            Name = "Glavni porodični magacin (Beograd)",
            Type = InventoryLocationType.Own
        };
        db.InventoryLocations.Add(ownLocation);

        var supA = new Supplier
        {
            Name = "TehnoDistribucija DOO Šimanovci",
            Code = "SUP-TEHNO",
            ContactEmail = "veleprodaja@tehnodist.rs",
            LeadTimeDays = 1,
            Priority = 1,
            DefaultFulfillmentModel = FulfillmentModel.ModelB_CrossDock,
            CodCollectionMode = CodCollectionMode.OurCarrierAccount
        };

        var supB = new Supplier
        {
            Name = "AlatiBalkan Import Čačak",
            Code = "SUP-BALKAN",
            ContactEmail = "b2b@alatibalkan.rs",
            LeadTimeDays = 2,
            Priority = 2,
            DefaultFulfillmentModel = FulfillmentModel.ModelB_CrossDock,
            CodCollectionMode = CodCollectionMode.OurCarrierAccount
        };
        db.Suppliers.AddRange(supA, supB);

        var catAlat = new Category
        {
            Name = "Aku i električni alati",
            Slug = "aku-i-elektricni-alati",
            SeoTitle = "Aku bušilice, brusilice i električni alati | Brza dostava",
            SeoDescription = "Provereni aku i električni alati za radionicu i domaćinstvo uz garanciju i isporuku širom Srbije.",
            IntroText = "Izbor najtraženijih aku bušilica, ugaonih brusilica i pratećeg alata sa proverenim stanjem i garancijom."
        };

        var catKuca = new Category
        {
            Name = "Oprema za kuću i dvorište",
            Slug = "oprema-za-kucu-i-dvoriste",
            SeoTitle = "Oprema za kuću, baštu i dvorište | Pouzdana kupovina",
            SeoDescription = "Praktični uređaji za održavanje dvorišta, radionice i domaćinstva.",
            IntroText = "Kvalitetna oprema za svakodnevne radove u kući, garaži i dvorištu."
        };
        db.Categories.AddRange(catAlat, catKuca);

        var seedItems = new (string Name, string Sku, string Ean, string Brand, Category Cat, decimal CostA, int OwnQty, int SupAQty, decimal? CostB, string Spec)[]
        {
            ("Aku bušilica-odvrtač 18V 2x2.0Ah u koferu", "INT-AKU-18V-01", "8606000001011", "Bosch", catAlat, 8400m, 4, 15, 8650m, "18V Li-Ion, 45Nm, 2 baterije, brzi punjač"),
            ("Ugaona brusilica 850W 125mm", "INT-BRUS-850-02", "8606000001028", "Makita", catAlat, 5200m, 3, 12, 5100m, "850W, ploča 125mm, 11.000 obr/min"),
            ("Udarna bušilica čekić SDS-Plus 800W", "INT-SDS-800-03", "8606000001035", "DeWalt", catAlat, 9800m, 1, 8, null, "SDS-Plus prihvat, 2.7J udarna snaga, 3 režima"),
            ("Set nasadnih ključeva i gedora 94 komada CrV", "INT-GED-94-04", "8606000001042", "Unior", catAlat, 4600m, 6, 20, 4750m, "Hrom-vanadijum čelik, 1/4 i 1/2 prihvat"),
            ("Laserski daljinomer 50m digitalni", "INT-LAS-50M-05", "8606000001059", "Bosch", catAlat, 6100m, 0, 10, null, "Domet 50m, tačnost ±1.5mm, IP54 zaštita"),
            ("Perač pod visokim pritiskom 130 bara 1800W", "INT-PER-130-06", "8606000001066", "Karcher", catKuca, 11200m, 2, 7, 11500m, "130 bara, protok 420 l/h, crevo 6m"),
            ("Radionički usisivač za suvo i mokro 1200W 20L", "INT-USI-20L-07", "8606000001073", "Karcher", catKuca, 6900m, 3, 9, null, "Inox posuda 20L, funkcija izduvavanja"),
            ("Automatski punjač akumulatora 12V/24V 8A", "INT-PUN-12V-08", "8606000001080", "Einhell", catKuca, 3400m, 5, 18, 3550m, "Mikroprocesorski, AGM/GEL/Olovo, LCD ekran"),
            ("Teleskopske merdevine aluminijumske 3.8m", "INT-MER-38M-09", "8606000001097", "Womax", catKuca, 7500m, 0, 11, null, "13 gazišta, nosivost 150kg, EN131 standard"),
            ("Digitalni multimetar True-RMS sa sondama", "INT-MUL-RMS-10", "8606000001103", "Unior", catAlat, 2600m, 8, 25, 2700m, "True-RMS merenje, NCV detekcija, LED ekran")
        };

        var rules = new[] { globalRule };

        foreach (var item in seedItems)
        {
            var pricing = pricingEngine.CalculatePrice(item.CostA, rules);

            var product = new Product
            {
                Name = item.Name,
                Slug = SerbianTextNormalizer.Slugify(item.Name),
                Description = $"{item.Name} ({item.Brand}) — proverena specifikacija: {item.Spec}. Dostupno za poručivanje uz račun i garanciju od 24 meseca.",
                ShortSpecification = item.Spec,
                GtinEan = item.Ean,
                Status = ProductStatus.Published,
                CategoryId = item.Cat.Id,
                Category = item.Cat,
                SeoTitle = $"{item.Name} | Cena i brza dostava",
                SeoDescription = $"Poručite {item.Name} po ceni od {pricing.SellingPriceRsd:N0} RSD. {item.Spec}."
            };

            var variant = new ProductVariant
            {
                ProductId = product.Id,
                Product = product,
                InternalSku = item.Sku,
                Title = "Standardno pakovanje",
                GtinEan = item.Ean,
                AttributeSummary = item.Spec,
                CurrentCostPriceRsd = pricing.CostPriceRsd,
                CurrentSellingPriceRsd = pricing.SellingPriceRsd,
                AppliedPricingRuleSummary = pricing.RuleExplanation
            };

            product.Variants.Add(variant);
            product.RebuildSearchText(item.Brand);

            db.Products.Add(product);
            db.ProductVariants.Add(variant);

            // Supplier A offer (notice shared SKU "SHARED-SKU-100" on first item for AT-04 demonstration)
            var sharedOrOwnSku = item.Sku == "INT-AKU-18V-01" ? "SHARED-SKU-100" : $"A-{item.Sku}";
            db.SupplierOffers.Add(new SupplierOffer
            {
                SupplierId = supA.Id,
                VariantId = variant.Id,
                SupplierSku = sharedOrOwnSku,
                SupplierProductName = item.Name,
                SupplierEan = item.Ean,
                SupplierBrand = item.Brand,
                PurchasePrice = item.CostA,
                SupplierReportedQty = item.SupAQty,
                IsActiveInFeed = true
            });

            if (item.CostB.HasValue)
            {
                var skuB = item.Sku == "INT-AKU-18V-01" ? "SHARED-SKU-100" : $"B-{item.Sku}";
                db.SupplierOffers.Add(new SupplierOffer
                {
                    SupplierId = supB.Id,
                    VariantId = variant.Id,
                    SupplierSku = skuB,
                    SupplierProductName = $"{item.Name} ({item.Brand})",
                    SupplierEan = item.Ean,
                    SupplierBrand = item.Brand,
                    PurchasePrice = item.CostB.Value,
                    SupplierReportedQty = 6,
                    IsActiveInFeed = true
                });
            }

            if (item.OwnQty > 0)
            {
                db.StockMovements.Add(new StockMovement
                {
                    VariantId = variant.Id,
                    LocationId = ownLocation.Id,
                    QuantityDelta = item.OwnQty,
                    Reason = "Početno stanje sopstvenog magacina (Seed)",
                    Actor = "system"
                });
            }
        }

        db.Articles.AddRange(
            new Article
            {
                Title = "Kako izabrati pravu aku bušilicu-odvrtač (18V) za kuću i radionicu",
                Slug = "kako-izabrati-aku-busilicu-odvrtac-18v",
                Excerpt = "Detaljan vodič kroz obrtni moment (Nm), brushless motore bez četkica i kapacitet Li-Ion baterija (Ah).",
                BodyMarkdown = "## 1. Obrtni moment (Nm)\nZa kućne popravke dovoljno je 30-40 Nm, dok za tvrdo drvo i metal birajte 50-65 Nm.\n\n## 2. Motor bez četkica\nBrushless motori donose do 30% duže trajanje baterije po jednom punjenju.",
                CategorySlug = "aku-i-elektricni-alati",
                CategoryName = "Aku i električni alati",
                RelatedQuery = "busilica",
                SeoTitle = "Kako izabrati aku bušilicu 18V — Vodič za kupovinu",
                SeoDescription = "Saznajte koji obrtni moment (Nm), kapacitet baterije i tip motora vam je potreban.",
                ReadingTimeMinutes = 6,
                Status = ArticleStatus.Published,
                PublishedAt = DateTimeOffset.UtcNow.AddDays(-3)
            },
            new Article
            {
                Title = "Inverter aparat za varenje: Kako odabrati model za domaćinstvo i bravariju",
                Slug = "izbor-aparata-za-zavarivanje-inverter-160a-200a",
                Excerpt = "Objašnjenje intermitencije (radnog ciklusa), funkcija Hot Start, Arc Force i Anti-Stick.",
                BodyMarkdown = "## 1. Realna jačina struje\nZa elektrode 2.5 mm i 3.2 mm kvalitetan IGBT inverter od 160A završava 90% radova u domaćinstvu.",
                CategorySlug = "aku-i-elektricni-alati",
                CategoryName = "Aku i električni alati",
                RelatedQuery = "varenje",
                SeoTitle = "Kako izabrati inverter aparat za varenje (IGBT)",
                SeoDescription = "Uporedite IGBT inverter aparate za varenje od 160A i 200A.",
                ReadingTimeMinutes = 5,
                Status = ArticleStatus.Published,
                PublishedAt = DateTimeOffset.UtcNow.AddDays(-2)
            },
            new Article
            {
                Title = "Vodič za izbor perača pod pritiskom i opreme za održavanje dvorišta",
                Slug = "odrzavanje-travnjaka-i-opreme-za-dvoriste",
                Excerpt = "Zašto je aluminijumska glava pumpe presudna kod perača pod pritiskom (135–150 bar) i priprema za zimu.",
                BodyMarkdown = "## 1. Aluminijumska glava pumpe\nModeli sa aluminijumskom pumpom otporni su na duži neprekidan rad pri pranju behatona i vozila.",
                CategorySlug = "oprema-za-kucu-i-dvoriste",
                CategoryName = "Oprema za kuću i dvorište",
                RelatedQuery = "perac",
                SeoTitle = "Kako izabrati perač pod pritiskom i opremu za dvorište",
                SeoDescription = "Saznajte razliku između kompozitnih i aluminijumskih pumpi kod perača pod pritiskom.",
                ReadingTimeMinutes = 5,
                Status = ArticleStatus.Published,
                PublishedAt = DateTimeOffset.UtcNow.AddDays(-1)
            }
        );

        db.Coupons.AddRange(
            new Coupon
            {
                Code = "DOBRODOSLI10",
                Description = "10% popusta za prvu kupovinu preko 3.000 RSD (uz zaštitu minimalne marže)",
                DiscountPercent = 10m,
                FixedDiscountRsd = 0m,
                MinSubtotalRsd = 3000m,
                ProtectMinimumMarginFloor = true,
                MaxUses = 500,
                IsActive = true,
                ExpiresAt = DateTimeOffset.UtcNow.AddMonths(6)
            },
            new Coupon
            {
                Code = "MAJSTOR500",
                Description = "500 RSD popusta za porudžbine alata preko 6.000 RSD",
                DiscountPercent = 0m,
                FixedDiscountRsd = 500m,
                MinSubtotalRsd = 6000m,
                ProtectMinimumMarginFloor = true,
                MaxUses = 300,
                IsActive = true,
                ExpiresAt = DateTimeOffset.UtcNow.AddMonths(6)
            }
        );

        var firstProduct = db.Products.Local.FirstOrDefault(p => p.Slug == "aku-busilica-odvrtac-18v-2x2ah-kofer")
                           ?? db.Products.Local.FirstOrDefault();
        if (firstProduct is not null)
        {
            db.ProductReviews.AddRange(
                new ProductReview
                {
                    ProductId = firstProduct.Id,
                    ProductSlug = firstProduct.Slug,
                    AuthorName = "Dejan M. (Novi Sad)",
                    VerifiedOrderNumber = "ORD-20261101-0012",
                    IsVerifiedPurchase = true,
                    Rating = 5,
                    Title = "Odličan obrtni moment i dve baterije u koferu",
                    Comment = "Koristim je već dve nedelje za sklapanje kuhinjskih elemenata i šrafljenje u grede. Baterija od 2Ah drži ceo dan, a punjač napuni drugu za manje od sat vremena.",
                    AdminTechnicalReply = "Hvala Dejane! Podsećamo da na motor bez četkica imate punu saobraznost od 24 meseca.",
                    IsApproved = true
                },
                new ProductReview
                {
                    ProductId = firstProduct.Id,
                    ProductSlug = firstProduct.Slug,
                    AuthorName = "Slobodan K. (Čačak)",
                    VerifiedOrderNumber = "ORD-20261105-0029",
                    IsVerifiedPurchase = true,
                    Rating = 5,
                    Title = "Stiglo za 24h PostExpressom",
                    Comment = "Metalni futer 13mm ne proklizava pri bušenju metala. Za ovu cenu najbolji odnos kvaliteta u klasi.",
                    IsApproved = true
                }
            );
        }

        db.SupplierCategoryMappings.AddRange(
            new SupplierCategoryMapping
            {
                SupplierId = supA.Id,
                SupplierCategoryRawName = "ELEKTRIČNI I AKU ALATI",
                TargetCategoryId = catAlat.Id,
                TargetCategoryName = catAlat.Name
            },
            new SupplierCategoryMapping
            {
                SupplierId = supA.Id,
                SupplierCategoryRawName = "BAŠTA I DVORIŠTE",
                TargetCategoryId = catKuca.Id,
                TargetCategoryName = catKuca.Name
            }
        );

        await db.SaveChangesAsync(ct);
    }
}
