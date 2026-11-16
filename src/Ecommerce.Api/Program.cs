using System.Text;
using Ecommerce.Application.Services;
using Ecommerce.Domain.Enums;
using Ecommerce.Infrastructure;
using Ecommerce.Infrastructure.Persistence;
using Ecommerce.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEcommercePlatform(builder.Configuration);
builder.Services.AddHealthChecks();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

// Ensure database is created and seeded with the 10 realistic pilot items on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<EcommerceDbContext>();
    await db.Database.EnsureCreatedAsync();
    await CatalogSeeder.SeedAsync(db);
}

app.UseCors();

// 301 Redirect Manager middleware for renamed product/category slugs (Section 14.2, AT-11)
app.Use(async (ctx, next) =>
{
    var path = ctx.Request.Path.Value;
    if (!string.IsNullOrEmpty(path) && !path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase))
    {
        using var scope = ctx.RequestServices.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EcommerceDbContext>();
        var redirect = await db.RedirectRules.AsNoTracking()
            .FirstOrDefaultAsync(r => r.OldPath == path);
        if (redirect is not null)
        {
            ctx.Response.StatusCode = redirect.StatusCode;
            ctx.Response.Headers.Location = redirect.NewPath;
            return;
        }
    }
    await next();
});

app.MapHealthChecks("/health");

// Categories list with product counts (Section 04.2)
app.MapGet("/api/v1/catalog/categories", async (EcommerceDbContext db, CancellationToken ct) =>
{
    var categories = await db.Categories
        .AsNoTracking()
        .Select(c => new
        {
            c.Id,
            c.Name,
            c.Slug,
            c.SeoTitle,
            c.SeoDescription,
            c.IntroText,
            ProductCount = c.Products.Count(p => p.Status == ProductStatus.Published)
        })
        .ToListAsync(ct);

    return Results.Ok(categories);
});

// Public Catalog Endpoint - never exposes supplier purchase price (Section 18)
app.MapGet("/api/v1/catalog/products", async (
    string? q,
    string? category,
    string? brand,
    decimal? minPrice,
    decimal? maxPrice,
    string? sort,
    bool? inStockOnly,
    EcommerceDbContext db,
    SerbianCatalogSearchService searchService,
    HybridInventoryService inventoryService,
    CancellationToken ct) =>
{
    var query = db.Products
        .AsNoTracking()
        .Include(p => p.Category)
        .Include(p => p.Brand)
        .Include(p => p.Variants)
        .Where(p => p.Status == ProductStatus.Published);

    if (!string.IsNullOrWhiteSpace(category))
    {
        query = query.Where(p => p.Category != null && p.Category.Slug == category.Trim());
    }

    if (!string.IsNullOrWhiteSpace(brand))
    {
        var bClean = brand.Trim();
        query = query.Where(p => p.Brand != null && (p.Brand.Slug == bClean || p.Brand.Name == bClean));
    }

    var products = await query.ToListAsync(ct);
    if (!string.IsNullOrWhiteSpace(q))
    {
        products = searchService.Search(products, q).Select(h => h.Product).ToList();
    }

    var variantIds = products.SelectMany(p => p.Variants).Select(v => v.Id).ToList();
    var movements = await db.StockMovements.AsNoTracking().Where(m => variantIds.Contains(m.VariantId)).ToListAsync(ct);
    var reservations = await db.StockReservations.AsNoTracking().Where(r => variantIds.Contains(r.VariantId)).ToListAsync(ct);
    var offers = await db.SupplierOffers.AsNoTracking().Where(o => o.VariantId.HasValue && variantIds.Contains(o.VariantId.Value)).ToListAsync(ct);
    var suppliers = await db.Suppliers.AsNoTracking().ToListAsync(ct);
    var now = DateTimeOffset.UtcNow;

    var items = products.Select(p =>
    {
        var primaryVariant = p.Variants.FirstOrDefault(v => v.IsActive);
        var avail = primaryVariant is null
            ? null
            : inventoryService.ProjectAvailability(primaryVariant, movements, reservations, offers, suppliers, now);

        return new
        {
            p.Id,
            p.Name,
            p.Slug,
            BrandName = p.Brand?.Name,
            BrandSlug = p.Brand?.Slug,
            CategoryName = p.Category?.Name,
            CategorySlug = p.Category?.Slug,
            p.ShortSpecification,
            VariantId = primaryVariant?.Id,
            Sku = primaryVariant?.InternalSku,
            Ean = primaryVariant?.GtinEan ?? p.GtinEan,
            PriceRsd = primaryVariant?.CurrentSellingPriceRsd ?? 0m,
            Currency = "RSD",
            IsOrderable = avail?.IsOrderable ?? false,
            OwnStockAvailable = (avail?.OwnSellableQty ?? 0) > 0,
            AvailabilityLabel = avail?.PublicStatusLabel ?? "Trenutno nedostupno"
        };
    }).ToList();

    if (inStockOnly == true)
    {
        items = items.Where(i => i.IsOrderable).ToList();
    }

    if (minPrice.HasValue)
    {
        items = items.Where(i => i.PriceRsd >= minPrice.Value).ToList();
    }

    if (maxPrice.HasValue && maxPrice.Value > 0m)
    {
        items = items.Where(i => i.PriceRsd <= maxPrice.Value).ToList();
    }

    items = sort switch
    {
        "price_asc" => items.OrderBy(i => i.PriceRsd).ToList(),
        "price_desc" => items.OrderByDescending(i => i.PriceRsd).ToList(),
        "name_asc" => items.OrderBy(i => i.Name).ToList(),
        _ => items
    };

    return Results.Ok(items);
});

