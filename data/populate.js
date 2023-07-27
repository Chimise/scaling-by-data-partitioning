import mongoose, { mongo } from "mongoose";
import superagent from "superagent";
import { MONGO_URL, PARTITION} from "../config/index.js";
import User from "../models/User.js";

if(!PARTITION) {
  throw new Error('Partition must be specified');
}

const regex = new RegExp(String.raw`^[${PARTITION}]`, "i");

async function main() {
  try {
    await mongoose.connect(MONGO_URL);
    const response = await superagent.get(
      "https://randomuser.me/api/?results=5000"
    );
    if (!response.ok) {
      throw new Error("An error occurred");
    }

    const userData = JSON.parse(response.text);
    const users = [];

    for (const result of userData.results) {
      const { gender, email } = result;
      const name = [result.name.first, result.name.last].join(" ");
      const { city, state, country } = result.location;
      const location = { city, state, country };
      const dob = new Date(result.dob.date);
      const picture = result.picture.medium ?? result.picture.large;

      const data = {
        name,
        location,
        gender,
        email,
        dob,
        picture,
      };

      if (regex.test(name)) {
        users.push(data);
      }
    }

    await User.insertMany(users);
  } catch (error) {
    throw error;
  } finally {
    await mongoose.connection.close();
  }
}

main().catch((err) => {
  console.log(err);
  process.exit(1);
});
