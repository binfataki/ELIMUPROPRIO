(() => {
  const $ = selector => document.querySelector(selector);
  const REFRESH_MS = 60 * 1000;
  const state = { fin: 12, ops: 10, data: null, financial: [], operations: [], refreshTimer: null };
  const cacheKey = () => "elimu-owner-dashboard:" + String(window.ELIMU_APPS_SCRIPT_URL || "default").replace(/[^a-z0-9]/gi, "_");
  const saveCache = data => { try { localStorage.setItem(cacheKey(), JSON.stringify({ savedAt: new Date().toISOString(), data })); } catch (_) {} };
  const readCache = () => { try { const value = JSON.parse(localStorage.getItem(cacheKey()) || "null"); return value && value.data ? value : null; } catch (_) { return null; } };
  const money = (value, currency) => Number(value || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + (currency || "USD");
  const esc = value => String(value == null ? "" : value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#039;" }[c]));
  const isoDate = value => { const raw = String(value || "").slice(0, 10); if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw; const m = raw.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{4})$/); return m ? m[3] + "-" + m[2] + "-" + m[1] : ""; };
  const localDateKey = value => [value.getFullYear(), String(value.getMonth() + 1).padStart(2, "0"), String(value.getDate()).padStart(2, "0")].join("-");
  const dateLabel = value => value ? new Date(value + "T12:00:00").toLocaleDateString("fr-FR") : "Date inconnue";
  const today = () => {
    // La période « Aujourd’hui » doit suivre la date de l’établissement,
    // pas le fuseau parfois différent du navigateur utilisé pour consulter le portail.
    const published = String(state.data?.snapshot?.generatedAt || "");
    const match = published.match(/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{4})\b/);
    const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
    if (match && months[match[1]] !== undefined) return new Date(Number(match[3]), months[match[1]], Number(match[2]));
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lubumbashi", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const values = Object.fromEntries(parts.filter(p => p.type !== "literal").map(p => [p.type, p.value]));
    return new Date(Number(values.year), Number(values.month) - 1, Number(values.day));
  };
  function selectedPeriod() {
    const now = today(), preset = $("#period").value; let start = new Date(now), end = new Date(now);
    if (preset === "yesterday") { start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); }
    if (preset === "week") { const day = (now.getDay() + 6) % 7; start.setDate(start.getDate() - day); }
    if (preset === "14d") start.setDate(start.getDate() - 13);
    if (preset === "month") start = new Date(now.getFullYear(), now.getMonth(), 1);
    if (preset === "all") return { start: "", end: "", label: "Toute la période publiée" };
    if (preset === "custom") return { start: $("#period-start").value, end: $("#period-end").value, label: "Période personnalisée" };
    return { start: localDateKey(start), end: localDateKey(end), label: start.toLocaleDateString("fr-FR") + " → " + end.toLocaleDateString("fr-FR") };
  }
  const inPeriod = (date, period) => { const d = isoDate(date); if (!d) return false; return (!period.start || d >= period.start) && (!period.end || d <= period.end); };
  async function load() {
    $("#sync-status").textContent = "Lecture…";
    const url = window.ELIMU_APPS_SCRIPT_URL + "?" + new URLSearchParams({ action: "ownerDashboard", _: Date.now() });
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 20000); let response, data;
    try { response = await fetch(url, { cache: "no-store", signal: ctl.signal }); data = await response.json(); }
    catch (e) { throw new Error(e.name === "AbortError" ? "Le service n'a pas répondu." : "Publication illisible ou connexion impossible."); }
    finally { clearTimeout(timer); }
    if (!response.ok || !data.ok) throw new Error(data.message || data.error || "Publication indisponible");
    state.data = data; saveCache(data); render(data); $("#cache-note").classList.add("hidden"); $("#sync-status").textContent = "À jour"; startAutoRefresh();
  }
  function startAutoRefresh() { if (state.refreshTimer) clearInterval(state.refreshTimer); state.refreshTimer = setInterval(() => { if (!document.hidden && navigator.onLine) load().catch(() => { $("#sync-status").textContent = "Actualisation en attente"; }); }, REFRESH_MS); }
  function render(data) {
    $("#login").classList.add("hidden"); $("#empty").classList.add("hidden"); $("#dashboard").classList.remove("hidden");
    const school = data.etablissement || {};
    $("#school-name").textContent = school.school_name || "ELIMU";
    $("#dashboard-title").textContent = school.school_name || "Votre établissement";
    $("#snapshot-meta").textContent = "Année " + (school.school_year || "—") + " · dernière publication " + (data.snapshot?.generatedAt || "—");
    const details = data.details || {}, currency = data.synthese?.devise || "USD";
    state.financial = [];
    (details.paiements || []).forEach(r => state.financial.push({ id: r.id, direction: "in", type: "Paiement scolaire", person: r.eleveNom, label: r.type || "Scolarité", amount: r.montant, currency: r.devise || currency, date: r.date, actor: r.enregistrePar }));
    (details.recettes || []).forEach(r => state.financial.push({ id: r.id, direction: "in", type: "Recette", person: r.libelle, label: r.libelle, amount: r.montant, currency: r.devise || currency, date: r.date, actor: r.enregistrePar }));
    (details.depenses || []).forEach(r => state.financial.push({ id: r.id, direction: "out", type: "Dépense", person: r.libelle, label: r.libelle, amount: r.montant, currency: r.devise || currency, date: r.date, actor: r.enregistrePar }));
    (details.salaires || []).forEach(r => state.financial.push({ id: r.id, direction: "out", type: "Salaire / prime", person: r.professeurNom, label: r.periode || "Versement", amount: r.montantPaye, currency, date: r.date, actor: r.enregistrePar }));
    state.operations = [...(details.operations || [])];
    const hasOperation = row => state.operations.some(o => String(o.entityId || o.entity_id || o.id || "") === String(row.id || ""));
    const addMissing = (rows, type, subject, amount) => (rows || []).forEach(r => { if (!hasOperation(r)) state.operations.push({ id: r.id, type, libelle: type === "PAIEMENT" ? "Paiement scolaire" : type === "RECETTE" ? "Recette" : type === "DEPENSE" ? "Dépense" : "Versement de salaire", date: r.date, montant: r[amount], devise: r.devise || currency, objet: subject(r), motif: r.type || r.periode || "", enregistrePar: r.enregistrePar || "Système ELIMU", entityId: r.id }); });
    addMissing(details.paiements, "PAIEMENT", r => (r.eleveNom || r.eleveId || "Élève") + (r.classe ? " · " + r.classe : ""), "montant");
    addMissing(details.recettes, "RECETTE", r => r.libelle || "Recette", "montant");
    addMissing(details.depenses, "DEPENSE", r => r.libelle || "Dépense", "montant");
    addMissing(details.salaires, "SALAIRE", r => r.professeurNom || r.professeurId || "Enseignant", "montantPaye");
    const uniqueOperations = new Map();
    state.operations.forEach(o => {
      const key = String(o.entityType || "") + "|" + String(o.entityId || o.entity_id || o.id || "") + "|" + String(o.type || o.libelle || "");
      if (!key.endsWith("||") && uniqueOperations.has(key)) {
        const previous = uniqueOperations.get(key);
        const previousLooksLikeId = String(previous.objet || "") === String(previous.entityId || previous.entity_id || "");
        const currentLooksMoreDescriptive = String(o.objet || "").trim() && !/^([A-Z]+-)?\d+$/.test(String(o.objet || "").trim());
        if (previousLooksLikeId && currentLooksMoreDescriptive) uniqueOperations.set(key, o);
      } else uniqueOperations.set(key, o);
    });
    state.operations = [...uniqueOperations.values()];
    // Secours : certaines publications historiques exposent les dépenses dans
    // le journal des opérations sans remplir le bloc details.depenses.
    state.operations.forEach(o => {
      const kind = String(o.type || o.libelle || "").toUpperCase();
      const isOut = /DEPENSE|DÉPENSE|SALAIRE|PRIME|SORTIE/.test(kind);
      if (!isOut || !Number(o.montant || 0)) return;
      const operationId = String(o.entityId || o.entity_id || o.id || "");
      const alreadyListed = state.financial.some(r => (operationId && String(r.id || "") === operationId) || (isoDate(r.date) === isoDate(o.date) && Number(r.amount || 0) === Number(o.montant || 0) && String(r.type || "") === String(o.libelle || "")));
      if (!alreadyListed) state.financial.push({ id: operationId, direction: "out", type: o.libelle || "Dépense", person: o.objet || "Établissement", label: o.motif || o.libelle, amount: o.montant, currency: o.devise || currency, date: o.date, actor: o.enregistrePar });
    });
    renderPeriod();
  }
  function renderPeriod() {
    const period = selectedPeriod(), rows = state.financial.filter(r => inPeriod(r.date, period)), s = state.data?.synthese || {}, currency = s.devise || "USD";
    const entries = rows.filter(r => r.direction === "in").reduce((n, r) => n + Number(r.amount || 0), 0);
    const exits = rows.filter(r => r.direction === "out").reduce((n, r) => n + Number(r.amount || 0), 0);
    $("#period-label").textContent = period.label;
    $("#summary").innerHTML = [["Élèves actifs", s.eleves || 0, "indigo"], ["Classes", s.classes || 0, "blue"], ["Enseignants", s.enseignants || 0, "gold"], ["Mouvements", rows.length, "rose"]].map(item => `<article class="metric ${item[2]}"><span>${item[0]}</span><strong>${esc(item[1])}</strong></article>`).join("");
    $("#finance-summary").innerHTML = `<div class="flow-card income"><span>Entrées</span><strong>+${esc(money(entries, currency))}</strong></div><div class="flow-card expense"><span>Sorties</span><strong>−${esc(money(exits, currency))}</strong></div><div class="flow-card balance"><span>Solde de la période</span><strong>${esc(money(entries - exits, currency))}</strong></div>`;
    renderFinance(rows); renderOperations(period);
  }
  function renderFinance(rows) {
    const ordered = [...rows].sort((a, b) => isoDate(b.date).localeCompare(isoDate(a.date)));
    $("#finance-count").textContent = rows.length + " mouvement" + (rows.length > 1 ? "s" : "");
    $("#finance-rows").innerHTML = ordered.length ? ordered.slice(0, state.fin).map(r => `<article class="operation finance-row ${r.direction}"><span class="flow-sign">${r.direction === "in" ? "+" : "−"}</span><div><b>${esc(r.type)}</b><p>${esc(r.person || r.label || "Établissement")}</p><small>${esc(dateLabel(isoDate(r.date)))}</small></div><strong class="amount">${esc(money(r.amount, r.currency))}</strong></article>`).join("") : `<p class="muted">Aucun mouvement financier pour cette période.</p>`;
    moreBtn("#finance-rows", ordered.length, state.fin, "fin");
  }
  function renderOperations(period) {
    const rows = state.operations.filter(o => inPeriod(o.date, period)).sort((a, b) => isoDate(b.date).localeCompare(isoDate(a.date)));
    $("#operation-count").textContent = rows.length + " opération" + (rows.length > 1 ? "s" : "");
    $("#operations").innerHTML = rows.length ? rows.slice(0, state.ops).map(o => `<article class="operation"><span class="operation-dot"></span><div><b>${esc(o.libelle || "Opération")}</b><p>${esc(o.objet || "Établissement")}</p><small>${esc(dateLabel(isoDate(o.date)))}</small></div><strong class="amount">${o.montant ? esc(money(o.montant, o.devise)) : "—"}</strong></article>`).join("") : `<p class="muted">Aucune activité pour cette période.</p>`;
    moreBtn("#operations", rows.length, state.ops, "ops");
  }
  function moreBtn(sel, total, shown, key) {
    if (total <= shown) return;
    const left = total - shown;
    $(sel).insertAdjacentHTML("beforeend", `<button type="button" class="quiet more" data-more="${key}">Afficher plus (${left} restant${left > 1 ? "s" : ""})</button>`);
  }
  document.addEventListener("click", e => { const b = e.target.closest("[data-more]"); if (!b) return; state[b.dataset.more] += 10; renderPeriod(); });
  ["#period-start", "#period-end"].forEach(s => $(s).addEventListener("change", renderPeriod));
  document.addEventListener("visibilitychange", () => { if (!document.hidden && navigator.onLine && state.data) load().catch(() => {}); });
  function failure() {
    const cached = readCache();
    if (cached) {
      render(cached.data); startAutoRefresh();
      $("#cache-note").textContent = "Copie locale affichée · dernière synchronisation réussie le " + new Date(cached.savedAt).toLocaleString("fr-FR") + ".";
      $("#cache-note").classList.remove("hidden"); $("#sync-status").textContent = "Copie locale"; return;
    }
    $("#login").classList.add("hidden"); $("#empty").classList.remove("hidden");
    $("#empty-message").textContent = "Publication momentanément indisponible. Vérifiez votre connexion puis réessayez.";
    $("#sync-status").textContent = "Hors ligne";
  }
  const boot = () => load().catch(failure);
  $("#retry").addEventListener("click", () => { $("#empty").classList.add("hidden"); $("#login").classList.remove("hidden"); boot(); });
  $("#period").addEventListener("change", () => { state.fin = 12; state.ops = 10; $("#custom-period").classList.toggle("hidden", $("#period").value !== "custom"); if ($("#period").value !== "custom") renderPeriod(); });
  $("#apply-period").addEventListener("click", () => {
    $("#sync-status").textContent = "Actualisation…";
    load().catch(() => { $("#sync-status").textContent = "Actualisation impossible"; });
  });
  boot();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
})();
