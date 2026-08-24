import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { gym_id, name, email, phone } = await req.json();

    if (!gym_id || !name || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: gym_id, name, email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get auth token from request
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase config" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify user is admin in this gym
    const token = authHeader.replace("Bearer ", "");
    const userResponse = await supabaseAdmin.auth.getUser(token);

    if (userResponse.error || !userResponse.data.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userResponse.data.user.id;

    // Check if user is admin in gym
    const { data: accessData, error: accessError } = await supabaseAdmin
      .from("gym_access")
      .select("role")
      .eq("user_id", userId)
      .eq("gym_id", gym_id)
      .eq("role", "admin")
      .single();

    if (accessError || !accessData) {
      return new Response(
        JSON.stringify({ error: "Not admin in this gym" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Auth user for student
    const tempPassword = Math.random().toString(36).slice(-12);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name,
        role: "student",
      },
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: `Auth error: ${authError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create student record
    const { data: studentData, error: studentError } = await supabaseAdmin
      .from("students")
      .insert({
        gym_id,
        user_id: authData.user.id,
        name,
        email,
        phone: phone || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (studentError) {
      return new Response(
        JSON.stringify({ error: `Student creation error: ${studentError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        student: studentData,
        user_id: authData.user.id,
        temp_password: tempPassword,
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