// Product Detail Endpoint with JSON-LD Schema.org metadata (Section 14.2, AT-12)
app.MapGet("/api/v1/products/{slug}", async (
    string slug,
    EcommerceDbContext db,
    HybridInventoryService inventoryService,
    CancellationToken ct) =>
{
    var product = await db.Products
        .AsNoTracking()
        .Include(p => p.Category)
        .Include(p => p.Variants)
        .FirstOrDefaultAsync(p => p.Slug == slug && p.Status == ProductStatus.Published, ct);

    if (product is null)
        return Results.NotFound(new { error = "PRODUCT_NOT_FOUND", message = "Proizvod nije pronađen." });

    var variantIds = product.Variants.Select(v => v.Id).ToList();
    var movements = await db.StockMovements.AsNoTracking().Where(m => variantIds.Contains(m.VariantId)).ToListAsync(ct);
    var reservations = await db.StockReservations.AsNoTracking().Where(r => variantIds.Contains(r.VariantId)).ToListAsync(ct);
    var offers = await db.SupplierOffers.AsNoTracking().Where(o => o.VariantId.HasValue && variantIds.Contains(o.VariantId.Value)).ToListAsync(ct);
    var suppliers = await db.Suppliers.AsNoTracking().ToListAsync(ct);
    var now = DateTimeOffset.UtcNow;

    var variantsDto = product.Variants.Where(v => v.IsActive).Select(v =>
    {
        var avail = inventoryService.ProjectAvailability(v, movements, reservations, offers, suppliers, now);
        return new
        {
            v.Id,
            v.InternalSku,
            v.Title,
            v.GtinEan,
            v.AttributeSummary,
            PriceRsd = v.CurrentSellingPriceRsd,
            Currency = "RSD",
            avail.IsOrderable,
            OwnStockAvailable = avail.OwnSellableQty > 0,
            avail.PublicStatusLabel,
            avail.EstimatedLeadTimeDays,
            SchemaAvailability = avail.IsOrderable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
        };
    }).ToList();

    var reviews = await db.ProductReviews
        .AsNoTracking()
        .Where(r => r.ProductId == product.Id && r.IsApproved)
        .OrderByDescending(r => r.CreatedAt)
        .Select(r => new
        {
            r.Id,
            r.AuthorName,
            r.IsVerifiedPurchase,
            r.Rating,
            r.Title,
            r.Comment,
            r.AdminTechnicalReply,
            r.CreatedAt
        })
        .ToListAsync(ct);

    var avgRating = reviews.Count > 0 ? Math.Round(reviews.Average(r => r.Rating), 2) : 0.0;

    return Results.Ok(new
    {
        product.Id,
        product.Name,
        product.Slug,
        product.Description,
        product.ShortSpecification,
        product.GtinEan,
        product.SeoTitle,
        product.SeoDescription,
        Category = product.Category is null ? null : new { product.Category.Name, product.Category.Slug },
        Variants = variantsDto,
        AggregateRating = reviews.Count > 0
            ? new { RatingValue = avgRating, ReviewCount = reviews.Count }
            : null,
        Reviews = reviews
    });
});

