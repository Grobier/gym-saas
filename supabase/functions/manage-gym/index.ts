import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResponse({ error: "No authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse({ error: "Missing Supabase config" }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const userResponse = await supabaseAdmin.auth.getUser(token);

    if (userResponse.error || !userResponse.data.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const actor = userResponse.data.user;
    if (actor.user_metadata?.role !== "superadmin") {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const body = await req.json();
    const action = body?.action;

    if (action === "create_gym") {
      return await createGym(supabaseAdmin, body);
    }

    return jsonResponse({ error: "Unsupported action" }, 400);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

async function createGym(supabaseAdmin: any, body: any) {
  const gymName = body?.gym_name?.trim();
  const city = body?.city?.trim() || null;
  const adminEmail = body?.admin_email?.trim()?.toLowerCase();
  const adminName = body?.admin_name?.trim();
  const adminPassword = body?.admin_password?.trim() || generatePassword();

  if (!gymName || !adminEmail || !adminName) {
    return jsonResponse(
      { error: "Missing required fields: gym_name, admin_email, admin_name" },
      400
    );
  }

  const existingUsers = await supabaseAdmin.auth.admin.listUsers();
  const duplicatedUser = existingUsers.data?.users?.find(
    (candidate: any) => candidate.email?.toLowerCase() === adminEmail
  );

  if (duplicatedUser) {
    return jsonResponse(
      { error: `Ya existe un usuario con el correo ${adminEmail}` },
      409
    );
  }

  const gymId = crypto.randomUUID();
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      name: adminName,
      role: "admin",
    },
  });

  if (authError || !authData.user) {
    return jsonResponse({ error: `Auth error: ${authError?.message || "Cannot create user"}` }, 400);
  }

  const gymPayload: Record<string, unknown> = {};
  gymPayload.name = gymName;
  const timestamp = new Date().toISOString();
  const gymPayloadCandidates: Record<string, unknown>[] = [
    {
      id: gymId,
      name: gymName,
      city,
      owner_id: authData.user.id,
      created_at: timestamp,
      updated_at: timestamp,
    },
    {
      id: gymId,
      name: gymName,
      owner_id: authData.user.id,
      created_at: timestamp,
      updated_at: timestamp,
    },
    {
      id: gymId,
      name: gymName,
      city,
      created_at: timestamp,
      updated_at: timestamp,
    },
    {
      id: gymId,
      name: gymName,
      created_at: timestamp,
      updated_at: timestamp,
    },
    {
      id: gymId,
      name: gymName,
      city,
    },
    {
      id: gymId,
      name: gymName,
    },
    {
      name: gymName,
      city,
    },
    {
      name: gymName,
    },
  ];

  let gymData: any = null;
  let gymError: any = null;

  for (const candidate of gymPayloadCandidates) {
    const sanitized = Object.fromEntries(
      Object.entries(candidate).filter(([, value]) => value !== null && value !== undefined)
    );

    const response = await supabaseAdmin
      .from("gyms")
      .insert(sanitized)
      .select()
      .single();

    if (!response.error) {
      gymData = response.data;
      gymError = null;
      break;
    }

    gymError = response.error;
  }

  if (gymError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return jsonResponse({ error: `Gym creation error: ${gymError.message}` }, 400);
  }

  const persistedGymId = gymData?.id || gymId;

  const { error: stateError } = await supabaseAdmin
    .from("gym_management_states")
    .upsert({
      gym_id: persistedGymId,
      is_active: true,
      blocked_reason: null,
      blocked_at: null,
      blocked_by: null,
      updated_at: new Date().toISOString(),
    });

  if (stateError) {
    await supabaseAdmin.from("gyms").delete().eq("id", persistedGymId);
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return jsonResponse({ error: `Gym state error: ${stateError.message}` }, 400);
  }

  const { error: accessError } = await supabaseAdmin
    .from("gym_access")
    .insert({
      user_id: authData.user.id,
      gym_id: persistedGymId,
      role: "admin",
    });

  if (accessError) {
    await supabaseAdmin.from("gym_management_states").delete().eq("gym_id", persistedGymId);
    await supabaseAdmin.from("gyms").delete().eq("id", persistedGymId);
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return jsonResponse({ error: `Gym access error: ${accessError.message}` }, 400);
  }

  await supabaseAdmin.functions.invoke("send-invitation", {
    body: {
      email: adminEmail,
      name: adminName,
      gym_name: gymName,
      temp_password: adminPassword,
    },
  }).catch(() => null);

  return jsonResponse({
    success: true,
    gym: gymData,
    admin_user_id: authData.user.id,
    admin_email: adminEmail,
    temp_password: adminPassword,
  });
}

function generatePassword() {
  return Math.random().toString(36).slice(-12) + "A1!";
}

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
