import { describe, it, expect } from "vitest";

// Pure validation helpers extracted from request-form business rules
function validateComment(comment: string): string | null {
  if (comment.trim().length < 10) return "Комментарий минимум 10 символов";
  return null;
}

function validateAmount(value: string): string | null {
  const n = parseFloat(value);
  if (isNaN(n) || n <= 0) return "Количество должно быть положительным числом";
  return null;
}

function validateDeductedEmployee(
  type: "with_deduction" | "without_deduction",
  employeeId: string
): string | null {
  if (type === "with_deduction" && !employeeId) {
    return "При типе 'С удержанием' сотрудник обязателен";
  }
  return null;
}

function validateForm(form: {
  comment: string;
  amount: string;
  type: "with_deduction" | "without_deduction";
  deducted_employee_id: string;
  store_id: string;
  product_name: string;
  photo: boolean;
}): string[] {
  const errors: string[] = [];
  if (!form.photo) errors.push("Прикрепите фото");
  if (!form.store_id) errors.push("Выберите торговую точку");
  if (!form.product_name.trim()) errors.push("Укажите наименование продукта");
  const commentErr = validateComment(form.comment);
  if (commentErr) errors.push(commentErr);
  const amountErr = validateAmount(form.amount);
  if (amountErr) errors.push(amountErr);
  const empErr = validateDeductedEmployee(form.type, form.deducted_employee_id);
  if (empErr) errors.push(empErr);
  return errors;
}

describe("Comment validation", () => {
  it("rejects empty comment", () => {
    expect(validateComment("")).not.toBeNull();
  });

  it("rejects comment shorter than 10 chars", () => {
    expect(validateComment("короткий")).not.toBeNull();
  });

  it("accepts comment of exactly 10 chars", () => {
    expect(validateComment("1234567890")).toBeNull();
  });

  it("accepts comment longer than 10 chars", () => {
    expect(validateComment("Продукт испорчен, обнаружена плесень")).toBeNull();
  });

  it("counts only non-whitespace for minimum", () => {
    expect(validateComment("         ")).not.toBeNull();
  });
});

describe("Amount validation", () => {
  it("rejects zero", () => {
    expect(validateAmount("0")).not.toBeNull();
  });

  it("rejects negative", () => {
    expect(validateAmount("-1.5")).not.toBeNull();
  });

  it("rejects empty string", () => {
    expect(validateAmount("")).not.toBeNull();
  });

  it("rejects non-numeric", () => {
    expect(validateAmount("abc")).not.toBeNull();
  });

  it("accepts positive integer", () => {
    expect(validateAmount("5")).toBeNull();
  });

  it("accepts decimal", () => {
    expect(validateAmount("2.5")).toBeNull();
  });
});

describe("Deducted employee validation", () => {
  it("requires employee when type is with_deduction", () => {
    expect(validateDeductedEmployee("with_deduction", "")).not.toBeNull();
  });

  it("passes when type is with_deduction and employee set", () => {
    expect(validateDeductedEmployee("with_deduction", "user-uuid-123")).toBeNull();
  });

  it("passes when type is without_deduction and no employee", () => {
    expect(validateDeductedEmployee("without_deduction", "")).toBeNull();
  });
});

describe("Full form validation", () => {
  const valid = {
    photo: true,
    store_id: "store-uuid",
    product_name: "Котлета говяжья",
    comment: "Продукт испорчен, истёк срок",
    amount: "2.5",
    type: "without_deduction" as const,
    deducted_employee_id: "",
  };

  it("passes with valid data", () => {
    expect(validateForm(valid)).toHaveLength(0);
  });

  it("fails without photo", () => {
    const errors = validateForm({ ...valid, photo: false });
    expect(errors).toContain("Прикрепите фото");
  });

  it("fails without store", () => {
    const errors = validateForm({ ...valid, store_id: "" });
    expect(errors).toContain("Выберите торговую точку");
  });

  it("fails with short comment", () => {
    const errors = validateForm({ ...valid, comment: "кор" });
    expect(errors.some((e) => e.includes("10"))).toBe(true);
  });

  it("fails with_deduction without employee", () => {
    const errors = validateForm({
      ...valid,
      type: "with_deduction",
      deducted_employee_id: "",
    });
    expect(errors.some((e) => e.includes("сотрудник"))).toBe(true);
  });

  it("accumulates multiple errors", () => {
    const errors = validateForm({
      photo: false,
      store_id: "",
      product_name: "",
      comment: "кор",
      amount: "-1",
      type: "with_deduction",
      deducted_employee_id: "",
    });
    expect(errors.length).toBeGreaterThanOrEqual(5);
  });
});