const KEY = "bloc-note:v1";
const $ = (id) => document.getElementById(id);
let notes = [];
try {
  notes = JSON.parse(localStorage.getItem(KEY)) || [];
} catch {
  notes = [];
}
let query = "",
  activeTag = null,
  editingId = null,
  deletingId = null;

const save = () => localStorage.setItem(KEY, JSON.stringify(notes));
const esc = (s) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const fmt = (t) =>
  new Date(t).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function render() {
  const q = query.trim().toLowerCase();
  const list = notes
    .filter((n) => !activeTag || n.tags.includes(activeTag))
    .filter(
      (n) =>
        !q ||
        (n.title + " " + n.body + " " + n.tags.join(" "))
          .toLowerCase()
          .includes(q),
    )
    .sort((a, b) => b.updated - a.updated);

  $("count").textContent =
    notes.length === 1 ? "1 note" : notes.length + " notes";

  const tags = [...new Set(notes.flatMap((n) => n.tags))].sort();
  if (activeTag && !tags.includes(activeTag)) activeTag = null;
  $("tags").innerHTML = tags.length
    ? ["All", ...tags]
        .map((t) => {
          const on = (t === "All" && !activeTag) || t === activeTag;
          return `<button data-tag="${esc(t)}" class="px-3 py-1 rounded-full text-xs font-bold transition ${on ? "bg-ink text-white" : "bg-white text-mute border border-gray-200 hover:text-ink"}">${esc(t)}</button>`;
        })
        .join("")
    : "";

  $("grid").innerHTML = list
    .map(
      (n) => `
    <article class="note relative bg-white rounded-2xl border border-gray-100 p-5 cursor-pointer flex flex-col gap-3" data-id="${n.id}" tabindex="0">
      <h2 class="font-extrabold text-lg leading-snug pr-8 break-words">${esc(n.title) || '<span class="text-gray-300">Untitled</span>'}</h2>
      <p class="text-sm text-mute leading-relaxed line-clamp-5 whitespace-pre-line break-words">${esc(n.body)}</p>
      <div class="mt-auto pt-2 flex flex-wrap items-center gap-2">
        ${n.tags.map((t) => `<span class="text-xs font-bold text-mint bg-teal-50 rounded-full px-2 py-0.5">${esc(t)}</span>`).join("")}
        <span class="text-xs text-gray-400 ml-auto">${n.updated > n.created ? "Edited" : "Created"} ${fmt(n.updated)}</span>
      </div>
      <button class="del absolute top-3 right-3 w-8 h-8 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600" data-del="${n.id}" aria-label="Delete note">✕</button>
    </article>`,
    )
    .join("");

  $("empty").classList.toggle("hidden", list.length > 0);
  $("empty-text").textContent = notes.length
    ? "No notes match your search."
    : "No notes yet. Select “New note” to write your first one.";
}

function openEditor(id) {
  editingId = id;
  const n = notes.find((x) => x.id === id);
  $("f-title").value = n ? n.title : "";
  $("f-body").value = n ? n.body : "";
  $("f-tags").value = n ? n.tags.join(", ") : "";
  $("f-date").textContent = n ? "Created " + fmt(n.created) : "";
  $("editor").showModal();
  (n ? $("f-body") : $("f-title")).focus();
}

function saveNote() {
  const title = $("f-title").value.trim(),
    body = $("f-body").value.trim();
  if (!title && !body) return $("editor").close();
  const tags = [
    ...new Set(
      $("f-tags")
        .value.split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  const now = Date.now(),
    n = notes.find((x) => x.id === editingId);
  if (n) Object.assign(n, { title, body, tags, updated: now });
  else
    notes.push({
      id: crypto.randomUUID(),
      title,
      body,
      tags,
      created: now,
      updated: now,
    });
  save();
  render();
  $("editor").close();
}

$("new").onclick = () => openEditor(null);
$("save").onclick = saveNote;
$("cancel").onclick = () => $("editor").close();
$("editor").addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") saveNote();
});
$("search").oninput = (e) => {
  query = e.target.value;
  render();
};
$("tags").onclick = (e) => {
  const t = e.target.closest("[data-tag]")?.dataset.tag;
  if (t) {
    activeTag = t === "All" ? null : t;
    render();
  }
};
$("grid").onclick = (e) => {
  const del = e.target.closest("[data-del]");
  if (del) {
    deletingId = del.dataset.del;
    const n = notes.find((x) => x.id === deletingId);
    $("confirm-title").textContent = n.title || "Untitled";
    return $("confirm").showModal();
  }
  const card = e.target.closest("[data-id]");
  if (card) openEditor(card.dataset.id);
};
$("grid").onkeydown = (e) => {
  if (e.key === "Enter" && e.target.matches("[data-id]"))
    openEditor(e.target.dataset.id);
};
$("no").onclick = () => $("confirm").close();
$("yes").onclick = () => {
  notes = notes.filter((n) => n.id !== deletingId);
  save();
  render();
  $("confirm").close();
};

render();
