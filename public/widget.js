/*!
 * Vibrium Trip Planner widget. Paste one script tag on any page:
 * <script src="https://<suite-host>/widget.js" data-name="Your Agency" data-color="#2c70f6" async></script>
 * Optional: data-label, data-greeting, data-position="left", data-open="true".
 */
(function () {
  var script = document.currentScript;
  if (!script || window.__vibriumTripPlanner) return;
  window.__vibriumTripPlanner = true;

  var origin = new URL(script.src).origin;
  var data = script.dataset;
  var color = /^#[0-9a-f]{6}$/i.test(data.color || "") ? data.color : "#2c70f6";
  var name = (data.name || "Trip Planner").slice(0, 40);
  var label = (data.label || "Plan my trip").slice(0, 30);
  var side = data.position === "left" ? "left" : "right";

  var query = new URLSearchParams({ name: name, color: color });
  if (data.greeting) query.set("greeting", data.greeting.slice(0, 160));

  var style = document.createElement("style");
  style.textContent =
    ".vtp-launcher{position:fixed;bottom:20px;" + side + ":20px;z-index:2147483000;display:flex;align-items:center;gap:8px;" +
    "border:0;border-radius:999px;padding:12px 18px;background:" + color + ";color:#fff;font:600 15px/1 system-ui,-apple-system,Segoe UI,sans-serif;" +
    "box-shadow:0 10px 30px -8px rgba(0,0,0,.35);cursor:pointer;transition:transform .2s ease}" +
    ".vtp-launcher:hover{transform:translateY(-2px)}.vtp-launcher svg{width:18px;height:18px}" +
    ".vtp-frame{position:fixed;bottom:84px;" + side + ":20px;z-index:2147483000;width:380px;height:min(640px,calc(100vh - 110px));" +
    "border:0;border-radius:18px;box-shadow:0 24px 60px -12px rgba(0,0,0,.35);background:#fff;opacity:0;transform:translateY(12px) scale(.98);" +
    "pointer-events:none;transition:opacity .2s ease,transform .2s ease}" +
    ".vtp-frame.vtp-open{opacity:1;transform:none;pointer-events:auto}" +
    "@media (max-width:480px){.vtp-frame{inset:0;width:100%;height:100%;border-radius:0;bottom:0}.vtp-frame.vtp-open~.vtp-launcher{bottom:auto;top:12px}}";
  document.head.appendChild(style);

  var frame = document.createElement("iframe");
  frame.className = "vtp-frame";
  frame.title = name + " trip planner";
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("loading", "lazy");

  var button = document.createElement("button");
  button.type = "button";
  button.className = "vtp-launcher";
  button.setAttribute("aria-expanded", "false");
  var chatIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.6A8 8 0 1 1 21 12z"/></svg>';
  var closeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  function render(open) {
    button.innerHTML = (open ? closeIcon : chatIcon) + "<span>" + (open ? "Close" : label.replace(/[<>&]/g, "")) + "</span>";
    button.setAttribute("aria-expanded", String(open));
  }

  function setOpen(open) {
    if (open && !frame.src) frame.src = origin + "/embed/trip-planner?" + query.toString();
    frame.classList.toggle("vtp-open", open);
    frame.setAttribute("aria-hidden", String(!open));
    render(open);
  }

  button.addEventListener("click", function () {
    setOpen(!frame.classList.contains("vtp-open"));
  });

  window.addEventListener("message", function (event) {
    if (event.origin !== origin || !event.data || event.data.type !== "vibrium:trip-lead") return;
    script.dispatchEvent(new CustomEvent("trip-lead", { detail: { lead: event.data.lead } }));
  });

  render(false);
  document.body.appendChild(frame);
  document.body.appendChild(button);
  if (data.open === "true") setOpen(true);
})();
