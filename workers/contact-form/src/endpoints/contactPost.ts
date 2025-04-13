import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { Contact } from "../types";

interface Env {
	CONTACT_MESSAGES: KVNamespace,
	API_KEYS: SecretsStoreSecret,
}

function isSpam(contact) {
  const { name, email, message } = contact;
  const blacklist = ["viagra", "bitcoin", "loan", "sex", "adult", "crypto"];
  const linkCount = (message.match(/https?:\/\//gi) || []).length;

  const isEmpty = !message || message.trim().length < 10;
  const isBlacklisted = blacklist.some(word =>
    message.toLowerCase().includes(word)
  );
  const tooManyLinks = linkCount > 2;

  return isEmpty || isBlacklisted || tooManyLinks;
}

async function sendEmail(contact, env) {
  const { name, email, message, subject } = contact;
  const key = env.RESEND_KEY ? env.RESEND_KEY : await env.API_KEYS.get();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "Contact Form <donotreply@contact.marcoshill.com>",  // or your verified domain
      to: "marcoshill01@gmail.com",
      subject: `New Contact Form Submission from ${name}`,
      html: `
        <h2>New Message</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong><br>${message.replace(/\n/g, "<br>")}</p>
      `
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to send email:", error);
    return false;
  }

  return true;
}


export class ContactPost extends OpenAPIRoute {
	schema = {
		tags: ["Contact"],
		summary: "Handle post data from contact form",
		request: {
			body: {
				content: {
					"application/json": {
						schema: Contact,
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Returns the created task",
				content: {
					"application/json": {
						schema: z.object({
							series: z.object({
								success: Bool(),
								error: z.string().optional()
								// result: z.object({
								// 	contact: Contact,
								// }),
							}),
						}),
					},
				},
			},
		},
	};

	async handle(c) {
		// Get validated data
		const data = await this.getValidatedData<typeof this.schema>();

		// Retrieve the validated request body
		const contactToCreate = data.body;
		const contact = {
			name: contactToCreate.name,
			email: contactToCreate.email,
			subject: contactToCreate.subject,
			message: contactToCreate.message,
		}

		// spam check
		if (isSpam(contact)){
			return new Response("Spam detected, revise your message.", { status: 400 })
		}
		
		// ip rate limiting
		const req = c.req.raw
		const ip = req.headers.get("CF-Connecting-IP");
		const ipKey = `ip:${ip}`;
		const last = await c.env.CONTACT_MESSAGES.get(ipKey);

		if (last && Date.now() - parseInt(last) < 30_000) {
			return new Response("You're sending messages too fast.", { status: 429 });
		}

		// add honeypot check?

		// save message
		const id = `${Date.now()}:${ip}`
		c.env.CONTACT_MESSAGES.put(id, JSON.stringify(contact))

		// send message
		const emailSent = await sendEmail(contact, c.env);
		if (!emailSent) {
			return new Response("Failed to send email", { status: 500 });
		}

		// Save ip timestamp
		await c.env.CONTACT_MESSAGES.put(ipKey, Date.now().toString(), { expirationTtl: 60 });

		// return sucess message
		return {
			success: true,
			// contact: contact,
		};
	}
}
