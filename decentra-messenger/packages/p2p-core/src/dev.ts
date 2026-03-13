import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { createP2PNode } from "./index.js";
import { createIdentity } from "@decentra/crypto-core";

const argv = await yargs(hideBin(process.argv)).option("name", { type: "string", default: "anon" }).parse();
const name = argv.name as string;

const id = createIdentity();
const { node, publish } = await createP2PNode((msg) => {
  console.log(`[recv] ${msg}`);
});

console.log(`\n[${name}] started`);
console.log(`did: ${id.did}`);
console.log("multiaddrs:");
node.getMultiaddrs().forEach((a) => console.log(` - ${a.toString()}`));

process.stdin.setEncoding("utf8");
process.stdin.on("data", async (line) => {
  const text = line.trim();
  if (!text) return;
  await publish(`${name}: ${text}`);
});
