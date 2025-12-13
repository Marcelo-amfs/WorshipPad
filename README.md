# WorshipPad

Aplicação web profissional para controle e reprodução de pads musicais em tempo real, desenvolvida para uso em ambientes de adoração e performance musical.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Características](#características)
- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [API Reference](#api-reference)
- [Arquitetura](#arquitetura)
- [Deploy](#deploy)
- [Desenvolvimento](#desenvolvimento)
- [Troubleshooting](#troubleshooting)

## 🎯 Visão Geral

WorshipPad é uma solução completa para reprodução e controle de pads musicais através de uma interface web moderna e responsiva. A aplicação permite que múltiplos dispositivos na mesma rede acessem e controlem a reprodução de áudio, com suporte a diferentes tons musicais, equalização, listas de músicas e presets personalizados.

### Principais Benefícios

- **Acesso Multi-dispositivo**: Controle via qualquer dispositivo conectado à rede local
- **Reprodução no Cliente**: Áudio processado diretamente no navegador, reduzindo carga no servidor
- **Interface Moderna**: Design responsivo com suporte a tema claro/escuro
- **Performance Otimizada**: Streaming de áudio com suporte a range requests
- **Funcionalidades Avançadas**: Equalizador, presets, lista de músicas e controle de acordes menores

## ✨ Características

### Reprodução de Áudio
- Reprodução de pads em 12 tons diferentes (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
- Suporte a acordes menores (Cm, C#m, etc.)
- Loop infinito automático
- Fade in/out suave para transições sem interrupções
- Controle de volume individual por pad

### Interface do Usuário
- Interface web moderna e intuitiva
- Design responsivo (desktop, tablet, mobile)
- Modo claro/escuro com persistência de preferência
- Feedback visual em tempo real
- Notificações de sistema
- Suporte a PWA (Progressive Web App)

### Funcionalidades Avançadas
- Equalizador de 10 bandas
- Presets de equalização personalizáveis
- Lista de músicas com ordenação
- Transição automática entre músicas
- Controle de acordes maiores e menores

### API e Integração
- API RESTful completa
- Suporte a CORS para integração externa
- Streaming de áudio otimizado
- Validação robusta de parâmetros

## 🛠 Tecnologias

### Backend
- **.NET 8.0** - Framework principal
- **ASP.NET Core** - Servidor web e API
- **NAudio 2.2.1** - Processamento de áudio

### Frontend
- **React 18** - Biblioteca de interface
- **JSX** - Sintaxe de componentes
- **HTML5 Audio API** - Reprodução de áudio no navegador
- **CSS3** - Estilização moderna com variáveis CSS
- **LocalStorage API** - Persistência de dados do cliente

### Infraestrutura
- **Kestrel** - Servidor web
- **CORS** - Cross-Origin Resource Sharing
- **Static Files Middleware** - Servir arquivos estáticos

## 📦 Pré-requisitos

### Software
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) ou superior
- Navegador web moderno (Chrome, Firefox, Edge, Safari)
- Sistema operacional: Windows, Linux ou macOS

### Arquivos de Áudio
Os arquivos de áudio devem estar organizados no diretório `Pads/Shimmer/` na raiz do projeto:

```
Pads/
└── Shimmer/
    ├── C.mp3
    ├── C#.mp3
    ├── Cm.mp3
    ├── D.mp3
    ├── D#.mp3
    └── ...
```

**Formato suportado**: MP3

**Nomenclatura**: `{Tom}.mp3` onde `{Tom}` pode ser:
- Notas simples: `C`, `D`, `E`, `F`, `G`, `A`, `B`
- Notas com sustenido: `C#`, `D#`, `F#`, `G#`, `A#`
- Acordes menores: `Cm`, `C#m`, `Dm`, etc.

## 🚀 Instalação

### 1. Clone o Repositório

```bash
git clone <repository-url>
cd WorshipPad
```

### 2. Restaure as Dependências

```bash
dotnet restore
```

### 3. Verifique os Arquivos de Áudio

Certifique-se de que os arquivos MP3 estão no diretório `Pads/Shimmer/` conforme especificado em [Pré-requisitos](#pré-requisitos).

### 4. Execute a Aplicação

```bash
dotnet run
```

A aplicação estará disponível em:
- **Local**: `http://localhost:5000`
- **Rede**: `http://0.0.0.0:5000` (acessível de outros dispositivos na rede)

## ⚙️ Configuração

### Portas e Endereços

As portas e endereços podem ser configuradas em `Program.cs`:

```csharp
builder.WebHost.UseUrls("http://0.0.0.0:5000", "https://0.0.0.0:5001");
```

### Caminho dos Arquivos de Áudio

O caminho base dos arquivos de áudio pode ser modificado em `WorshipPadService.cs`:

```csharp
private readonly string basePath = @"Pads\Shimmer\";
```

### CORS

A política CORS está configurada para permitir todas as origens. Para produção, recomenda-se restringir:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins("https://seu-dominio.com")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});
```

## 📖 Uso

### Acesso Local

1. Abra o navegador e acesse `http://localhost:5000`
2. A interface será carregada automaticamente

### Acesso em Rede

1. Descubra o IP da máquina servidor:
   - **Windows**: Execute `ipconfig` e procure por "IPv4 Address"
   - **Linux/Mac**: Execute `ifconfig` ou `ip addr`
2. Em outro dispositivo na mesma rede, acesse `http://[IP_DA_MAQUINA]:5000`
3. Certifique-se de que o firewall permite conexões na porta 5000

### Controles Básicos

- **Reproduzir Pad**: Clique no botão do tom desejado
- **Parar Reprodução**: Clique novamente no mesmo tom ou use o botão "Parar"
- **Acordes Menores**: Ative o toggle "Menor" e selecione o tom
- **Equalizador**: Clique no ícone de equalizador para ajustar frequências
- **Lista de Músicas**: Clique no ícone de lista para gerenciar músicas
- **Tema Escuro**: Use o toggle no canto superior direito

### Funcionalidades Avançadas

#### Equalizador
- Ajuste 10 bandas de frequência independentemente
- Salve presets personalizados
- Aplique presets salvos rapidamente

#### Lista de Músicas
- Adicione músicas com tom e acorde menor/menor
- Reordene músicas por drag-and-drop
- Transição automática entre músicas
- Controle de reprodução sequencial

## 📡 API Reference

### Base URL
```
http://localhost:5000/api/WorshipPad
```

### Endpoints

#### GET `/audio/{key}`
Retorna o arquivo de áudio MP3 para a chave musical especificada.

**Parâmetros:**
- `key` (path, obrigatório): Chave musical (ex: `C`, `C%23` para `C#`, `Cm`, `C%23m` para `C#m`)

**Respostas:**
- `200 OK`: Arquivo de áudio MP3 (com suporte a range requests)
- `400 Bad Request`: Chave inválida
- `404 Not Found`: Arquivo não encontrado
- `500 Internal Server Error`: Erro no servidor

**Exemplo:**
```bash
curl http://localhost:5000/api/WorshipPad/audio/C
```

#### POST `/play/{key}`
Valida e retorna informações sobre o arquivo de áudio disponível.

**Parâmetros:**
- `key` (path, obrigatório): Chave musical

**Resposta de Sucesso (200 OK):**
```json
{
  "message": "Arquivo disponível para C",
  "audioUrl": "/api/WorshipPad/audio/C",
  "key": "C"
}
```

**Respostas de Erro:**
- `400 Bad Request`: Chave inválida
- `404 Not Found`: Arquivo não encontrado
- `500 Internal Server Error`: Erro no servidor

**Exemplo:**
```bash
curl -X POST http://localhost:5000/api/WorshipPad/play/C
```

## 🏗 Arquitetura

### Estrutura do Projeto

```
WorshipPad/
├── Controllers/
│   └── WorshipPadController.cs    # API REST endpoints
├── Pads/
│   └── Shimmer/                   # Arquivos de áudio MP3
├── wwwroot/                       # Arquivos estáticos
│   ├── index.html                 # Página principal
│   ├── app.jsx                    # Aplicação React
│   ├── styles.css                 # Estilos
│   └── Worship-Pad.ico            # Ícone
├── LoopStream.cs                  # Stream de áudio com loop
├── Player.cs                      # Player de áudio (se aplicável)
├── Program.cs                     # Configuração da aplicação
├── WorshipPadService.cs            # Serviço de gerenciamento de arquivos
└── WorshipPad.csproj              # Arquivo de projeto
```

### Fluxo de Dados

1. **Cliente** → Requisição HTTP para `/api/WorshipPad/audio/{key}`
2. **Controller** → Valida chave e busca arquivo via `WorshipPadService`
3. **Service** → Retorna caminho do arquivo
4. **Controller** → Retorna arquivo MP3 com streaming
5. **Cliente** → Reproduz áudio via HTML5 Audio API

### Componentes Principais

- **WorshipPadController**: Gerencia requisições HTTP e validação
- **WorshipPadService**: Gerencia caminhos e validação de arquivos
- **React App**: Interface do usuário e lógica de reprodução
- **HTML5 Audio API**: Reprodução de áudio no navegador

## 🚢 Deploy

### Deploy em Produção

#### 1. Build da Aplicação

```bash
dotnet publish -c Release -o ./publish
```

#### 2. Configuração do Servidor

- Configure o servidor web (IIS, Nginx, Apache) para servir a aplicação
- Configure certificado SSL para HTTPS
- Configure firewall para permitir portas 5000 (HTTP) e 5001 (HTTPS)

#### 3. Executar como Serviço

**Windows (usando NSSM ou Windows Service):**
```bash
sc create WorshipPad binPath="C:\caminho\para\WorshipPad.exe"
sc start WorshipPad
```

**Linux (usando systemd):**
```ini
[Unit]
Description=WorshipPad Application
After=network.target

[Service]
Type=notify
ExecStart=/usr/bin/dotnet /caminho/para/WorshipPad.dll
Restart=always

[Install]
WantedBy=multi-user.target
```

#### 4. Variáveis de Ambiente

Configure variáveis de ambiente conforme necessário:
- `ASPNETCORE_ENVIRONMENT`: `Production`
- `ASPNETCORE_URLS`: URLs de escuta

### Docker (Opcional)

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 5000 5001

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["WorshipPad.csproj", "./"]
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "WorshipPad.dll"]
```

## 💻 Desenvolvimento

### Requisitos de Desenvolvimento

- .NET 8.0 SDK
- Editor de código (Visual Studio, VS Code, Rider)
- Navegador moderno para testes

### Executar em Modo Desenvolvimento

```bash
dotnet run
```

### Build

```bash
dotnet build
```

### Testes

```bash
dotnet test
```

### Estrutura de Código

- **Controllers**: Lógica de API e validação
- **Services**: Lógica de negócio e acesso a arquivos
- **wwwroot**: Frontend estático (React, CSS, HTML)

## 🔧 Troubleshooting

### Problemas Comuns

#### Arquivo de áudio não encontrado
- **Causa**: Arquivo não existe no diretório `Pads/Shimmer/`
- **Solução**: Verifique se o arquivo existe e está nomeado corretamente (ex: `C.mp3`)

#### Não consigo acessar de outro dispositivo
- **Causa**: Firewall bloqueando porta 5000
- **Solução**: Configure firewall para permitir conexões na porta 5000

#### Áudio não reproduz no navegador
- **Causa**: Navegador não suporta HTML5 Audio ou arquivo corrompido
- **Solução**: Teste em outro navegador e verifique se o arquivo MP3 está íntegro

#### Erro de CORS
- **Causa**: Política CORS restritiva
- **Solução**: Verifique configuração CORS em `Program.cs`

### Logs

Os logs da aplicação são exibidos no console. Para produção, configure logging apropriado:

```csharp
builder.Logging.AddConsole();
builder.Logging.AddFile("logs/worshippad-{Date}.txt");
```

## 📄 Licença

[Especificar licença se aplicável]

## 👥 Contribuição

[Instruções de contribuição se aplicável]

## 📞 Suporte

Para suporte, abra uma issue no repositório ou entre em contato com a equipe de desenvolvimento.

---

**WorshipPad** - Solução profissional para controle de pads musicais
