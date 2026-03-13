import { createLibp2p } from "libp2p";
import { tcp } from "@libp2p/tcp";
import { webSockets } from "@libp2p/websockets";
import { identify } from "@libp2p/identify";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { fromString as u8FromString, toString as u8ToString } from "uint8arrays";

export const CHAT_TOPIC = "decentra-messenger/global-v1";

export async function createP2PNode(onMessage: (text: string) => void) {
  const node = await createLibp2p({
    addresses: { listen: ["/ip4/0.0.0.0/tcp/0", "/ip4/0.0.0.0/tcp/0/ws"] },
    transports: [tcp(), webSockets()],
    services: {
      identify: identify(),
      pubsub: gossipsub(),
    },
  });

  // @ts-ignore
  node.services.pubsub.addEventListener("message", (evt) => {
    const text = u8ToString(evt.detail.data);
    onMessage(text);
  });

  // @ts-ignore
  await node.services.pubsub.subscribe(CHAT_TOPIC);

  return {
    node,
    publish: async (text: string) => {
      // @ts-ignore
      await node.services.pubsub.publish(CHAT_TOPIC, u8FromString(text));
    },
  };
}