app.MapPost("/api/v1/products/{slug}/reviews", async (
    string slug,
    ProductReviewSubmitDto dto,
    EcommerceDbContext db,
    CancellationToken ct) =>
{
    var product = await db.Products.FirstOrDefaultAsync(p => p.Slug == slug, ct);
    if (product is null)
        return Results.NotFound(new { error = "PRODUCT_NOT_FOUND", message = "Proizvod nije pronađen." });

    if (string.IsNullOrWhiteSpace(dto.AuthorName) || string.IsNullOrWhiteSpace(dto.Comment))
        return Results.BadRequest(new { error = "INVALID_REVIEW", message = "Ime i tekst utiska su obavezni." });

    var verifiedOrder = false;
    if (!string.IsNullOrWhiteSpace(dto.OrderNumber))
    {
        var ordNo = dto.OrderNumber.Trim().ToUpperInvariant();
        verifiedOrder = await db.Orders.AnyAsync(o => o.OrderNumber == ordNo && o.Status != OrderStatus.Cancelled, ct);
    }

    var review = new Ecommerce.Domain.Entities.ProductReview
    {
        ProductId = product.Id,
        ProductSlug = product.Slug,
        AuthorName = dto.AuthorName.Trim(),
        VerifiedOrderNumber = dto.OrderNumber?.Trim().ToUpperInvariant(),
        IsVerifiedPurchase = verifiedOrder,
        Rating = Math.Clamp(dto.Rating, 1, 5),
        Title = string.IsNullOrWhiteSpace(dto.Title) ? "Utisak kupca" : dto.Title.Trim(),
        Comment = dto.Comment.Trim(),
        IsApproved = true
    };

    db.ProductReviews.Add(review);
    await db.SaveChangesAsync(ct);

    return Results.Ok(new
    {
        review.Id,
        review.IsVerifiedPurchase,
        Message = verifiedOrder
            ? "Hvala! Vaša recenzija je objavljena sa oznakom 'Verifikovana kupovina'."
            : "Hvala! Vaš utisak / tehničko pitanje je uspešno zabeleženo."
    });
});

// Checkout Quote Endpoint (Section 18)
app.MapPost("/api/v1/checkout/quote", async (
    string? couponCode,
    List<CheckoutItemRequest> items,
    CheckoutOrderService checkoutService,
    CancellationToken ct) =>
{
    var quote = await checkoutService.QuoteAsync(items, ct, couponCode);
    return Results.Ok(quote);
});

// Idempotent Checkout Confirm Endpoint (Section 12.2 & 18, AT-01, AT-02, AT-10, AT-14, AT-17)
app.MapPost("/api/v1/checkout/confirm", async (
    CheckoutConfirmRequest request,
    CheckoutOrderService checkoutService,
    CancellationToken ct) =>
{
    var result = await checkoutService.ConfirmOrderAsync(request, ct);
    if (!result.Succeeded)
    {
        var statusCode = result.ErrorCode switch
        {
            "PRODUCT_OUT_OF_STOCK" => StatusCodes.Status409Conflict,
            "ADDRESS_INVALID" => StatusCodes.Status422UnprocessableEntity,
            _ => StatusCodes.Status400BadRequest
        };
        return Results.Json(new { error = result.ErrorCode, message = result.UserMessage }, statusCode: statusCode);
    }

    return Results.Ok(new
    {
        result.Order!.OrderNumber,
        Status = result.Order.Status.ToString(),
        PaymentStatus = result.Order.PaymentStatus.ToString(),
        PaymentMethod = result.Order.PaymentMethod.ToString(),
        result.Order.SubtotalRsd,
        result.Order.DiscountRsd,
        result.Order.CouponCode,
        result.Order.ShippingCostRsd,
        result.Order.TotalRsd,
        result.Order.Currency,
        result.Order.IpsQrPayload,
        result.Order.VerificationReason,
        result.WasDuplicateIdempotentReplay,
        Message = result.UserMessage
    });
});

