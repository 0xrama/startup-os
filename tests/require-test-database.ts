export default function requireDisposableDatabase() {
  const databaseUrl = process.env.TEST_DATABASE_URL;

  if (!databaseUrl || new URL(databaseUrl).pathname !== "/pax_test") {
    throw new Error(
      "Set TEST_DATABASE_URL to a disposable database named pax_test. Tests erase its rows."
    );
  }
}
