using System.Text.Json;
using Ecommerce.Domain.Common;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using Ecommerce.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Admin.Pages;

public class CatalogModel(EcommerceDbContext db) : PageModel
{
    public List<Product> Products { get; set; } = new();
    public List<Category> Categories { get; set; } = new();
    public List<Brand> Brands { get; set; } = new();

    [TempData]
    public string? StatusMessage { get; set; }

    public async Task OnGetAsync(CancellationToken ct)
    {
        Categories = await db.Categories.AsNoTracking().OrderBy(c => c.Name).ToListAsync(ct);
        Brands = await db.Brands.AsNoTracking().OrderBy(b => b.Name).ToListAsync(ct);
        Products = await db.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Brand)
            .Include(p => p.Variants)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<IActionResult> OnPostCreateProductAsync(
        string name,
        string slug,
        Guid categoryId,
        Guid? brandId,
        string internalSku,
        string? gtinEan,
        decimal sellingPriceRsd,
        decimal costPriceRsd,
        string shortSpecification,
        string? seoTitle,
        string? seoDescription,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(slug) || string.IsNullOrWhiteSpace(internalSku))
        {
            StatusMessage = "Greška: Naziv, URL slug i interni SKU su obavezni.";
            return RedirectToPage();
        }

        if (!string.IsNullOrWhiteSpace(gtinEan) && !SerbianTextNormalizer.IsValidEan(gtinEan))
        {
            StatusMessage = "Greška: EAN/GTIN mora sadržati 8 do 14 cifara (bez naučne notacije).";
            return RedirectToPage();
        }

        var cleanSlug = SerbianTextNormalizer.NormalizeForSearch(slug).Replace(' ', '-');
        var searchTokens = SerbianTextNormalizer.BuildCompositeSearchText(name, internalSku, gtinEan, shortSpecification);

        var product = new Product
        {
            Name = name.Trim(),
            Slug = cleanSlug,
            CategoryId = categoryId,
            BrandId = brandId,
            GtinEan = gtinEan?.Trim(),
            ShortSpecification = shortSpecification?.Trim() ?? string.Empty,
            Description = shortSpecification?.Trim() ?? string.Empty,
            SeoTitle = string.IsNullOrWhiteSpace(seoTitle) ? $"{name.Trim()} | Cena i karakteristike" : seoTitle.Trim(),
            SeoDescription = string.IsNullOrWhiteSpace(seoDescription) ? (shortSpecification?.Trim() ?? name.Trim()) : seoDescription.Trim(),
            SearchText = searchTokens,
            Status = ProductStatus.Published
        };

        var variant = new ProductVariant
        {
            ProductId = product.Id,
            InternalSku = internalSku.Trim().ToUpperInvariant(),
            Title = name.Trim(),
            GtinEan = gtinEan?.Trim(),
            AttributeSummary = shortSpecification?.Trim() ?? "Standard",
            CurrentSellingPriceRsd = sellingPriceRsd,
            CurrentCostPriceRsd = costPriceRsd,
            IsActive = true
        };

        db.Products.Add(product);
        db.ProductVariants.Add(variant);

        db.AuditLogs.Add(new AuditLog
        {
            Actor = "vlasnik",
            Action = "ProductCreated",
            EntityType = nameof(Product),
            EntityId = variant.InternalSku,
            AfterSummary = $"Slug={product.Slug}, Price={sellingPriceRsd:N2} RSD"
        });

        db.OutboxMessages.Add(new OutboxMessage
        {
            EventType = "CatalogChanged",
            PayloadJson = JsonSerializer.Serialize(new
            {
                tags = new[] { "catalog", $"product:{product.Slug}" },
                paths = new[] { "/", $"/proizvod/{product.Slug}" }
            })
        });

        await db.SaveChangesAsync(ct);
        StatusMessage = $"Proizvod '{product.Name}' ({variant.InternalSku}) je uspešno kreiran i objavljen.";
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostUpdateVariantPriceAndStatusAsync(
        Guid productId,
        Guid variantId,
        decimal newSellingPriceRsd,
        ProductStatus newStatus,
        string? seoTitle,
        CancellationToken ct)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == productId, ct);
        var variant = await db.ProductVariants.FirstOrDefaultAsync(v => v.Id == variantId, ct);

        if (product is null || variant is null)
        {
            StatusMessage = "Greška: Proizvod ili varijanta nisu pronađeni.";
            return RedirectToPage();
        }

        var oldPrice = variant.CurrentSellingPriceRsd;
        var oldStatus = product.Status;

        variant.CurrentSellingPriceRsd = newSellingPriceRsd;
        variant.ManualPriceOverrideRsd = newSellingPriceRsd;
        variant.UpdatedAt = DateTimeOffset.UtcNow;

        product.Status = newStatus;
        if (!string.IsNullOrWhiteSpace(seoTitle))
        {
            product.SeoTitle = seoTitle.Trim();
        }
        product.UpdatedAt = DateTimeOffset.UtcNow;

        db.PriceRecords.Add(new PriceRecord
        {
            VariantId = variant.Id,
            PurchaseCostRsd = variant.CurrentCostPriceRsd,
            SellingPriceRsd = newSellingPriceRsd,
            AppliedRuleName = "Ručna izmena u Katalogu (ManualOverride)",
            EffectiveFrom = DateTimeOffset.UtcNow
        });

        db.AuditLogs.Add(new AuditLog
        {
            Actor = "vlasnik",
            Action = "CatalogProductUpdated",
            EntityType = nameof(Product),
            EntityId = variant.InternalSku,
            BeforeSummary = $"Price={oldPrice:N2}, Status={oldStatus}",
            AfterSummary = $"Price={newSellingPriceRsd:N2}, Status={newStatus}"
        });

        db.OutboxMessages.Add(new OutboxMessage
        {
            EventType = "CatalogChanged",
            PayloadJson = JsonSerializer.Serialize(new
            {
                tags = new[] { "catalog", $"product:{product.Slug}" },
                paths = new[] { "/", $"/proizvod/{product.Slug}" }
            })
        });

        await db.SaveChangesAsync(ct);
        StatusMessage = $"Ažuriran proizvod '{product.Name}' ({variant.InternalSku}): Cena={newSellingPriceRsd:N2} RSD, Status={newStatus}.";
        return RedirectToPage();
    }
}
