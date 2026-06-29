const titleMap = {
  pipeline: "Development Pipeline",
  style: "Style Workspace",
  review: "Sample Review",
  handoff: "Bulk Handoff Preview",
  inbox: "Communication Inbox",
};

const navButtons = document.querySelectorAll("[data-view]");
const views = document.querySelectorAll(".view");
const title = document.querySelector("#view-title");

function showView(viewId) {
  if (!titleMap[viewId]) return;

  views.forEach((view) => {
    view.classList.toggle("active", view.id === viewId);
  });

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === viewId);
  });

  title.textContent = titleMap[viewId];
  window.scrollTo({ top: 0, behavior: "smooth" });
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showView(button.dataset.view);
  });
});

const drawer = document.querySelector("#issue-drawer");
const closeDrawer = document.querySelector("#close-drawer");
const drawerTitle = document.querySelector("#drawer-title");
const drawerOwner = document.querySelector("#drawer-owner");
const drawerSeverity = document.querySelector("#drawer-severity");
const drawerStatus = document.querySelector("#drawer-status");
const drawerSource = document.querySelector("#drawer-source");
const drawerDeadline = document.querySelector("#drawer-deadline");

document.querySelectorAll(".issue-row").forEach((row) => {
  row.addEventListener("click", () => {
    const [name, owner, severity, status, source, deadline] =
      row.dataset.issue.split("|");

    drawerTitle.textContent = name;
    drawerOwner.textContent = owner;
    drawerSeverity.textContent = severity;
    drawerStatus.textContent = status;
    drawerSource.textContent = source;
    drawerDeadline.textContent = deadline;

    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
  });
});

closeDrawer.addEventListener("click", () => {
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  }
});
