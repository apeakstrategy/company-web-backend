require("dotenv").config();
const app = require("./app");
const prisma = require("./config/prisma");
const newsletterWorker = require("./services/newsletter-worker");

const port = Number(process.env.PORT) || 5000;
const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  newsletterWorker.start().catch((error) => console.error("Newsletter worker could not start", error));
});

const shutdown = async (signal) => {
  console.log(`${signal} received; shutting down gracefully`);
  newsletterWorker.stop();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
