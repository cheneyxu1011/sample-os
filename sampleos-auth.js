import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";

(async function () {
  const backend = window.SampleOSBackend;
  if (!backend) return;

  const config = await backend.getRuntimeConfig().catch(() => null);
  if (!config?.supabaseUrl || !config?.supabasePublishableKey) return;

  const supabase = createClient(config.supabaseUrl, config.supabasePublishableKey);
  const topActions = document.querySelector(".top-actions");
  if (!topActions || document.querySelector(".auth-mini")) return;

  const auth = document.createElement("div");
  auth.className = "auth-mini";
  auth.innerHTML = `
    <button class="row-action auth-trigger" type="button">登录</button>
    <form class="auth-form" hidden>
      <input name="email" type="email" autocomplete="email" placeholder="邮箱" required />
      <input name="password" type="password" autocomplete="current-password" placeholder="密码" required />
      <button type="submit">登录</button>
      <button type="button" data-auth-signup>注册</button>
      <small data-auth-status>请先登录后上传照片/视频</small>
    </form>
  `;
  topActions.insertBefore(auth, topActions.firstChild);

  const trigger = auth.querySelector(".auth-trigger");
  const form = auth.querySelector(".auth-form");
  const status = auth.querySelector("[data-auth-status]");
  const signup = auth.querySelector("[data-auth-signup]");

  function setStatus(message) {
    status.textContent = message;
  }

  async function syncSession() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token || "";
    backend.setAccessToken(token);
    if (data.session?.user) {
      trigger.textContent = data.session.user.email || "已登录";
      form.hidden = true;
      setStatus("已登录，可以上传");
      await backend.bootstrapProfile({ orgName: "万誉", displayName: "管理员", department: "管理层", roleName: "后台管理员" }).catch(() => null);
      await backend.seedDemoData().catch(() => null);
    } else {
      trigger.textContent = "登录";
      setStatus("请先登录后上传照片/视频");
    }
  }

  trigger.addEventListener("click", () => {
    form.hidden = !form.hidden;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    setStatus("登录中...");
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (error) setStatus(error.message);
    await syncSession();
  });

  signup.addEventListener("click", async () => {
    const formData = new FormData(form);
    setStatus("注册中...");
    const { error } = await supabase.auth.signUp({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    setStatus(error ? error.message : "注册成功。如需邮件确认，请先确认邮箱。");
    await syncSession();
  });

  supabase.auth.onAuthStateChange(() => {
    syncSession();
  });
  await syncSession();
}());
