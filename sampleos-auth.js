(() => {
  const IDENTITY_KEY = "sampleos.testIdentity";
  const os = window.SampleOS;
  if (!os) return;

  const topActions = document.querySelector(".top-actions");
  if (!topActions || document.querySelector(".identity-switcher")) return;

  function reviewerUsers() {
    const preferred = [
      "业务部",
      "品质管理",
      "品质部",
      "工艺部",
      "工业工程部",
      "打样部",
      "新长江工厂",
      "管理层",
    ];
    return os.data.users
      .filter((user) => user.permissions?.some((permission) => ["提交意见", "创建问题", "最终放行", "例外放行", "申请寄样"].includes(permission)))
      .sort((a, b) => {
        const ai = preferred.indexOf(a.department);
        const bi = preferred.indexOf(b.department);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
  }

  function setIdentity(userId) {
    const user = os.getUser(userId) || os.getUser("user_guyao") || os.data.users[0];
    if (!user) return;
    os.data.currentUserId = user.id;
    window.localStorage.setItem(IDENTITY_KEY, user.id);

    const name = document.querySelector(".user-account strong");
    const role = document.querySelector(".user-account small");
    const avatar = document.querySelector(".user-account .avatar");
    if (name) name.textContent = user.name;
    if (role) role.textContent = user.role || user.department;
    if (avatar) avatar.className = `avatar avatar-${user.avatarColor || "guyao"}`;

    window.SampleOSApp?.renderAll?.();
    window.dispatchEvent(new CustomEvent("sampleos:identity-change", { detail: { user } }));
  }

  const users = reviewerUsers();
  const initialId = window.localStorage.getItem(IDENTITY_KEY) || "user_guyao";
  const switcher = document.createElement("div");
  switcher.className = "auth-mini identity-switcher";
  switcher.innerHTML = `
    <label class="identity-control">
      <span>测试身份</span>
      <select data-identity-switch>
        ${users.map((user) => `<option value="${user.id}">${user.name} · ${user.department}</option>`).join("")}
      </select>
    </label>
    <small>内测模式，无需邮箱密码</small>
  `;
  topActions.insertBefore(switcher, topActions.firstChild);

  const select = switcher.querySelector("[data-identity-switch]");
  select.value = users.some((user) => user.id === initialId) ? initialId : "user_guyao";
  select.addEventListener("change", () => setIdentity(select.value));
  setIdentity(select.value);
})();
