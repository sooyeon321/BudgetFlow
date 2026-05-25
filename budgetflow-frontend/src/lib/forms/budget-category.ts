import { z } from "zod";

const budgetCategoryFields = {
  name: z.string().trim().min(1, "카테고리명을 입력하세요."),
  budgetLimit: z.coerce
    .number()
    .int("예산 한도는 원 단위 정수로 입력하세요.")
    .min(0, "예산 한도는 0원 이상이어야 합니다."),
};

const keywordsField = z.array(z.string()).default([]);

export const budgetCategorySchema = z.object({
  projectId: z.string().min(1),
  ...budgetCategoryFields,
  keywords: keywordsField,
});

export const budgetCategoryUpdateSchema = z.object({
  categoryId: z.string().min(1),
  ...budgetCategoryFields,
  keywords: keywordsField,
});

export const budgetCategoryFormSchema = z.object({
  ...budgetCategoryFields,
  keywordsText: z.string().optional(),
});

export function parseKeywordsText(value: string | undefined) {
  return Array.from(
    new Set(
      (value ?? "")
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    ),
  );
}

export type BudgetCategoryInput = z.input<typeof budgetCategorySchema>;
export type BudgetCategoryValues = z.output<typeof budgetCategorySchema>;
export type BudgetCategoryUpdateInput = z.input<
  typeof budgetCategoryUpdateSchema
>;
export type BudgetCategoryUpdateValues = z.output<
  typeof budgetCategoryUpdateSchema
>;
export type BudgetCategoryFormInput = z.input<typeof budgetCategoryFormSchema>;
export type BudgetCategoryFormValues = z.output<typeof budgetCategoryFormSchema>;
