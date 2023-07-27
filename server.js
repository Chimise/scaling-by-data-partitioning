import { createServer } from "http";
import mongoose from "mongoose";
import Consul from "consul";
import { nanoid } from "nanoid";
import { PORT, MONGO_URL, ADDRESS, PARTITION } from "./config/index.js";
import User from "./models/User.js";
import { resDecorator } from "./utils/index.js";

const consulClient = new Consul();

const service = { name: "user-service", id: null };

const generateMatcher = () => {
  return String.raw`^\/api\/people\/byFirstName\/[${PARTITION}]{1}\w*$`;
};

const registerService = () => {
  if (!service.id) {
    service.id = nanoid();
  }

  return consulClient.agent.service
    .register({
      id: service.id,
      name: service.name,
      port: parseInt(PORT),
      address: ADDRESS,
      tags: [generateMatcher()],
    })
    .then(
      () => {
        console.log(`${service.id} registered successfully`);
      },
      (err) => {
        console.log(err);
        service.id = null;
      }
    );
};

function deregisterService(retry = 3) {
  if (!service.id) {
    return Promise.resolve();
  }

  if (retry === 0) {
    service.id = null;
    return Promise.resolve();
  }

  console.log(`Deregistering Service ${service.name} with id ${service.id}`);
  return consulClient.agent.service.deregister(service.id).then(
    () => {
      service.id = null;
    },
    (err) => {
      console.log(err);
      deregisterService(--retry);
    }
  );
}

process.on("exit", deregisterService);

process.on("SIGINT", () => {
  deregisterService().then(() => process.exit(0));
});

process.on("uncaughtException", (err) => {
  console.log(err);
  deregisterService().then(() => process.exit(1));
});

const server = createServer(async (req, res) => {
  resDecorator(res);
  const method = req.method;
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (
    method === "GET" &&
    url.pathname.match(/^\/api\/people\/byFirstName\/\w+$/)
  ) {
    const letter = url.pathname.split("/").slice(-1)[0];
    const users = await User.find({
      name: new RegExp(String.raw`^${letter}`, "i"),
    });
    return res.status(200).json(users);
  }

  res.status(405).end("Method not supported");
});

mongoose
  .connect(MONGO_URL)
  .then(() => {
    server.listen(PORT, ADDRESS, () => {
      registerService();
      console.log("Server listening on port %d", PORT);
    });
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
