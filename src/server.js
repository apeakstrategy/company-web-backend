require("dotenv").config();
const app = require("./app");
const prisma = require("./config/prisma");

const port = Number(process.env.PORT) || 5000;
const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

const shutdown = async (signal) => {
  console.log(`${signal} received; shutting down gracefully`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
