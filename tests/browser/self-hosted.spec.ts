import { expect, test } from "@playwright/test";
import { Pool } from "pg";

test("owner can sign in, inspect background work, and record a filing review", async ({
  page,
}) => {
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });

  try {
    await pool.query('TRUNCATE jobs, llcs, "user" CASCADE');
  } finally {
    await pool.end();
  }

  const signup = await page.request.post("/api/auth/sign-up/email", {
    data: {
      name: "Test owner",
      email: "browser@example.test",
      password: "test-only-strong-password-94!",
    },
    headers: { Origin: "http://127.0.0.1:3037" },
  });

  expect(signup.ok()).toBe(true);

  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("browser@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("test-only-strong-password-94!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/dashboard");

  const entity = await page.evaluate(
    async (data) => {
      const response = await fetch("/api/llcs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      return { status: response.status, body: await response.json() };
    },
    {
      name: "Browser LLC",
      state: "WY",
      entityType: "single-member",
      taxClassification: "disregarded",
      ownersAreIndividuals: true,
      ownershipIsDirect: true,
      ownershipSummary: {
        ownerCount: 1,
        foreignOwnerCount: 1,
        usOwnerCount: 0,
        ownershipTotal: 100,
      },
      members: [
        {
          name: "Owner",
          ownershipPct: 100,
          country: "Germany",
          taxIdType: "foreign",
          usTaxStatus: "foreign_person",
        },
      ],
      formationDate: "2025-01-01",
      taxYearEnd: "12-31",
    }
  );

  expect(entity.status).toBe(201);
  const { id } = entity.body;
  await page.goto("/dashboard/settings");
  await expect(
    page.getByRole("heading", { name: "Background work" })
  ).toBeVisible();
  await expect(
    page.getByText("No recent worker heartbeat. Start pnpm worker.")
  ).toBeVisible();
  await page.goto(`/dashboard/llc/${id}/filings`);
  await expect(
    page.getByRole("heading", { name: "Transaction facts and review" })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Freeze assessment snapshot" })
    .click();
  await expect(
    page.getByRole("button", { name: "Record my review" })
  ).toBeVisible();
  await page
    .getByLabel("Review notes")
    .fill("Checked the synthetic profile and statement records.");
  await page.getByRole("button", { name: "Record my review" }).click();
  await expect(page.getByText(/user_reviewed/)).toBeVisible();
});

test("signed-out visitors cannot read operational or filing data", async ({
  page,
}) => {
  expect((await page.request.get("/api/operations")).status()).toBe(401);
  expect(
    (await page.request.get("/api/llcs/unknown/review?year=2025")).status()
  ).toBe(401);
  await page.goto("/recover");
  await expect(
    page.getByRole("heading", { name: "Account recovery" })
  ).toBeVisible();
});
