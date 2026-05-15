import { describe, expect, it } from "vitest";

import { getCognitoConfig, signIn } from "./auth-api";

describe("BudgetFlow auth API", () => {
  it("signs in a demo admin in mock mode", async () => {
    const session = await signIn({
      email: "admin@budgetflow.dev",
      password: "budgetflow",
    });

    expect(session).toMatchObject({
      user: {
        email: "admin@budgetflow.dev",
        name: "BudgetFlow 관리자",
        role: "admin",
      },
      provider: "mock",
    });
    expect(session.accessToken).toContain("mock-token");
  });

  it("rejects invalid credentials", async () => {
    await expect(
      signIn({
        email: "admin@budgetflow.dev",
        password: "wrong-password",
      }),
    ).rejects.toThrow("이메일 또는 비밀번호가 올바르지 않습니다.");
  });

  it("returns Cognito placeholder config from public env", () => {
    const config = getCognitoConfig({
      NEXT_PUBLIC_AWS_REGION: "ap-northeast-2",
      NEXT_PUBLIC_COGNITO_USER_POOL_ID: "ap-northeast-2_demo",
      NEXT_PUBLIC_COGNITO_APP_CLIENT_ID: "demo-client",
    });

    expect(config).toEqual({
      region: "ap-northeast-2",
      userPoolId: "ap-northeast-2_demo",
      appClientId: "demo-client",
      isConfigured: true,
    });
  });
});
