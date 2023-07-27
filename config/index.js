const url = process.env.MONGO_URL || process.argv[3];

export const PORT = process.env.PORT
  ? process.env.PORT
  : process.argv[2]
  ? process.argv[2]
  : 5000;

export const PARTITION = process.env.PARTITION || process.argv[4];

export const ADDRESS = process.env.ADDRESS || "localhost";

if (!url) {
  throw new Error("MongoDB url not specified");
}

if (!PARTITION) {
  throw new Error("Partition must be specified");
}

export const MONGO_URL = new URL(url, "mongodb://localhost:27017").toString();
