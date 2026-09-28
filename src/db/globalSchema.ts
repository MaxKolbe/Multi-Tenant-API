import * as z from "zod";

export const optionalQueryNumber = (defaultValue: number) =>
  z.preprocess((v) => {
    if (v === "" || v === undefined || Number.isNaN(Number(v))) {
      return undefined;
    }

    return v;
  }, z.coerce.number().int().min(1).max(100).default(defaultValue));
