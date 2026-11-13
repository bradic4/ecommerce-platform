using System.Text;
using Ecommerce.Infrastructure.Persistence;
using Ecommerce.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Worker;

public class Worker(
    IServiceScopeFactory scopeFactory,
    IConfiguration configuration,
    ILogger<Worker> logger) : BackgroundService
{
    private static readonly HttpClient HttpClient = new() { Timeout = TimeSpan.FromSeconds(10) };

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Ecommerce Outbox & Sync Worker pokrenut.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingOutboxMessagesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Greška pri obradi Outbox poruka.");
            }

            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        }
    }

    public async Task<int> ProcessPendingOutboxMessagesAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EcommerceDbContext>();

        var pending = await db.OutboxMessages
            .Where(m => m.ProcessedAt == null && m.Attempts < 5)
            .OrderBy(m => m.CreatedAt)
            .Take(25)
            .ToListAsync(ct);

        int processedCount = 0;

        foreach (var msg in pending)
        {
            msg.Attempts++;
            try
            {
                if (msg.EventType == "CatalogChanged")
                {
                    var webhookUrl = configuration["Revalidation:WebhookUrl"] ?? "http://localhost:3000/api/revalidate";
                    var secret = configuration["Revalidation:HmacSecret"] ?? "dev-only-change-in-production-hmac-secret-key-32b";
                    var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
                    var sig = AdminOperationsService.ComputeWebhookHmacSignature(secret, ts, msg.PayloadJson);

                    using var req = new HttpRequestMessage(HttpMethod.Post, webhookUrl)
                    {
                        Content = new StringContent(msg.PayloadJson, Encoding.UTF8, "application/json")
                    };
                    req.Headers.Add("x-webhook-timestamp", ts);
                    req.Headers.Add("x-webhook-signature", sig);

                    var resp = await HttpClient.SendAsync(req, ct);
                    if (!resp.IsSuccessStatusCode)
                    {
                        msg.LastError = $"Next.js revalidate HTTP {(int)resp.StatusCode}";
                        continue;
                    }
                }

                msg.ProcessedAt = DateTimeOffset.UtcNow;
                msg.LastError = null;
                processedCount++;
            }
            catch (Exception ex)
            {
                // AT-14: Network failure leaves message in Outbox for retry without losing data
                msg.LastError = ex.Message;
            }
        }

        if (pending.Count > 0)
        {
            await db.SaveChangesAsync(ct);
        }

        return processedCount;
    }
}
