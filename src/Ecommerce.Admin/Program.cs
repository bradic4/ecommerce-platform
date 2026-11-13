using Ecommerce.Application.Services;
using Ecommerce.Domain.Enums;
using Ecommerce.Infrastructure;
using Ecommerce.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorPages();
builder.Services.AddEcommercePlatform(builder.Configuration);

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<EcommerceDbContext>();
    await db.Database.EnsureCreatedAsync();
    await CatalogSeeder.SeedAsync(db);
}

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseStaticFiles();
app.UseRouting();

// RBAC Role Enforcement Middleware (Section 02, 16.1, 25.5, AT-21)
app.Use(async (context, next) =>
{
    var roleCookie = context.Request.Cookies["AdminRole"];
    var role = Enum.TryParse<AdminRole>(roleCookie, true, out var parsed)
        ? parsed
        : AdminRole.OwnerAdmin;

    var security = context.RequestServices.GetRequiredService<AdminSecurityService>();
    var eval = security.EvaluatePageAccess(role, context.Request.Path.Value ?? "/");
    if (!eval.Allowed)
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        context.Response.ContentType = "text/plain; charset=utf-8";
        await context.Response.WriteAsync(eval.DenialReason ?? "403 Forbidden");
        return;
    }

    await next();
});

app.UseAuthorization();
app.MapRazorPages();

app.Run();
