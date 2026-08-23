import { describe, it, expect, afterEach } from "vitest";
import { SyncServer } from "../../src/network/server.js";
import { SyncClient } from "../../src/network/client.js";

describe("WebSocket Real-Time Synchronization", () => {
  let server: SyncServer | null = null;
  let clientA: SyncClient | null = null;
  let clientB: SyncClient | null = null;

  afterEach(async () => {
    clientA?.disconnect();
    clientB?.disconnect();
    if (server) {
      await server.stop();
    }
  });

  it("should synchronize real-time document edits over WebSocket channels", async () => {

    server = new SyncServer({ port: 0 });
    const port = await server.start();
    const serverUrl = `ws://localhost:${port}`;

    const docId = "shared-room-1";

    clientA = new SyncClient(docId, { serverUrl, peerId: "peer-a" });
    clientB = new SyncClient(docId, { serverUrl, peerId: "peer-b" });

    await clientA.connect();
    await clientB.connect();

    expect(clientA.isConnected).toBe(true);
    expect(clientB.isConnected).toBe(true);

    clientA.doc.set("room_status", "OPEN");
    clientA.doc.insertText("notes", 0, "Collab");
    clientA.sync();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(clientB.doc.get("room_status")).toBe("OPEN");
    expect(clientB.doc.getText("notes").toString()).toBe("Collab");

    clientB.doc.addToSet("users", "Bob");
    clientB.sync();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(clientA.doc.getSet("users").has("Bob")).toBe(true);
  });
});
