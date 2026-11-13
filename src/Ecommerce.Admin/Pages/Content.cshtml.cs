using System.Text.Json;
using Ecommerce.Domain.Common;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using Ecommerce.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Admin.Pages;

public class ContentModel(EcommerceDbContext db) : PageModel
{
    public List<Article> Articles { get; set; } = new();

    [TempData]
    public string? StatusMessage { get; set; }

    public async Task OnGetAsync(CancellationToken ct)
    {
        Articles = await db.Articles
            .AsNoTracking()
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<IActionResult> OnPostCreateAsync(
        string title,
        string slug,
        string categorySlug,
        string categoryName,
        string relatedQuery,
        string excerpt,
        string bodyMarkdown,
        string seoTitle,
        string seoDescription,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(slug))
        {
            StatusMessage = "Greška: Naslov i URL slug su obavezni.";
            return RedirectToPage();
        }

        var cleanSlug = SerbianTextNormalizer.NormalizeForSearch(slug).Replace(' ', '-');

        var article = new Article
        {
            Title = title.Trim(),
            Slug = cleanSlug,
            CategorySlug = categorySlug.Trim(),
            CategoryName = string.IsNullOrWhiteSpace(categoryName) ? categorySlug.Trim() : categoryName.Trim(),
            RelatedQuery = relatedQuery?.Trim() ?? string.Empty,
            Excerpt = excerpt?.Trim() ?? string.Empty,
            BodyMarkdown = bodyMarkdown?.Trim() ?? string.Empty,
            SeoTitle = string.IsNullOrWhiteSpace(seoTitle) ? title.Trim() : seoTitle.Trim(),
            SeoDescription = string.IsNullOrWhiteSpace(seoDescription) ? (excerpt?.Trim() ?? string.Empty) : seoDescription.Trim(),
            Status = ArticleStatus.Draft
        };

        db.Articles.Add(article);
        db.AuditLogs.Add(new AuditLog
        {
            Actor = "admin",
            Action = "ArticleCreated",
            EntityType = nameof(Article),
            EntityId = article.Slug,
            AfterSummary = $"Status={article.Status}, Title={article.Title}"
        });

        await db.SaveChangesAsync(ct);
        StatusMessage = $"Vodič '{article.Title}' je kreiran u statusu Draft.";
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostChangeStatusAsync(
        Guid articleId,
        ArticleStatus newStatus,
        CancellationToken ct)
    {
        var article = await db.Articles.FirstOrDefaultAsync(a => a.Id == articleId, ct);
        if (article is null)
        {
            StatusMessage = "Greška: Vodič nije pronađen.";
            return RedirectToPage();
        }

        var oldStatus = article.Status;
        article.Status = newStatus;
        article.UpdatedAt = DateTimeOffset.UtcNow;
        if (newStatus == ArticleStatus.Published && article.PublishedAt is null)
        {
            article.PublishedAt = DateTimeOffset.UtcNow;
        }

        db.AuditLogs.Add(new AuditLog
        {
            Actor = "admin",
            Action = "ArticleStatusChanged",
            EntityType = nameof(Article),
            EntityId = article.Slug,
            BeforeSummary = oldStatus.ToString(),
            AfterSummary = newStatus.ToString()
        });

        db.OutboxMessages.Add(new OutboxMessage
        {
            EventType = "ContentRevalidateRequested",
            PayloadJson = JsonSerializer.Serialize(new
            {
                tags = new[] { "content", $"guide:{article.Slug}" },
                paths = new[] { "/vodici", $"/vodici/{article.Slug}" }
            })
        });

        await db.SaveChangesAsync(ct);
        StatusMessage = $"Status vodiča '{article.Slug}' promenjen iz {oldStatus} u {newStatus}.";
        return RedirectToPage();
    }
}
