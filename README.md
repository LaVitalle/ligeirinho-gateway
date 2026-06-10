# Ligeirinho Food — API Gateway

Entrada única (reverse proxy) para o frontend. Roteia por prefixo de recurso para os microsserviços e agrega o Swagger de cada um. Express + `http-proxy-middleware`.

- **Porta:** 4000

## Roteamento
| Prefixo | Destino |
|---|---|
| `/auth`, `/users`, `/me`, `/institutions`, `/states`, `/cities` | identity (4001) |
| `/canteens`, `/categories`, `/products`, `/extras` | catalog (4002) |
| `/cart`, `/orders`, `/ratings`, `/reports` | orders (4003) |

Acesso namespaced (inclui o `/docs` de cada serviço): `/identity/*`, `/catalog/*`, `/orders/*`.
Ex.: `http://localhost:4000/catalog/docs`.

## Variáveis de ambiente
Ver [`.env.example`](.env.example): `PORT`, `IDENTITY_URL`, `CATALOG_URL`, `ORDERS_URL`.
Em produção (EasyPanel) use as URLs internas: `http://identity:4001`, etc.

## Comandos
```bash
npm install
cp .env.example .env
npm run start:dev
npm run build && npm run start:prod
npm run typecheck
```

## Docker
```bash
docker build -t ligeirinho-gateway .
```
