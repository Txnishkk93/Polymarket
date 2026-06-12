import { z } from "zod";

export const CreateOrderSchema = z.object({
  marketId: z.string().uuid(),
  side: z.enum(["yes", "no"]),
  type: z.enum(["sell", "buy"]),
  price: z.number().int().min(1).max(99),
  qty: z.number().int().positive(),
});

export const SplitSchema = z.object({
  marketId: z.string().uuid(),
  amount: z.number().int().positive(),
});

export const OnrampSchema = z.object({
  amount: z.number().positive(),
});

export const OfframpSchema = z.object({
  amount: z.number().positive(),
});

export const OrderbookSchema = z.record(
  z.string(),
  z.object({
    availableQty: z.number(),
    orders: z.array(
      z.object({
        userId: z.string(),
        qty: z.number(),
        filledQty: z.number(),
        originalOrderId: z.string(),
        reverseOrder: z.boolean(),
      })
    ),
  })
);

export type Orderbook = z.infer<typeof OrderbookSchema>;
