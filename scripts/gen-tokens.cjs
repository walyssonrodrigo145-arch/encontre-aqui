const { SignJWT } = require("jose");

async function main() {
  const secret = new TextEncoder().encode(
    process.env.AUTH_SECRET ?? "ea-dev-secret-2026-change-in-production-min-32-chars!!"
  );
  const mk = (userId, role, name) =>
    new SignJWT({ userId, role, name })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret);

  const customer = await mk(2, "CUSTOMER", "Maria Cliente");
  const provider = await mk(3, "PROVIDER", "João Eletricista");
  const admin = await mk(1, "ADMIN", "Administrador");
  require("fs").writeFileSync(
    "../tokens.json",
    JSON.stringify({ customer, provider, admin }, null, 2)
  );
  console.log("ok");
}
main();
