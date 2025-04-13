import { DateTime, Str } from "chanfana";
import { z } from "zod";

export const Task = z.object({
	name: Str({ example: "lorem" }),
	email: Str(),
	description: Str({ required: false }),
	completed: z.boolean().default(false),
	due_date: DateTime(),
});

export const Contact = z.object({ // form data
	name: Str({ required: true }).min(2).max(15),
	email: z.string().email(),
	subject: Str({ required: true }).min(5).max(200),
	message: Str({ required: true }).min(10).max(5000),
})

