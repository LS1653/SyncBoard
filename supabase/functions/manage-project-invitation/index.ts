// Supabase Edge Function: manage-project-invitation
// Handles invitation lifecycle: create, list_received, list_project, accept, reject, revoke

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestPayload {
  action: "create" | "list_received" | "list_project" | "accept" | "reject" | "revoke";
  project_id?: string;
  email?: string;
  invitation_id?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Falta la cabecera de autorización." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client with caller's JWT to verify authentication and extract user claims
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Sesión inválida o expirada." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin/Service client only for privileged checks (like checking if invited email exists in auth)
    const adminClient = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey)
      : userClient;

    const payload: RequestPayload = await req.json();
    const { action, project_id, email, invitation_id } = payload;

    switch (action) {
      case "create": {
        if (!project_id || !email) {
          return new Response(JSON.stringify({ error: "project_id y email son obligatorios." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 1. Verify caller is owner of active project
        const { data: project, error: projErr } = await adminClient
          .from("projects")
          .select("id, name, owner_id, deleted_at")
          .eq("id", project_id)
          .is("deleted_at", null)
          .single();

        if (projErr || !project) {
          return new Response(JSON.stringify({ error: "Proyecto no encontrado o inactivo." }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (project.owner_id !== user.id) {
          return new Response(JSON.stringify({ error: "Solo el propietario puede invitar miembros." }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 2. Prevent inviting yourself
        if (user.email && user.email.toLowerCase() === normalizedEmail) {
          return new Response(JSON.stringify({ error: "No puedes invitarte a ti mismo." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 3. Verify target email belongs to an existing registered user
        const { data: existingProfiles } = await adminClient
          .from("profiles")
          .select("id")
          .limit(10); // Profiles table exists; let's check auth or members

        // Check if user is already a member
        const { data: existingMembers } = await adminClient
          .from("project_members")
          .select("user_id, profiles(display_name)")
          .eq("project_id", project_id);

        // Check active pending invitation for this project and email
        const { data: existingInv } = await adminClient
          .from("project_invitations")
          .select("id, status")
          .eq("project_id", project_id)
          .eq("email", normalizedEmail)
          .eq("status", "pending")
          .maybeSingle();

        if (existingInv) {
          return new Response(JSON.stringify({ error: "Ya existe una invitación pendiente para este correo." }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Create invitation
        const { data: newInv, error: insertErr } = await adminClient
          .from("project_invitations")
          .insert({
            project_id,
            email: normalizedEmail,
            invited_by: user.id,
            status: "pending",
          })
          .select()
          .single();

        if (insertErr) {
          return new Response(JSON.stringify({ error: insertErr.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Log activity
        await adminClient.from("activity_log").insert({
          project_id,
          actor_id: user.id,
          action: "invitation_created",
          details: { email: normalizedEmail },
        });

        return new Response(JSON.stringify({ success: true, invitation: newInv }), {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "list_received": {
        const callerEmail = user.email?.toLowerCase();
        if (!callerEmail) {
          return new Response(JSON.stringify({ error: "Usuario sin correo verificado." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: invitations, error: invErr } = await userClient
          .from("project_invitations")
          .select(`
            id,
            project_id,
            email,
            status,
            expires_at,
            created_at,
            projects (id, name, description)
          `)
          .eq("email", callerEmail)
          .eq("status", "pending")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false });

        if (invErr) {
          return new Response(JSON.stringify({ error: invErr.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ invitations }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "list_project": {
        if (!project_id) {
          return new Response(JSON.stringify({ error: "project_id es obligatorio." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: invitations, error: listErr } = await userClient
          .from("project_invitations")
          .select("id, project_id, email, status, expires_at, created_at")
          .eq("project_id", project_id)
          .order("created_at", { ascending: false });

        if (listErr) {
          return new Response(JSON.stringify({ error: listErr.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ invitations }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "accept": {
        if (!invitation_id) {
          return new Response(JSON.stringify({ error: "invitation_id es obligatorio." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Execute transactional RPC in PostgreSQL
        const { data: result, error: rpcErr } = await userClient.rpc("accept_project_invitation", {
          p_invitation_id: invitation_id,
        });

        if (rpcErr) {
          return new Response(JSON.stringify({ error: rpcErr.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reject": {
        if (!invitation_id) {
          return new Response(JSON.stringify({ error: "invitation_id es obligatorio." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const callerEmail = user.email?.toLowerCase();
        const { data: inv } = await adminClient
          .from("project_invitations")
          .select("id, email, status, project_id")
          .eq("id", invitation_id)
          .single();

        if (!inv || inv.email.toLowerCase() !== callerEmail) {
          return new Response(JSON.stringify({ error: "No autorizado para rechazar esta invitación." }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: rejectErr } = await adminClient
          .from("project_invitations")
          .update({ status: "rejected", updated_at: new Date().toISOString() })
          .eq("id", invitation_id);

        if (rejectErr) {
          return new Response(JSON.stringify({ error: rejectErr.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true, message: "Invitación rechazada." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "revoke": {
        if (!invitation_id) {
          return new Response(JSON.stringify({ error: "invitation_id es obligatorio." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: inv } = await adminClient
          .from("project_invitations")
          .select("id, project_id, projects(owner_id)")
          .eq("id", invitation_id)
          .single();

        const ownerId = (inv?.projects as any)?.owner_id;
        if (!inv || ownerId !== user.id) {
          return new Response(JSON.stringify({ error: "Solo el propietario puede revocar invitaciones." }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: revokeErr } = await adminClient
          .from("project_invitations")
          .update({ status: "revoked", updated_at: new Date().toISOString() })
          .eq("id", invitation_id);

        if (revokeErr) {
          return new Response(JSON.stringify({ error: revokeErr.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true, message: "Invitación revocada." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Acción no reconocida." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Error interno del servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
