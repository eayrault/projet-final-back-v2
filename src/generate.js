import crypto from "node:crypto";

const secret = crypto.randomBytes(64).toString("hex");
console.log(`JWT_SECRET=${secret}`);