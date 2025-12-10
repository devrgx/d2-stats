import { defineConfig } from 'astro/config';
import node from "@astrojs/node";

export default defineConfig({
  server: { port: 5200 },
  output: 'server', // statt "static"
  adapter: node({
    mode: "standalone", // erstellt kompletten Node-Server (ideal für Apache-Proxy)
  }),
});
