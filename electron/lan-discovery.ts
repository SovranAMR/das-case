import dgram from "dgram";
import http from "http";
import { networkInterfaces } from "os";

const DISCOVERY_PORT = 41520;
const MAGIC = "DAS_CASE_DISCOVER";

export type DiscoveredServer = {
  name: string;
  host: string;
  port: number;
  version: string;
};

/**
 * Server side: listen for UDP discovery broadcasts and reply with office info.
 */
export function startDiscoveryServer(
  officeName: string,
  httpPort: number,
  appVersion = "1.0.0",
): dgram.Socket {
  const sock = dgram.createSocket({ type: "udp4", reuseAddr: true });

  sock.on("message", (msg, rinfo) => {
    if (msg.toString().trim() !== MAGIC) return;

    const reply = JSON.stringify({
      app: "das-case",
      name: officeName,
      host: getLocalIP(),
      port: httpPort,
      version: appVersion,
    });

    sock.send(reply, rinfo.port, rinfo.address);
  });

  sock.bind(DISCOVERY_PORT, "0.0.0.0");
  return sock;
}

/**
 * Client side: broadcast a discovery request and collect replies.
 * Returns within `timeoutMs` (default 3s).
 */
export function scanForServers(timeoutMs = 3000): Promise<DiscoveredServer[]> {
  return new Promise((resolve) => {
    const found: DiscoveredServer[] = [];
    const seen = new Set<string>();

    const sock = dgram.createSocket({ type: "udp4", reuseAddr: true });
    sock.bind(() => {
      sock.setBroadcast(true);

      sock.on("message", (msg) => {
        try {
          const data = JSON.parse(msg.toString()) as Record<string, unknown>;
          if (data.app !== "das-case") return;

          const key = `${data.host}:${data.port}`;
          if (seen.has(key)) return;
          seen.add(key);

          found.push({
            name: String(data.name ?? "DAS Case"),
            host: String(data.host),
            port: Number(data.port ?? 3000),
            version: String(data.version ?? "?"),
          });
        } catch {
          /* ignore malformed */
        }
      });

      const buf = Buffer.from(MAGIC);
      sock.send(buf, 0, buf.length, DISCOVERY_PORT, "255.255.255.255");

      const subnets = getLocalSubnets();
      for (const broadcast of subnets) {
        sock.send(buf, 0, buf.length, DISCOVERY_PORT, broadcast);
      }
    });

    setTimeout(() => {
      sock.close();

      if (found.length > 0) {
        resolve(found);
        return;
      }

      httpFallbackScan()
        .then((servers) => resolve(servers))
        .catch(() => resolve([]));
    }, timeoutMs);
  });
}

/**
 * Fallback: probe common subnet IPs via HTTP /api/discovery
 */
async function httpFallbackScan(): Promise<DiscoveredServer[]> {
  const localIP = getLocalIP();
  if (!localIP) return [];

  const parts = localIP.split(".");
  const subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;

  const targets = [1, 2, 5, 10, 100, 101, 102, 200, 254];
  const myLast = parseInt(parts[3], 10);
  for (let i = myLast - 3; i <= myLast + 3; i++) {
    if (i > 0 && i < 255 && !targets.includes(i)) targets.push(i);
  }

  const results: DiscoveredServer[] = [];

  await Promise.allSettled(
    targets.map((last) => {
      const host = `${subnet}.${last}`;
      return probeHost(host, 3000).then((server) => {
        if (server) results.push(server);
      });
    }),
  );

  return results;
}

function probeHost(
  host: string,
  port: number,
): Promise<DiscoveredServer | null> {
  return new Promise((resolve) => {
    const req = http.get(
      `http://${host}:${port}/api/discovery`,
      { timeout: 1500 },
      (res) => {
        let body = "";
        res.on("data", (chunk: Buffer) => (body += chunk.toString()));
        res.on("end", () => {
          try {
            const data = JSON.parse(body) as Record<string, unknown>;
            if (data.app === "das-case") {
              resolve({
                name: String(data.name ?? "DAS Case"),
                host,
                port,
                version: String(data.version ?? "?"),
              });
              return;
            }
          } catch {
            /* not our server */
          }
          resolve(null);
        });
      },
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
  });
}

function getLocalIP(): string {
  const nets = networkInterfaces();
  for (const ifaces of Object.values(nets)) {
    if (!ifaces) continue;
    for (const iface of ifaces) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "";
}

function getLocalSubnets(): string[] {
  const broadcasts: string[] = [];
  const nets = networkInterfaces();
  for (const ifaces of Object.values(nets)) {
    if (!ifaces) continue;
    for (const iface of ifaces) {
      if (iface.family !== "IPv4" || iface.internal) continue;
      const parts = iface.address.split(".").map(Number);
      const mask = iface.netmask.split(".").map(Number);
      const broadcast = parts.map((p, i) => (p | (~mask[i] & 255))).join(".");
      if (!broadcasts.includes(broadcast)) broadcasts.push(broadcast);
    }
  }
  return broadcasts;
}
