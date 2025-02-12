"use server";

import postgres from "postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

// ✅ Define `FormSchema` first
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(["pending", "paid"]),
  date: z.string(),
});

// ✅ Now define `UpdateInvoice`
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

// Initialize PostgreSQL connection
const sql = postgres({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl: { rejectUnauthorized: false }, // Enable SSL if needed
});

// Define `CreateInvoice`
const CreateInvoice = z.object({
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(["pending", "paid"]),
});

//************************************** Create ***************************************************//
export async function createInvoice(formData: FormData) {
  try {
    const parsedData = CreateInvoice.parse({
      customerId: formData.get("customerId"),
      amount: formData.get("amount"),
      status: formData.get("status"),
    });

    const amountInCents = parsedData.amount * 100;
    const date = new Date().toISOString().split("T")[0];

    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${parsedData.customerId}, ${amountInCents}, ${parsedData.status}, ${date})
    `;

    revalidatePath("/dashboard/invoices");
  } catch (error) {
    console.error("Error creating invoice:", error);
    throw new Error("Failed to create invoice");
  }

  redirect("/dashboard/invoices");
}

//************************************** Update ***************************************************//
export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  const amountInCents = amount * 100;

  await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

//************************************** Delete ***************************************************//
export async function deleteInvoice(id: string) {
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath("/dashboard/invoices");
}
