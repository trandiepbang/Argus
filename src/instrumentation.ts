export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { checkDatabaseConnection, checkRedisConnection, displayTrustedSources } = await import("./instrumentation.node");
  await checkDatabaseConnection();
  await checkRedisConnection();
  displayTrustedSources();
}
