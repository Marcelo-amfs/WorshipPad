# Estágio 1: Build do Frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Estágio 2: Build do Backend
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend-build
WORKDIR /src
COPY ["WorshipPad.csproj", "./"]
RUN dotnet restore "WorshipPad.csproj"
COPY . .
RUN dotnet build "WorshipPad.csproj" -c Release -o /app/build
RUN dotnet publish "WorshipPad.csproj" -c Release -o /app/publish

# Estágio 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=backend-build /app/publish .
# Copiar o build do frontend para a pasta wwwroot, para que o ASP.NET sirva os arquivos estáticos
COPY --from=frontend-build /app/frontend/dist ./wwwroot

# Expor a porta 8080 (padrão do .NET 8 em containers)
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV PORT=8080

ENTRYPOINT ["dotnet", "WorshipPad.dll"]
