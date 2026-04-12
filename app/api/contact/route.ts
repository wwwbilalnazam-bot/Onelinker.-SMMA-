import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { name, email, topic, message } = await req.json();

    // Validation
    if (!name || !email || !topic || !message) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, topic, message" },
        { status: 400 }
      );
    }

    if (typeof message === "string" && message.trim().length < 10) {
      return NextResponse.json(
        { error: "Message must be at least 10 characters" },
        { status: 400 }
      );
    }

    // Get Resend API key
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "hello@onelinker.ai";
    const toEmail = "support@onelinker.ai";

    if (!apiKey) {
      console.warn("[Contact] RESEND_API_KEY not set — email skipped");
      // Still return success but log for debugging
      return NextResponse.json({
        success: true,
        message: "Message received (email sending disabled)",
      });
    }

    try {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);

      // Send email
      await resend.emails.send({
        from: `Onelinker <${fromEmail}>`,
        to: toEmail,
        replyTo: email,
        subject: `[${topic}] New contact form submission from ${name}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #1a1a1a; font-size: 20px; margin-bottom: 8px;">New Contact Form Submission</h2>

            <div style="background: #f9f9f9; border-left: 4px solid #7c3aed; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="color: #666; font-size: 14px; margin: 0 0 8px 0;"><strong>From:</strong> ${name} (${email})</p>
              <p style="color: #666; font-size: 14px; margin: 0;"><strong>Topic:</strong> ${topic}</p>
            </div>

            <div style="background: #ffffff; border: 1px solid #e0e0e0; padding: 16px; border-radius: 6px; margin: 24px 0;">
              <h3 style="color: #333; font-size: 14px; margin: 0 0 12px 0;">Message:</h3>
              <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
            </div>

            <p style="color: #999; font-size: 12px; margin-top: 24px;">
              Reply to this email to respond directly to the user.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("[Contact] Failed to send email:", emailError);
      // Don't fail the request — form was submitted successfully
    }

    return NextResponse.json({
      success: true,
      message: "Your message has been received. We'll get back to you soon!",
    });
  } catch (error) {
    console.error("[Contact] Error processing form:", error);
    return NextResponse.json(
      { error: "Failed to process your request. Please try again later." },
      { status: 500 }
    );
  }
}
