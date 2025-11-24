import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function smokeTest() {
  const baseUrl = "http://localhost:3000";
  const testUser = {
    email: `test_${Date.now()}@example.com`,
    password: "Password123!",
    acceptedTerms: true,
  };

  console.log("🚀 Starting Smoke Test (with Email Verification)...");
  console.log(`Target: ${baseUrl}`);

  try {
    // 1. Register
    console.log("\n1. Testing Registration...");
    const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });

    if (!registerRes.ok) {
      const error = await registerRes.text();
      throw new Error(`Registration failed: ${registerRes.status} ${error}`);
    }

    const registerData = (await registerRes.json()) as any;
    console.log("✅ Registration successful");
    console.log("Response:", registerData.message);

    // 1.5 Verify Email
    console.log("\n1.5 Verifying Email...");
    // Fetch the user from DB to get the token
    const user = await prisma.user.findUnique({
      where: { email: testUser.email },
    });
    if (!user || !user.verificationToken) {
      throw new Error("User not found or no verification token");
    }
    console.log("Token found:", user.verificationToken);

    const verifyRes = await fetch(
      `${baseUrl}/api/verify-email?token=${user.verificationToken}`,
      {
        method: "GET",
        redirect: "manual", // Don't follow redirect automatically to check the cookie/redirect
      }
    );

    // It should redirect or return 200
    if (verifyRes.status === 302 || verifyRes.ok) {
      console.log("✅ Email Verification successful (Redirected or OK)");
    } else {
      const error = await verifyRes.text();
      throw new Error(`Verification failed: ${verifyRes.status} ${error}`);
    }

    // 2. Login
    console.log("\n2. Testing Login...");
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    });

    if (!loginRes.ok) {
      const error = await loginRes.text();
      throw new Error(`Login failed: ${loginRes.status} ${error}`);
    }

    const loginData = (await loginRes.json()) as any;
    console.log("✅ Login successful");
    console.log("Token received:", !!loginData.token); // Note: Token might be in cookie now, but login endpoint returns it too?
    // Checking authController.login: it returns { success: true, userType: ... } and sets cookie.
    // It does NOT return the token in the body anymore in my previous read?
    // Let's check authController.login again.

    console.log("\n🎉 Smoke Test Passed! The Auth flow is working.");
  } catch (error) {
    console.error("\n❌ Smoke Test Failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

smokeTest();