// Safe Order Lookup by OrderNumber (no PII leaked in public URL - Section 04.1 & 18)
app.MapGet("/api/v1/orders/lookup", async (
    string orderNumber,
    EcommerceDbContext db,
    CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(orderNumber))
        return Results.BadRequest(new { error = "INVALID_ORDER_NUMBER", message = "Broj porudžbine je obavezan." });

    var order = await db.Orders
        .AsNoTracking()
        .Include(o => o.Items)
        .Include(o => o.Shipments)
        .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber.Trim(), ct);

    if (order is null)
        return Results.NotFound(new { error = "ORDER_NOT_FOUND", message = "Porudžbina nije pronađena." });

    var publicStatus = order.Status switch
    {
        OrderStatus.New or OrderStatus.AwaitingVerification => "Primljeno (u obradi)",
        OrderStatus.Confirmed or OrderStatus.PartiallyFulfilled => "U pripremi za slanje",
        OrderStatus.Completed => "Isporučeno",
        OrderStatus.Cancelled => "Otkazano",
        _ => "Na čekanju"
    };

    var paymentMethodLabel = order.PaymentMethod == PaymentMethod.BankTransfer
        ? "Uplata na račun (NBS IPS QR / m-banking)"
        : "Plaćanje pouzećem (kuriru pri preuzimanju)";

    return Results.Ok(new
    {
        order.OrderNumber,
        PublicStatus = publicStatus,
        PaymentMethod = paymentMethodLabel,
        PaymentMethodCode = order.PaymentMethod.ToString(),
        order.SubtotalRsd,
        order.DiscountRsd,
        order.CouponCode,
        order.ShippingCostRsd,
        order.TotalRsd,
        order.Currency,
        order.IpsQrPayload,
        order.CreatedAt,
        ShippingCity = order.ShippingCity,
        Shipments = order.Shipments.Select(s => new
        {
            s.Carrier,
            s.TrackingNumber,
            s.Status,
            s.ShippedAt
        }),
        Items = order.Items.Select(i => new
        {
            i.ProductNameSnapshot,
            i.SkuSnapshot,
            i.Quantity,
            i.UnitPriceRsd,
            i.LineTotalRsd
        })
    });
});

// Statutory 14-day Withdrawal & 24-month Warranty Claims (Zakon o zaštiti potrošača RS - Section 04.1, 15, 22)
app.MapPost("/api/v1/returns/submit", async (
    ReturnSubmissionDto dto,
    EcommerceDbContext db,
    PromotionAndReturnService returnService,
    CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(dto.OrderNumber) ||
        string.IsNullOrWhiteSpace(dto.CustomerFullName) ||
        string.IsNullOrWhiteSpace(dto.CustomerPhone) ||
        string.IsNullOrWhiteSpace(dto.ReasonDescription))
    {
        return Results.BadRequest(new { error = "INVALID_RETURN_REQUEST", message = "Sva obavezna polja moraju biti popunjena." });
    }

    var order = await db.Orders
        .AsNoTracking()
        .FirstOrDefaultAsync(o => o.OrderNumber == dto.OrderNumber.Trim().ToUpperInvariant(), ct);

    var reqType = string.Equals(dto.ReturnType, "WarrantyClaim24Months", StringComparison.OrdinalIgnoreCase)
        ? ReturnRequestType.WarrantyClaim24Months
        : string.Equals(dto.ReturnType, "DamagedInTransit", StringComparison.OrdinalIgnoreCase)
            ? ReturnRequestType.DamagedInTransit
            : ReturnRequestType.Withdrawal14Days;

    var rma = returnService.CreateStatutoryReturnRequest(
        orderNumber: dto.OrderNumber,
        orderId: order?.Id,
        customerFullName: dto.CustomerFullName,
        customerEmail: dto.CustomerEmail ?? string.Empty,
        customerPhone: dto.CustomerPhone,
        productSkuOrName: dto.ProductSkuOrName ?? "Stavka iz porudžbine",
        quantity: dto.Quantity <= 0 ? 1 : dto.Quantity,
        type: reqType,
        reasonDescription: dto.ReasonDescription,
        bankAccountForRefund: dto.CustomerBankAccount,
        estimatedRefundRsd: order?.SubtotalRsd ?? 0m,
        submittedAtUtc: DateTimeOffset.UtcNow);

    db.ReturnRequests.Add(rma);
    db.AuditLogs.Add(new Ecommerce.Domain.Entities.AuditLog
    {
        Actor = "customer-portal",
        Action = "ReturnRequestSubmitted",
        EntityType = nameof( Ecommerce.Domain.Entities.ReturnRequest),
        EntityId = rma.RmaNumber,
        AfterSummary = $"Order={rma.OrderNumber}, Type={rma.Type}, Deadline8d={rma.StatutoryResponseDeadlineAt:yyyy-MM-dd}"
    });
    await db.SaveChangesAsync(ct);

    return Results.Ok(new
    {
        rma.RmaNumber,
        rma.OrderNumber,
        Type = rma.Type.ToString(),
        Status = rma.Status.ToString(),
        rma.StatutoryResponseDeadlineAt,
        rma.StatutoryResolutionDeadlineAt,
        Message = $"Vaš zahtev je zaveden pod brojem {rma.RmaNumber}. Zakonski rok za odgovor trgovca je 8 dana ({rma.StatutoryResponseDeadlineAt:dd.MM.yyyy.})."
    });
});

