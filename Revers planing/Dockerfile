
FROM mcr.microsoft.com AS build
WORKDIR /src

COPY ["Revers planing.csproj", "./"]

RUN dotnet restore "Revers planing.csproj"


COPY . .

RUN dotnet publish "Revers planing.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000

ENTRYPOINT ["dotnet", "Revers planing.dll"]
