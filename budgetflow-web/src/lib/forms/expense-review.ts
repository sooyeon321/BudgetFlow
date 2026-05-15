import { z } from "zod";

export const expenseReviewSchema = z.object({
  expenseId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 아닙니다."),
  amount: z.coerce
    .number()
    .int("금액은 원 단위 정수로 입력하세요.")
    .positive("금액은 1원 이상이어야 합니다."),
  categoryId: z.string().min(1, "카테고리를 선택하세요."),
  description: z.string().trim().min(2, "설명을 2자 이상 입력하세요."),
});

export const expenseRejectSchema = z.object({
  expenseId: z.string().min(1),
  reason: z.string().trim().optional(),
});

export type ExpenseReviewInput = z.input<typeof expenseReviewSchema>;
export type ExpenseReviewValues = z.output<typeof expenseReviewSchema>;
export type ExpenseRejectInput = z.input<typeof expenseRejectSchema>;
