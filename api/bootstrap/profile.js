import { createClient } from "@supabase/supabase-js";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

function displayNameFor(user, body) {
  return body.displayName
    || user.user_metadata?.full_name
    || user.user_metadata?.name
    || user.email?.split("@")[0]
    || "Admin";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const token = getBearerToken(req);
    if (!token) return json(res, 401, { error: "Unauthorized" });

    const body = await readJson(req);
    const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return json(res, 401, { error: "Unauthorized" });

    const user = userData.user;
    const { data: existingProfile, error: existingError } = await supabase
      .from("profiles")
      .select("id, org_id, display_name, is_admin")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) return json(res, 400, { error: "Could not read profile", detail: existingError.message });
    if (existingProfile) return json(res, 200, { profile: existingProfile, created: false });

    const { data: orgs, error: orgsError } = await supabase
      .from("organizations")
      .select("id, name")
      .order("created_at", { ascending: true })
      .limit(1);

    if (orgsError) return json(res, 400, { error: "Could not read organizations", detail: orgsError.message });

    let org = orgs?.[0] || null;
    if (org && process.env.BOOTSTRAP_ALLOW_JOIN_EXISTING !== "true") {
      return json(res, 403, { error: "Organization already exists. Ask an admin to add this user." });
    }

    if (!org) {
      const { data: createdOrg, error: createOrgError } = await supabase
        .from("organizations")
        .insert({ name: body.orgName || "万誉" })
        .select("id, name")
        .single();

      if (createOrgError) return json(res, 400, { error: "Could not create organization", detail: createOrgError.message });
      org = createdOrg;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .insert({
        org_id: org.id,
        user_id: user.id,
        display_name: displayNameFor(user, body),
        department: body.department || "管理层",
        role_name: body.roleName || "后台管理员",
        is_admin: true,
      })
      .select("id, org_id, display_name, department, role_name, is_admin")
      .single();

    if (profileError) return json(res, 400, { error: "Could not create profile", detail: profileError.message });
    return json(res, 201, { organization: org, profile, created: true });
  } catch (error) {
    return json(res, 500, { error: "Could not bootstrap profile", detail: error.message });
  }
}
