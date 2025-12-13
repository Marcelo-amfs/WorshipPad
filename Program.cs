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
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.WebHost.UseUrls("http://0.0.0.0:5000", "https://0.0.0.0:5001");

var app = builder.Build();

app.UseCors("AllowAll");

app.UseStaticFiles();

app.MapControllers();

app.MapFallbackToFile("index.html");

app.Run();
