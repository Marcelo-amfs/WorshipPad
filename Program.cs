using WorshipPad;
using System.Net;

/// <summary>
/// Ponto de entrada da aplicação WorshipPad.
/// Configura e inicializa o servidor web ASP.NET Core com suporte a CORS,
/// arquivos estáticos e roteamento de API.
/// </summary>
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddSingleton<WorshipPadService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        // Em produção, permite origens específicas (Netlify e localhost para desenvolvimento)
        var allowedOrigins = new[]
        {
            "https://worshipad.netlify.app",
            "https://worshipad.netlify.app/",
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

app.MapFallbackToFile("index.html");

app.Run();
