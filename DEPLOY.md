# 🚀 Guia de Deploy para Produção

Este guia explica como configurar o WorshipPad para funcionar em produção com o frontend no Netlify e o backend em um servidor separado.

## 📋 Pré-requisitos

1. **Backend hospedado**: O backend .NET precisa estar rodando em um servidor (Azure, AWS, Railway, Render, Heroku, etc.)
2. **Frontend no Netlify**: O frontend está hospedado em `https://worshipad.netlify.app/`
3. **CORS configurado**: O backend precisa permitir requisições do domínio do Netlify

## ⚙️ Configuração

### 1. Configurar URL do Backend no Frontend

O frontend precisa saber onde está o backend. Você tem duas opções:

#### Opção A: Configurar via HTML (Recomendado)

Edite o arquivo `wwwroot/index.html` e descomente/configure a variável:

```html
<script>
    window.WORSHIP_PAD_API_URL = 'https://seu-backend-url.com/api/WorshipPad';
</script>
```

**Exemplos de URLs de backend:**
- Azure: `https://worshippad-api.azurewebsites.net/api/WorshipPad`
- Railway: `https://worshippad-api.railway.app/api/WorshipPad`
- Render: `https://worshippad-api.onrender.com/api/WorshipPad`
- Heroku: `https://worshippad-api.herokuapp.com/api/WorshipPad`

#### Opção B: Editar diretamente no código

Edite `wwwroot/app.jsx` (linha ~30) e substitua:

```javascript
return 'https://seu-backend-url.com/api/WorshipPad';
```

pela URL real do seu backend.

### 2. Configurar CORS no Backend

O arquivo `Program.cs` já está configurado para permitir o domínio do Netlify. Se você precisar adicionar mais domínios, edite:

```csharp
var allowedOrigins = new[]
{
    "https://worshipad.netlify.app",
    "https://worshipad.netlify.app/",
    "http://localhost:5000",
    "http://localhost:3000",
    "http://127.0.0.1:5000"
};
```

### 3. Deploy do Backend

#### Build e Publicação

```bash
dotnet publish -c Release -o ./publish
```

#### Variáveis de Ambiente

Configure as seguintes variáveis de ambiente no seu servidor:

- `ASPNETCORE_ENVIRONMENT=Production`
- `ASPNETCORE_URLS=http://0.0.0.0:5000;https://0.0.0.0:5001`

#### Serviços Recomendados

**Railway:**
1. Conecte seu repositório
2. Configure o build command: `dotnet publish -c Release -o ./publish`
3. Configure o start command: `cd publish && dotnet WorshipPad.dll`
4. Adicione as variáveis de ambiente

**Render:**
1. Crie um novo Web Service
2. Configure o build command: `dotnet publish -c Release -o ./publish`
3. Configure o start command: `cd publish && dotnet WorshipPad.dll`
4. Adicione as variáveis de ambiente

**Azure:**
1. Crie um App Service
2. Configure o deployment do código
3. Configure as variáveis de ambiente no portal

### 4. Deploy do Frontend no Netlify

1. Conecte seu repositório ao Netlify
2. Configure:
   - **Build command**: (deixe vazio ou `echo "No build needed"`)
   - **Publish directory**: `wwwroot`
3. Deploy!

### 5. Verificar Funcionamento

1. Acesse `https://worshipad.netlify.app/`
2. Abra o Console do navegador (F12)
3. Tente reproduzir um pad
4. Verifique se as requisições estão indo para a URL correta do backend

## 🔍 Troubleshooting

### Erro: "Failed to fetch" ou CORS

**Causa**: Backend não está permitindo requisições do Netlify ou URL incorreta.

**Solução**:
1. Verifique se a URL do backend está correta no `index.html`
2. Verifique se o CORS está configurado no `Program.cs`
3. Verifique se o backend está rodando e acessível

### Erro: "404 Not Found" ao tentar reproduzir

**Causa**: Backend não está encontrando os arquivos de áudio.

**Solução**:
1. Certifique-se de que os arquivos MP3 estão no diretório `Pads/Shimmer/` no servidor
2. Verifique os caminhos dos arquivos (lembre-se que `#` foi substituído por `s`)
3. Verifique as permissões de leitura dos arquivos

### Áudio não reproduz

**Causa**: Problema com CORS ou URL incorreta.

**Solução**:
1. Verifique o Console do navegador para erros
2. Verifique a Network tab para ver se as requisições estão sendo feitas
3. Verifique se o backend está retornando os arquivos corretamente

## 📝 Checklist de Deploy

- [ ] Backend está rodando e acessível
- [ ] URL do backend configurada no `index.html` ou `app.jsx`
- [ ] CORS configurado para permitir `https://worshipad.netlify.app`
- [ ] Arquivos de áudio estão no servidor backend em `Pads/Shimmer/`
- [ ] Frontend deployado no Netlify
- [ ] Testado reprodução de áudio
- [ ] Verificado Console do navegador para erros

## 🔗 Links Úteis

- [Netlify Docs](https://docs.netlify.com/)
- [Railway Docs](https://docs.railway.app/)
- [Render Docs](https://render.com/docs)
- [Azure App Service Docs](https://docs.microsoft.com/azure/app-service/)

