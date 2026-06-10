import "dotenv/config";
import express from "express";
import {
  createProxyMiddleware,
  type RequestHandler,
} from "http-proxy-middleware";

const PORT = process.env.PORT ?? 4000;
const IDENTITY_URL = process.env.IDENTITY_URL ?? "http://localhost:4001";
const CATALOG_URL = process.env.CATALOG_URL ?? "http://localhost:4002";
const ORDERS_URL = process.env.ORDERS_URL ?? "http://localhost:4003";

interface ServiceRoute {
  name: string;
  url: string;
  prefixes: string[];
}

const services: ServiceRoute[] = [
  {
    name: "identity",
    url: IDENTITY_URL,
    prefixes: ["/auth", "/users", "/me", "/institutions", "/states", "/cities"],
  },
  {
    name: "catalog",
    url: CATALOG_URL,
    prefixes: ["/canteens", "/categories", "/products", "/extras"],
  },
  {
    name: "orders",
    url: ORDERS_URL,
    prefixes: ["/cart", "/orders", "/ratings", "/reports"],
  },
];

const app = express();

// Índice do gateway (contrato padronizado: data/status/pagination)
app.get("/", (_req, res) => {
  res.json({
    data: {
      service: "Ligeirinho Food — API Gateway",
      docs: {
        identity: "/identity/docs",
        catalog: "/catalog/docs",
        orders: "/orders/docs",
      },
      routes: services.map((s) => ({ service: s.name, prefixes: s.prefixes })),
    },
    status: { code: 200, message: "Gateway online" },
    pagination: {},
  });
});

// Proxies (um por serviço, target fixo; encaminham a URL original intacta).
const proxies: Record<string, RequestHandler> = {};
for (const service of services) {
  proxies[service.name] = createProxyMiddleware({
    target: service.url,
    changeOrigin: true,
  });
}

// Acesso namespaced (expõe o /docs e acesso bruto de cada serviço):
//   /identity/* -> identity, /catalog/* -> catalog, /orders/* -> orders
// O Express remove o prefixo do mount; reescrevemos para preservar a rota.
for (const service of services) {
  app.use(
    `/${service.name}`,
    createProxyMiddleware({
      target: service.url,
      changeOrigin: true,
    }),
  );
}

// Overrides: recursos de um serviço que vivem sob o prefixo de outro.
// As avaliações de cantina (GET /canteens/:id/ratings e /canteens/:id/rating)
// pertencem ao orders, mas /canteens normalmente vai para o catalog.
const overrides: { pattern: RegExp; service: string }[] = [
  { pattern: /^\/canteens\/[^/]+\/ratings?$/, service: "orders" },
];

// Roteamento limpo por prefixo de recurso — 1 base URL para o frontend.
// Dispatcher explícito: escolhe o serviço pelo path e delega ao proxy
// correspondente (sem glob/strip de mount — robusto).
function resolveService(path: string): string | null {
  for (const override of overrides) {
    if (override.pattern.test(path)) return override.service;
  }
  for (const service of services) {
    for (const prefix of service.prefixes) {
      if (path === prefix || path.startsWith(`${prefix}/`)) {
        return service.name;
      }
    }
  }
  return null;
}

app.use((req, res, next) => {
  const serviceName = resolveService(req.path);
  if (!serviceName) return next();
  return proxies[serviceName](req, res, next);
});

app.listen(PORT, () => {
  console.log(`[Gateway] porta ${PORT}`);
  console.log(`  identity -> ${IDENTITY_URL}`);
  console.log(`  catalog  -> ${CATALOG_URL}`);
  console.log(`  orders   -> ${ORDERS_URL}`);
});
