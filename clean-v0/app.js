(function () {
  const data = window.CLEAN_SAMPLE_OS_DATA;
  const style = data.style;
  const storageKey = "sample-os-clean-v0";
  const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
  const state = {
    comments: saved.comments || {},
    issues: saved.issues || [
      {
        id: "issue_001",
        title: "袖口压胶边缘需复核",
        level: "一般",
        status: "未关闭"
      }
    ],
    reviewSubmitted: Boolean(saved.reviewSubmitted)
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function saveState(message) {
    localStorage.setItem(storageKey, JSON.stringify(state));
    $("#save-state").textContent = message || "已保存";
    window.setTimeout(() => {
      $("#save-state").textContent = "";
    }, 1800);
    renderIssues();
    updateBlockingStatus();
  }

  function isBlockingIssue(issue) {
    return issue.status !== "已关闭" && (issue.level === "重大" || issue.level === "严重");
  }

  function updateBlockingStatus() {
    const blocked = state.issues.some(isBlockingIssue);
    const pill = $("#blocking-pill");
    pill.className = `status-pill ${blocked ? "blocked" : "ok"}`;
    pill.textContent = blocked ? "寄样阻止：存在重大 / 严重 Issue" : "可寄样：无阻塞 Issue";
    $("#issue-warning").textContent = blocked
      ? "当前存在阻塞 Issue，寄样被阻止。"
      : "重大 / 严重 Issue 会阻止寄样。";
  }

  function metaItem(label, value) {
    return `<div class="meta"><span>${label}</span><strong>${value}</strong></div>`;
  }

  function styleCard(includeButton) {
    const meta = [
      ["Style ID", style.styleId],
      ["品牌 / 款号", `${style.brand} ${style.styleNo}`],
      ["季节", style.season],
      ["样品阶段", style.sampleStage],
      ["当前状态", state.reviewSubmitted ? "已提交评审" : style.status],
      ["当前 Gate", style.currentGate],
      ["样衣位置", style.location],
      ["预计寄样", style.sampleDate]
    ];
    return `
      <article class="style-card">
        <div>
          <h2>${style.name}</h2>
          <p>${style.brand} / ${style.styleNo} / ${style.styleId}</p>
          <div class="meta-grid">${meta.map(([label, value]) => metaItem(label, value)).join("")}</div>
        </div>
        ${includeButton ? '<button class="primary-button" type="button" id="open-review">打开评审</button>' : ""}
      </article>
    `;
  }

  function renderPipeline() {
    $("#pipeline-list").innerHTML = styleCard(true);
    $("#open-review").addEventListener("click", () => switchView("review"));
  }

  function renderSummary() {
    $("#review-summary").innerHTML = styleCard(false);
  }

  function renderDepartments() {
    $("#department-cards").innerHTML = data.departments
      .map((department) => {
        const value = state.comments[department.id] || "";
        return `
          <article class="department-card">
            <label>
              <strong>${department.name}</strong>
              <span>${department.owner}</span>
              <textarea data-comment="${department.id}" placeholder="输入${department.name}评审意见">${value}</textarea>
            </label>
          </article>
        `;
      })
      .join("");

    $$("[data-comment]").forEach((textarea) => {
      textarea.addEventListener("input", (event) => {
        state.comments[event.target.dataset.comment] = event.target.value;
      });
    });
  }

  function renderIssues() {
    if (state.issues.length === 0) {
      $("#issue-list").innerHTML = "<p>暂无 Issue。</p>";
      return;
    }

    $("#issue-list").innerHTML = state.issues
      .map((issue) => {
        const blocked = isBlockingIssue(issue);
        return `
          <article class="issue-item" data-issue-id="${issue.id}">
            <div>
              <div class="issue-title">${issue.title}</div>
              <span class="badge ${blocked ? "blocked" : ""}">${blocked ? "阻止寄样" : "不阻止寄样"}</span>
            </div>
            <label class="field">
              <span>等级</span>
              <select data-issue-level>
                ${["轻微", "一般", "重大", "严重"]
                  .map((level) => `<option value="${level}" ${issue.level === level ? "selected" : ""}>${level}</option>`)
                  .join("")}
              </select>
            </label>
            <label class="field">
              <span>状态</span>
              <select data-issue-status>
                ${["未关闭", "已关闭"]
                  .map((status) => `<option value="${status}" ${issue.status === status ? "selected" : ""}>${status}</option>`)
                  .join("")}
              </select>
            </label>
          </article>
        `;
      })
      .join("");

    $$("#issue-list select").forEach((select) => {
      select.addEventListener("change", (event) => {
        const item = event.target.closest("[data-issue-id]");
        const issue = state.issues.find((candidate) => candidate.id === item.dataset.issueId);
        if (event.target.matches("[data-issue-level]")) issue.level = event.target.value;
        if (event.target.matches("[data-issue-status]")) issue.status = event.target.value;
        saveState("Issue 已更新");
      });
    });
  }

  function renderSettings() {
    const owners = [
      ["Gate Owner", style.gateOwner],
      ["Preparation Gate Owner", style.preparationGateOwner],
      ["Final Approver", style.finalApprover]
    ];
    $("#owner-list").innerHTML = owners
      .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
      .join("");

    $("#rule-list").innerHTML = data.issueRules
      .map((rule) => `<li><strong>${rule.level}</strong>：${rule.note}</li>`)
      .join("");
  }

  function switchView(viewName) {
    $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
    $$(".view").forEach((view) => view.classList.toggle("active", view.id === `${viewName}-view`));
    $("#view-title").textContent = $(`#${viewName}-view`).dataset.title;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addIssue(title, level) {
    state.issues.unshift({
      id: `issue_${Date.now()}`,
      title,
      level,
      status: "未关闭"
    });
    saveState("Issue 已新增");
  }

  function bindActions() {
    $$(".nav-item").forEach((button) => {
      button.addEventListener("click", () => switchView(button.dataset.view));
    });

    $("#save-draft").addEventListener("click", () => saveState("草稿已保存"));

    $("#submit-review").addEventListener("click", () => {
      state.reviewSubmitted = true;
      saveState("评审已提交");
      renderSummary();
      renderPipeline();
    });

    $("#add-issue").addEventListener("click", () => {
      const count = state.issues.length + 1;
      addIssue(`新增 Issue ${count}`, "重大");
    });

    $("#comment-to-issue").addEventListener("click", () => {
      const firstComment = Object.values(state.comments).find((comment) => comment.trim().length > 0);
      addIssue(firstComment ? firstComment.trim().slice(0, 36) : "由评审意见转入的 Issue", "一般");
    });

    $("#media-upload").addEventListener("change", (event) => {
      const previews = Array.from(event.target.files).map((file) => {
        const url = URL.createObjectURL(file);
        return file.type.startsWith("video/")
          ? `<video src="${url}" controls muted></video>`
          : `<img src="${url}" alt="${file.name}" />`;
      });
      $("#media-preview").innerHTML = previews.join("");
    });
  }

  function init() {
    renderPipeline();
    renderSummary();
    renderDepartments();
    renderIssues();
    renderSettings();
    bindActions();
    updateBlockingStatus();
  }

  init();
})();