app.MapGet("/api/v1/returns/lookup", async (string rmaNumber, EcommerceDbContext db, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(rmaNumber))
        return Results.BadRequest(new { error = "INVALID_RMA", message = "Unesite broj reklamacije (RMA-...)." });

    var rma = await db.ReturnRequests
        .AsNoTracking()
        .FirstOrDefaultAsync(r => r.RmaNumber == rmaNumber.Trim().ToUpperInvariant(), ct);

    if (rma is null)
        return Results.NotFound(new { error = "RMA_NOT_FOUND", message = "Zahtev sa unetim RMA brojem nije pronađen." });

    return Results.Ok(new
    {
        rma.RmaNumber,
        rma.OrderNumber,
        Type = rma.Type.ToString(),
        Status = rma.Status.ToString(),
        rma.ProductSkuOrName,
        rma.Quantity,
        rma.OfficialDecisionNote,
        rma.StatutoryResponseDeadlineAt,
        rma.StatutoryResolutionDeadlineAt,
        rma.RespondedAt,
        rma.ResolvedAt
    });
});

// Buying Guides & SEO Content Endpoints (Section 04.2, 05, 14.1, 14.3)
app.MapGet("/api/v1/content/guides", async (EcommerceDbContext db, CancellationToken ct) =>
{
    var guides = await db.Articles
        .AsNoTracking()
        .Where(a => a.Status == ArticleStatus.Published)
        .OrderByDescending(a => a.PublishedAt ?? a.CreatedAt)
        .Select(a => new
        {
            a.Title,
            a.Slug,
            a.Excerpt,
            a.CategorySlug,
            a.CategoryName,
            a.RelatedQuery,
            a.SeoTitle,
            a.SeoDescription,
            a.ReadingTimeMinutes,
            a.PublishedAt
        })
        .ToListAsync(ct);

    return Results.Ok(guides);
});

app.MapGet("/api/v1/content/guides/{slug}", async (string slug, EcommerceDbContext db, CancellationToken ct) =>
{
    var guide = await db.Articles
        .AsNoTracking()
        .FirstOrDefaultAsync(a => a.Slug == slug && a.Status == ArticleStatus.Published, ct);

    if (guide is null)
        return Results.NotFound(new { error = "GUIDE_NOT_FOUND", message = "Vodič nije pronađen." });

    return Results.Ok(guide);
});

// Canonical XML Sitemap endpoint (Section 14.2)
app.MapGet("/sitemap.xml", async (EcommerceDbContext db, CancellationToken ct) =>
{
    var slugs = await db.Products
        .AsNoTracking()
        .Where(p => p.Status == ProductStatus.Published)
        .Select(p => p.Slug)
        .ToListAsync(ct);

    var guideSlugs = await db.Articles
        .AsNoTracking()
        .Where(a => a.Status == ArticleStatus.Published)
        .Select(a => a.Slug)
        .ToListAsync(ct);

    var sb = new StringBuilder();
    sb.AppendLine(@"<?xml version=""1.0"" encoding=""UTF-8""?>");
    sb.AppendLine(@"<urlset xmlns=""http://www.sitemaps.org/schemas/sitemap/0.9"">");
    foreach (var slug in slugs)
    {
        sb.AppendLine($"  <url><loc>https://prodavnica.rs/proizvod/{slug}</loc></url>");
    }
    foreach (var gSlug in guideSlugs)
    {
        sb.AppendLine($"  <url><loc>https://prodavnica.rs/vodici/{gSlug}</loc></url>");
    }
    sb.AppendLine("</urlset>");
    return Results.Content(sb.ToString(), "application/xml", Encoding.UTF8);
});

app.Run();

public record ReturnSubmissionDto(
    string OrderNumber,
    string CustomerFullName,
    string? CustomerEmail,
    string CustomerPhone,
    string? ProductSkuOrName,
    int Quantity,
    string ReturnType,
    string ReasonDescription,
    string? CustomerBankAccount);

public record ProductReviewSubmitDto(
    string AuthorName,
    string? OrderNumber,
    int Rating,
    string? Title,
    string Comment);

public partial class Program;
