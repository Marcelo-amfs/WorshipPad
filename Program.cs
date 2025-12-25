using WorshipPad;
using System.Net;
using Microsoft.AspNetCore.Mvc;

/// <summary>
/// Ponto de entrada da aplicação WorshipPad.
/// Configura e inicializa o servidor web ASP.NET Core com suporte a CORS,
/// arquivos estáticos e roteamento de API.
/// </summary>
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        // Configura para retornar JSON ao invés de HTML em erros de API
        options.InvalidModelStateResponseFactory = context =>
        {
            return new ObjectResult(new { error = "Requisição inválida", details = context.ModelState })
            {
                StatusCode = 400
            };
        };
    });
builder.Services.AddSingleton<WorshipPadService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        // Em produção, permite origens específicas (Netlify e localhost para desenvolvimento)
        var allowedOrigins = new[]
        {
            "https://worshipad.vercel.app",
            "https://worshipad.vercel.app/",
            "http://localhost:5000",
            "http://localhost:3000",
            "http://127.0.0.1:5000"
        };
        
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.WebHost.UseUrls("http://0.0.0.0:5000", "https://0.0.0.0:5001");

var app = builder.Build();

app.UseCors("AllowAll");

app.UseStaticFiles();

app.MapControllers();

// Fallback específico para rotas de API - retorna JSON 404
app.MapFallback("/api/{*path}", () =>
{
    return Results.Json(new
    {
        error = "Endpoint não encontrado",
        message = "A rota da API solicitada não existe"
    }, statusCode: 404);
});

// Fallback para rotas que não são API (SPA routing)
app.MapFallbackToFile("index.html");

app.Run();
