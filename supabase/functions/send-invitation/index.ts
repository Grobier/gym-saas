import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request
    const { email, name, gym_name, temp_password } = await req.json();

    if (!email || !name || !gym_name || !temp_password) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TODO: Integrar con SendGrid, Resend, o SMTP
    // Por ahora, solo loguea
    console.log(`[EMAIL] Sending invitation to ${email}`);
    console.log(`Name: ${name}, Gym: ${gym_name}, Password: ${temp_password}`);

    // Ejemplo de estructura de email (si usas SendGrid):
    // const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
    // if (sendgridApiKey) {
    //   await fetch("https://api.sendgrid.com/v3/mail/send", {
    //     method: "POST",
    //     headers: {
    //       "Authorization": `Bearer ${sendgridApiKey}`,
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({
    //       personalizations: [{ to: [{ email }] }],
    //       from: { email: "noreply@moveos.app", name: "moveOS" },
    //       subject: `¡Bienvenido a ${gym_name}!`,
    //       html: `<h1>Bienvenido ${name}</h1>...`,
    //     }),
    //   });
    // }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation email queued for ${email}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
