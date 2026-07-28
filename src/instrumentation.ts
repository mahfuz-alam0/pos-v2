export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // ponytail: some networks blackhole IPv6 to certain hosts (e.g. api.pixlab.io),
    // and undici's Happy Eyeballs fetch hangs until ETIMEDOUT instead of falling
    // back to the working IPv4 address. Force IPv4 for all server-side fetches.
    const { Agent, setGlobalDispatcher } = await import("undici");
    setGlobalDispatcher(new Agent({ connect: { family: 4 } }));
  }
}
