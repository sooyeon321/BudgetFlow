import { z } from "zod";

export const createProjectSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().trim().min(2, "프로젝트명을 2자 이상 입력하세요."),
  totalBudget: z.coerce
    .number()
    .int("총 예산은 원 단위 정수로 입력하세요.")
    .positive("총 예산은 1원 이상이어야 합니다."),
  slackChannelName: z
    .string()
    .trim()
    .min(1, "슬랙 채널명을 입력하세요.")
    .regex(/^#?[a-zA-Z0-9][a-zA-Z0-9-_]*$/, "슬랙 채널명 형식이 아닙니다."),
  templateFileName: z.string().optional(),
});

export type CreateProjectInput = z.input<typeof createProjectSchema>;
export type CreateProjectValues = z.output<typeof createProjectSchema>;
