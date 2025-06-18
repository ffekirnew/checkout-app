import * as z from "zod";

export const createOrderSchema = z.object({
  first_name: z.string().min(1, "First name is required."),
  last_name: z.string().min(1, "Last name is required."),
  phone_number: z
    .string()
    .min(9, { message: "Phone number must be at least 10 digits." })
    .max(9, { message: "Phone number cannot exceed 10 digits." })
    .regex(/^\d+$/, "Phone number must contain only digits."), // Ensure only digits for the number part
  email: z
    .string()
    .email("Invalid email address.")
    .min(1, "Email is required."),

  location: z.object({
    address: z.string().min(1, "Address is required."),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    postal_code: z.string().optional(),
  }),

  latest_time_of_delivery: z.string().min(1, "Delivery time is required."), // datetime-local outputs string

  parcel: z.object({
    size: z.string({
      message: "Parcel size is required.",
    }),
    length: z
      .number()
      .positive("Length must be positive.")
      .min(0.1, "Length is required."),
    width: z
      .number()
      .positive("Width must be positive.")
      .min(0.1, "Width is required."),
    height: z
      .number()
      .positive("Height must be positive.")
      .min(0.1, "Height is required."),
    weight: z
      .number()
      .positive("Weight must be positive.")
      .min(0.1, "Weight is required."),
    fragile: z.boolean(),
  }),
});

export type CreateOrderDtoType = z.infer<typeof createOrderSchema>;

export const getCreateOrderDefaultValue = (): CreateOrderDtoType => {
  return {
    first_name: "",
    last_name: "",
    phone_number: "",
    email: "",
    location: {
      address: "",
      latitude: 8.9806,
      longitude: 38.7578,
      postal_code: "1000",
    },
    latest_time_of_delivery: "",
    parcel: {
      size: "small",
      length: 0.1,
      width: 0.1,
      height: 0.1,
      weight: 0.1,
      fragile: false,
    },
  };
};
