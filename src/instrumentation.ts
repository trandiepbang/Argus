export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { checkDatabaseConnection, checkRedisConnection } = await import("./instrumentation.node");
  await checkDatabaseConnection();
  await checkRedisConnection();
}
