using Ecommerce.Application.Services;
using Ecommerce.Infrastructure.Persistence;
using Ecommerce.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Ecommerce.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddEcommercePlatform(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connString = configuration.GetConnectionString("DefaultConnection");
        var useInMemory = string.Equals(configuration["UseInMemoryDatabase"], "true", StringComparison.OrdinalIgnoreCase);

        services.AddDbContext<EcommerceDbContext>(options =>
        {
            if (useInMemory || string.IsNullOrWhiteSpace(connString))
            {
                options.UseInMemoryDatabase("EcommerceDevSharedDb");
            }
            else
            {
                options.UseNpgsql(connString);
            }
        });

        services.AddSingleton<PricingEngine>();
        services.AddSingleton<SupplierFeedService>();
        services.AddSingleton<HybridInventoryService>();
        services.AddSingleton<AntiFraudRiskEvaluator>();
        services.AddSingleton<SerbianCatalogSearchService>();
        services.AddSingleton<AdminSecurityService>();
        services.AddSingleton<CourierAndPaymentService>();
        services.AddSingleton<PromotionAndReturnService>();
        services.AddScoped<CheckoutOrderService>();
        services.AddScoped<AdminOperationsService>();

        return services;
    }
}
