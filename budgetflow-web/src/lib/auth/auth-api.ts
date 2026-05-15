import { loginSchema, type LoginInput } from "@/lib/forms/login";

export type AuthRole = "admin" | "accountant";

export type AuthSession = {
  accessToken: string;
  provider: "mock" | "cognito";
  user: {
    email: string;
    name: string;
    role: AuthRole;
  };
};

export type CognitoConfig = {
  region: string;
  userPoolId: string;
  appClientId: string;
  isConfigured: boolean;
};

type PublicEnv = Record<string, string | undefined>;

export function getCognitoConfig(env: PublicEnv = process.env): CognitoConfig {
  const region = env.NEXT_PUBLIC_AWS_REGION ?? "";
  const userPoolId = env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? "";
  const appClientId = env.NEXT_PUBLIC_COGNITO_APP_CLIENT_ID ?? "";

  return {
    region,
    userPoolId,
    appClientId,
    isConfigured: Boolean(region && userPoolId && appClientId),
  };
}

export async function signIn(input: LoginInput): Promise<AuthSession> {
  const result = loginSchema.safeParse(input);

  if (!result.success) {
    throw new Error("로그인 입력이 올바르지 않습니다.");
  }

  const cognitoConfig = getCognitoConfig();

  if (cognitoConfig.isConfigured) {
    return signInWithCognitoPlaceholder(result.data.email);
  }

  return signInWithMockCredentials(result.data);
}

function signInWithMockCredentials(input: LoginInput): AuthSession {
  if (
    input.email !== "admin@budgetflow.dev" ||
    input.password !== "budgetflow"
  ) {
    throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
  }

  return {
    accessToken: `mock-token-${Date.now().toString(36)}`,
    provider: "mock",
    user: {
      email: input.email,
      name: "BudgetFlow 관리자",
      role: "admin",
    },
  };
}

function signInWithCognitoPlaceholder(email: string): AuthSession {
  return {
    accessToken: `cognito-placeholder-${Date.now().toString(36)}`,
    provider: "cognito",
    user: {
      email,
      name: "Cognito 관리자",
      role: "admin",
    },
  };
}
