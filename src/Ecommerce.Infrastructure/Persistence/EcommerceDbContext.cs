using Ecommerce.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Infrastructure.Persistence;

public class EcommerceDbContext(DbContextOptions<EcommerceDbContext> options) : DbContext(options)
{
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Brand> Brands => Set<Brand>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<SupplierOffer> SupplierOffers => Set<SupplierOffer>();
    public DbSet<PricingRule> PricingRules => Set<PricingRule>();
    public DbSet<PriceRecord> PriceRecords => Set<PriceRecord>();
    public DbSet<InventoryLocation> InventoryLocations => Set<InventoryLocation>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<StockReservation> StockReservations => Set<StockReservation>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Shipment> Shipments => Set<Shipment>();
    public DbSet<CodRemittance> CodRemittances => Set<CodRemittance>();
    public DbSet<CustomerRiskRecord> CustomerRiskRecords => Set<CustomerRiskRecord>();
    public DbSet<ImportRun> ImportRuns => Set<ImportRun>();
    public DbSet<RedirectRule> RedirectRules => Set<RedirectRule>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();
    public DbSet<Article> Articles => Set<Article>();
    public DbSet<ReturnRequest> ReturnRequests => Set<ReturnRequest>();
    public DbSet<Coupon> Coupons => Set<Coupon>();
    public DbSet<SupplierPurchaseOrder> SupplierPurchaseOrders => Set<SupplierPurchaseOrder>();
    public DbSet<NotificationLog> NotificationLogs => Set<NotificationLog>();
    public DbSet<ProductReview> ProductReviews => Set<ProductReview>();
    public DbSet<SupplierCategoryMapping> SupplierCategoryMappings => Set<SupplierCategoryMapping>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // All domain entities generate UUIDv7 in application memory (Section 7.2)
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            var idProp = entityType.FindProperty("Id");
            if (idProp is not null && idProp.ClrType == typeof(Guid))
            {
                idProp.ValueGenerated = Microsoft.EntityFrameworkCore.Metadata.ValueGenerated.Never;
            }
        }

        modelBuilder.Entity<Category>(b =>
        {
            b.HasIndex(c => c.Slug).IsUnique();
        });

        modelBuilder.Entity<Product>(b =>
        {
            b.HasIndex(p => p.Slug).IsUnique();
            b.HasIndex(p => p.SearchText);
        });

        modelBuilder.Entity<ProductVariant>(b =>
        {
            b.HasIndex(v => v.InternalSku).IsUnique();
            b.Property(v => v.CurrentSellingPriceRsd).HasPrecision(18, 2);
            b.Property(v => v.CurrentCostPriceRsd).HasPrecision(18, 2);
            b.Property(v => v.ManualPriceOverrideRsd).HasPrecision(18, 2);
            b.Property(v => v.WeightKg).HasPrecision(10, 3);
        });

        modelBuilder.Entity<Supplier>(b =>
        {
            b.HasIndex(s => s.Code).IsUnique();
        });

        modelBuilder.Entity<SupplierOffer>(b =>
        {
            // Canonical constraint: UNIQUE(SupplierId, SupplierSku) - Section 7.1, AT-04
            b.HasIndex(o => new { o.SupplierId, o.SupplierSku }).IsUnique();
            b.Property(o => o.PurchasePrice).HasPrecision(18, 2);
        });

        modelBuilder.Entity<PricingRule>(b =>
        {
            b.Property(r => r.MarkupMultiplier).HasPrecision(10, 4);
            b.Property(r => r.FixedHandlingFeeRsd).HasPrecision(18, 2);
            b.Property(r => r.MinGrossMarginPercent).HasPrecision(10, 2);
            b.Property(r => r.MinProfitFloorRsd).HasPrecision(18, 2);
            b.Property(r => r.ExpectedUnclaimedRate).HasPrecision(10, 4);
            b.Property(r => r.EstimatedTwoWayShippingCostRsd).HasPrecision(18, 2);
        });

        modelBuilder.Entity<Order>(b =>
        {
            b.HasIndex(o => o.OrderNumber).IsUnique();
            b.HasIndex(o => o.IdempotencyKey).IsUnique();
            b.HasIndex(o => new { o.CreatedAt, o.Status });
            b.Property(o => o.SubtotalRsd).HasPrecision(18, 2);
            b.Property(o => o.ShippingCostRsd).HasPrecision(18, 2);
            b.Property(o => o.TotalRsd).HasPrecision(18, 2);
        });

        modelBuilder.Entity<OrderItem>(b =>
        {
            b.Property(i => i.UnitPriceRsd).HasPrecision(18, 2);
            b.Property(i => i.UnitCostSnapshotRsd).HasPrecision(18, 2);
            b.Property(i => i.LineTotalRsd).HasPrecision(18, 2);
        });

        modelBuilder.Entity<RedirectRule>(b =>
        {
            b.HasIndex(r => r.OldPath).IsUnique();
        });
    }
}
