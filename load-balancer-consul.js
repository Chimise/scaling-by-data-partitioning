import { createServer } from "http";
import httpProxy from "http-proxy";
import Consul from "consul";
import { resDecorator } from "./utils/index.js";
import RequestError from "./utils/request-error.js";

const consulClient = new Consul();

const routing = [
  {
    path: "/api/people",
    service: "user-service",
    partitions: [],
  },
];

const PORT = process.env.PORT || process.argv[2] || 8080;

const cache = new Map();

let CACHE_TTL = 5000;

const generateUrl = (service) => {
  return `http://${service.Address}:${service.Port}`;
};

// Group the services by the partition regex string
const groupByPartitions = (route, routeServices) => {
  const partitions = new Map();
  for (const service of routeServices) {
    const matcher = service.Tags[0];
    if (partitions.has(matcher)) {
      const partition = partitions.get(matcher);
      partition.urls.push(generateUrl(service));
    } else {
      partitions.set(matcher, {
        urls: [generateUrl(service)],
        matcher,
        index: 0,
      });
    }
  }

  route.partitions = Array.from(partitions.values());
};

// Add functionality to cache fetched services
function getServices() {
  if (process.env.NODE_ENV !== "production") {
    CACHE_TTL = 1000;
  }

  if (cache.has("services")) {
    return cache.get("services");
  }

  const promiseService = consulClient.agent.service.list();
  cache.set("services", promiseService);
  promiseService.then(
    (services) => {
      if (!services) {
        return cache.delete("services");
      }

      setTimeout(() => {
        cache.delete("services");
      }, CACHE_TTL);
    },
    (err) => {
      cache.delete("services");
    }
  );

  return promiseService;
}

const getTarget = (route, url) => {
  let target;
  for (const partition of route.partitions) {
    const regex = new RegExp(partition.matcher, "i");
    if (regex.test(url)) {
      partition.index = (partition.index + 1) % partition.urls.length;
      target = partition.urls[partition.index];
      break;
    }
  }

  return target;
};

async function main() {
  const proxy = httpProxy.createProxyServer();
  const server = createServer(async (req, res) => {
    const url = req.url;
    const error = new RequestError("Bad Gateway", 502);
    resDecorator(res);
    try {
      const route = routing.find((route) => url.startsWith(route.path));
      if (!route) {
        throw error;
      }

      const allServices = await getServices();
      
      const routeServices = Object.values(allServices).filter(
        (service) => service.Service === route.service
      );

      if (routeServices.length === 0) {
        throw error;
      }
      let target;
      if (route.partitions) {
        groupByPartitions(route, routeServices);
        target = getTarget(route, url);
      } else {
        route.index = ((route.index ?? 0) + 1) % routeServices.length;
        const service = routeServices[route.index];
        target = generateUrl(service);
      }

      if (!target) {
        throw error;
      }

      proxy.web(req, res, { target });
    } catch (err) {
      console.log(err);
      err = err instanceof RequestError ? err : error;
      return res.status(err.code).end(err.message);
    }
  });

  server.listen(PORT, () => {
    console.log("Load balancer running on port %d", PORT);
  });
}

main().catch((err) => console.log(err));
