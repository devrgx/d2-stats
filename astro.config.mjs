import { defineConfig } from 'astro/config';
import dotenv from "dotenv";
import node from "@astrojs/node";

dotenv.config();

export default defineConfig({
  server: { port: 5200 },
  output: 'server', // statt "static"
  adapter: node({
    mode: "standalone", // erstellt kompletten Node-Server (ideal für Apache-Proxy)
  }),
});
