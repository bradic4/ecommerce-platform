using Ecommerce.Domain.Entities;
using Ecommerce.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Admin.Pages;

public class AuditModel(EcommerceDbContext db) : PageModel
{
    public List<AuditLog> AuditLogs { get; set; } = [];
    public List<OutboxMessage> OutboxMessages { get; set; } = [];
    public List<CustomerRiskRecord> RiskRecords { get; set; } = [];

    public async Task OnGetAsync(CancellationToken ct)
    {
        AuditLogs = await db.AuditLogs
            .AsNoTracking()
            .OrderByDescending(a => a.CreatedAt)
            .Take(50)
            .ToListAsync(ct);

        OutboxMessages = await db.OutboxMessages
            .AsNoTracking()
            .OrderByDescending(m => m.CreatedAt)
            .Take(30)
            .ToListAsync(ct);

        RiskRecords = await db.CustomerRiskRecords
            .AsNoTracking()
            .OrderByDescending(r => r.LastIncidentAt)
            .ToListAsync(ct);
    }
}
