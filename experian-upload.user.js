// ==UserScript==
// @name         Experian Client Data Parser & Autofill
// @namespace    CRC Tools
// @version      3.1
// @description  Paste, parse, review, and fill Experian forms with validation and accessible notifications.
// @match        https://*.experian.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    // Keep the tool isolated from Experian's styles and never persist client data.
    if (document.getElementById("crc-experian-root")) return;

    const FIELD_IDS = Object.freeze({
        firstName: "firstName",
        middleName: "middleName",
        lastName: "lastName",
        generation: "genCode",
        address: "address",
        city: "city",
        state: "state",
        zip: "zip",
        ssn1: "ssn1",
        ssn2: "ssn2",
        ssn3: "ssn3",
        email: "emailAddress",
        emailConfirm: "emailAddressConfirm",
        reportNumber: "alertReportId",
        terms: "frmAcceptTC1"
    });

    const LABELS = Object.freeze({
        firstName: "First name",
        middleName: "Middle initial / name",
        lastName: "Last name",
        generation: "Suffix / generation",
        address: "Street address",
        city: "City",
        state: "State",
        zip: "ZIP code",
        dob: "Date of birth",
        ssn: "SSN / ITIN",
        email: "Email address",
        reportNumber: "Report number"
    });

    const FIELD_GROUPS = [
        { title: "Personal details", fields: ["firstName", "middleName", "lastName", "generation"] },
        { title: "Current address", fields: ["address", "city", "state", "zip"] },
        { title: "Additional information", fields: ["dob", "ssn", "email", "reportNumber"] }
    ];
    const REQUIRED_FIELDS = new Set(["firstName", "lastName"]);
    const ALIASES = {
        firstName: ["firstname", "first", "fname", "givenname", "given"],
        middleName: ["middle", "middleinitial", "middlename", "mi"],
        lastName: ["lastname", "last", "lname", "surname", "familyname"],
        generation: ["generation", "suffix", "gensuffix"],
        address: ["address", "street", "streetaddress", "mailingaddress", "addressline1"],
        city: ["city"],
        state: ["state", "st"],
        zip: ["zip", "zipcode", "postalcode", "postal"],
        dob: ["dob", "dateofbirth", "birthdate", "birthday"],
        ssn: ["ssn", "socialsecurity", "socialsecuritynumber", "itin", "taxid"],
        email: ["email", "emailaddress", "aliasemail", "emailaddr"],
        reportNumber: ["reportnumber", "reportno", "reportid", "report"],
        fullName: ["name", "fullname", "clientname"]
    };
    const VALID_STATES = new Set(("AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC PR GU VI AS MP").split(" "));
    const SUFFIXES = new Set(["JR", "SR", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"]);
    let lastFocused = null;
    let wasPageOverflow = "";
    let reviewReady = false;
    let currentToastTimer = null;

    const CSS = `
:host {
    --blue: #3559e8;
    --blue-dark: #2343ca;
    --ink: #172438;
    --body: #42536b;
    --muted: #708098;
    --line: #e2e8f1;
    --soft: #f5f7fb;
    --success: #0e7657;
    --warning: #975c09;
    --danger: #bc354c;
    font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Arial, sans-serif;
    color: var(--ink);
    color-scheme: light;
}
*, *::before, *::after { box-sizing: border-box; }
button, input, textarea { font: inherit; }
button { cursor: pointer; }
button:disabled { cursor: not-allowed; opacity: .55; }
[hidden] { display: none !important; }
button:focus-visible, input:focus-visible, textarea:focus-visible {
    outline: 3px solid rgba(53, 89, 232, .25);
    outline-offset: 2px;
}
#launcher {
    position: fixed; bottom: 23px; right: 23px; z-index: 2147483645;
    display: flex; align-items: center; gap: 10px;
    padding: 10px 15px 10px 10px;
    border: 1px solid rgba(255,255,255,.25); border-radius: 999px;
    background: #172438; color: #fff; box-shadow: 0 10px 28px rgba(17, 29, 52, .22);
    font-size: 13px; font-weight: 700; letter-spacing: .01em;
    transition: transform .16s ease, box-shadow .16s ease;
}
#launcher:hover { transform: translateY(-2px); box-shadow: 0 14px 32px rgba(17,29,52,.26); }
.launch-mark { display: grid; place-items: center; width: 29px; height: 29px; border-radius: 50%; background: #5272ff; font-size: 12px; }
#overlay {
    position: fixed; inset: 0; z-index: 2147483646;
    display: grid; place-items: center; padding: 24px;
    background: rgba(16, 27, 49, .64);
    backdrop-filter: blur(5px);
}
#dialog {
    display: flex; flex-direction: column;
    width: min(1040px, 100%); max-height: min(790px, calc(100dvh - 48px));
    overflow: hidden; border: 1px solid rgba(255,255,255,.75);
    border-radius: 20px; background: #fff; box-shadow: 0 32px 85px rgba(2, 12, 32, .33);
}
#header { display: flex; align-items: flex-start; gap: 16px; padding: 22px 26px 17px; }
.title-wrap { flex: 1; min-width: 0; }
.eyebrow { display: block; margin-bottom: 4px; color: var(--blue); font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
#title { margin: 0; font-size: 23px; font-weight: 790; line-height: 1.25; letter-spacing: -.035em; }
.subtitle { margin: 7px 0 0; color: var(--muted); font-size: 12px; }
.icon-button { display: grid; place-items: center; width: 34px; height: 34px; flex: 0 0 auto; border: 1px solid var(--line); border-radius: 10px; background: #fff; color: var(--body); font-size: 21px; line-height: 1; }
.icon-button:hover { background: var(--soft); }
.steps { display: flex; align-items: center; gap: 9px; padding: 0 26px 18px; border-bottom: 1px solid var(--line); }
.step { display: inline-flex; align-items: center; gap: 7px; color: var(--muted); font-size: 11px; font-weight: 700; white-space: nowrap; }
.step-number { display: grid; place-items: center; width: 23px; height: 23px; flex: 0 0 auto; border-radius: 50%; background: #edf1f7; color: #6a7990; font-size: 11px; }
.step.active { color: var(--blue); }
.step.active .step-number { color: #fff; background: var(--blue); }
.step.done .step-number { color: #0e7657; background: #d7f6eb; }
.step-divider { height: 1px; width: 18px; background: var(--line); }
#workspace { display: grid; grid-template-columns: minmax(270px,.85fr) minmax(350px,1.15fr); min-height: 0; overflow: auto; }
.paste-pane { padding: 24px; border-right: 1px solid var(--line); background: linear-gradient(180deg, #fafbff 0%, #fff 50%); }
.review-pane { padding: 24px; min-width: 0; }
.pane-title { margin: 0 0 4px; font-size: 15px; font-weight: 760; }
.pane-desc { margin: 0 0 16px; color: var(--muted); font-size: 12px; }
#raw { display: block; width: 100%; min-height: 255px; padding: 13px; resize: vertical; border: 1px solid #cfd8e7; border-radius: 11px; background: #fff; color: var(--ink); font: 12px/1.65 ui-monospace, SFMono-Regular, Consolas, monospace; }
#raw::placeholder { color: #95a1b4; }
.under-input { display: flex; justify-content: space-between; gap: 8px; margin-top: 9px; color: var(--muted); font-size: 10px; }
.action { min-height: 39px; padding: 0 16px; border-radius: 10px; border: 1px solid var(--line); background: #fff; color: var(--ink); font-size: 12px; font-weight: 760; transition: background .15s ease, transform .15s ease; }
.action:hover { background: #f5f7fc; }
.action.primary { background: var(--blue); border-color: var(--blue); color: #fff; box-shadow: 0 4px 12px rgba(53, 89, 232, .15); }
.action.primary:hover { background: var(--blue-dark); }
.action.secondary { border-color: #ccd6ec; color: var(--blue); }
.action.ghost { background: transparent; color: var(--muted); border-color: transparent; }
.action.ghost:hover { background: #edf1f7; color: var(--ink); }
#parse { width: 100%; margin-top: 16px; }
#empty-state { display: grid; justify-items: center; text-align: center; padding: 55px 16px; border: 1px dashed #ccd6e7; border-radius: 14px; background: #fafbff; }
.empty-art { display: grid; place-items: center; width: 55px; height: 55px; border: 1px solid #dfE6ff; border-radius: 17px; background: #edf1ff; color: var(--blue); font-size: 23px; margin-bottom: 14px; }
#empty-state h3 { margin: 0 0 5px; font-size: 14px; }
#empty-state p { margin: 0; max-width: 260px; color: var(--muted); font-size: 12px; }
#review-message { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; margin-bottom: 16px; border: 1px solid #d9e9ff; background: #f0f6ff; border-radius: 10px; color: #365d91; font-size: 11px; }
#review-message.warning { color: #87530b; border-color: #f4dfb4; background: #fffaed; }
#review-message.error { color: #a3243e; border-color: #f3c8d1; background: #fff3f5; }
.message-icon { font-weight: 850; font-size: 14px; }
.field-group { margin-bottom: 17px; }
.field-group:last-child { margin-bottom: 0; }
.group-title { margin: 0 0 10px; color: #586b86; font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.field-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 11px; }
.field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.field.wide { grid-column: span 2; }
.field label { color: #485a74; font-size: 11px; font-weight: 700; }
.required { color: var(--danger); }
.field-control { position: relative; }
.field input { width: 100%; min-height: 37px; padding: 8px 11px; border: 1px solid #d3dbe9; border-radius: 9px; background: #fff; color: var(--ink); font-size: 12px; outline: none; transition: border-color .15s ease, box-shadow .15s ease; }
.field input.is-populated { border-color: #57b88a; background: #ebf9f1; color: #155c3c; box-shadow: inset 3px 0 0 #34a46e; }
.field input.is-empty { border-color: #d5dbe4; background: #f1f3f6; color: #667085; }
.field input:hover { border-color: #a4b3cd; }
.field input:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(53,89,232,.10); }
.field input[aria-invalid="true"] { border-color: var(--danger); background: #fff9fa; box-shadow: inset 3px 0 0 var(--danger); }
.field .field-error { color: var(--danger); font-size: 10px; line-height: 1.3; }
.field .hint { color: var(--muted); font-size: 10px; }
#footer { display: flex; align-items: center; gap: 10px; padding: 15px 24px; border-top: 1px solid var(--line); background: #fff; }
#form-state { flex: 1; min-width: 0; color: var(--muted); font-size: 11px; }
#form-state strong { display: block; color: var(--body); font-size: 12px; }
.footer-actions { display: flex; gap: 8px; align-items: center; }
#notifications { position: fixed; top: 20px; right: 20px; z-index: 2147483647; width: min(360px,calc(100vw - 40px)); pointer-events: none; }
.toast { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 10px; padding: 14px 15px; border-radius: 12px; border: 1px solid #dce5f5; background: #fff; box-shadow: 0 12px 32px rgba(15,28,49,.17); pointer-events: auto; }
.toast.success { border-left: 4px solid #15936e; }
.toast.warning { border-left: 4px solid #dfa22c; }
.toast.error { border-left: 4px solid #d34c64; }
.toast.info { border-left: 4px solid var(--blue); }
.toast-copy { flex: 1; min-width: 0; color: var(--body); font-size: 11px; }
.toast-title { display: block; margin-bottom: 3px; color: var(--ink); font-size: 12px; font-weight: 800; }
.toast-close { border: 0; background: none; color: var(--muted); font-size: 17px; line-height: 1; }
@media (max-width: 760px) {
    #overlay { padding: 10px; }
    #dialog { max-height: calc(100dvh - 20px); border-radius: 15px; }
    #header { padding: 17px 17px 12px; }
    #title { font-size: 20px; }
    .steps { padding: 0 17px 14px; }
    #workspace { grid-template-columns: 1fr; }
    .paste-pane { border-right: 0; border-bottom: 1px solid var(--line); padding: 17px; }
    .review-pane { padding: 17px; }
    #raw { min-height: 145px; }
    #empty-state { padding: 20px; }
    #footer { flex-wrap: wrap; padding: 12px 16px; }
    #form-state { flex-basis: 100%; }
    .footer-actions { width: 100%; }
    .footer-actions .action { flex: 1; }
}
@media (max-width: 420px) {
    #launcher { right: 12px; bottom: 12px; }
    .steps { gap: 5px; }
    .step { font-size: 10px; gap: 4px; }
    .step-divider { width: 8px; }
    .step-number { width: 19px; height: 19px; }
    .field-grid { grid-template-columns: 1fr; }
    .field.wide { grid-column: span 1; }
    .subtitle { font-size: 11px; }
}
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;

    const HTML = `
<button id="launcher" type="button" aria-haspopup="dialog" aria-controls="dialog" aria-label="Open Experian client autofill">
    <span class="launch-mark" aria-hidden="true">EX</span><span>Client Autofill</span>
</button>
<div id="overlay" hidden>
    <section id="dialog" role="dialog" aria-modal="true" aria-labelledby="title" tabindex="-1">
        <header id="header">
            <div class="title-wrap">
                <span class="eyebrow">CRC Tools · Experian</span>
                <h2 id="title">Client Data Autofill</h2>
                <p class="subtitle">Paste client details, verify every field, then fill the Experian form.</p>
            </div>
            <button class="icon-button" id="close" type="button" aria-label="Close panel">×</button>
        </header>
        <nav class="steps" aria-label="Workflow">
            <span class="step active" data-step="1"><span class="step-number">1</span>Paste</span>
            <span class="step-divider" aria-hidden="true"></span>
            <span class="step" data-step="2"><span class="step-number">2</span>Review</span>
            <span class="step-divider" aria-hidden="true"></span>
            <span class="step" data-step="3"><span class="step-number">3</span>Fill</span>
        </nav>
        <main id="workspace">
            <section class="paste-pane" aria-labelledby="paste-heading">
                <h3 class="pane-title" id="paste-heading">Paste client information</h3>
                <p class="pane-desc">Flexible format: names, addresses, labeled fields, and contact details.</p>
                <label for="raw" style="position:absolute;left:-10000px">Raw client information</label>
                <textarea id="raw" spellcheck="false" autocomplete="off" placeholder="Example:
Jane A Doe
123 Sample Street Apt 4
Seattle WA 98101
DOB: 01/02/1990
SSN: 000-00-0000
Email: jane@example.com"></textarea>
                <div class="under-input"><span>Ctrl + Enter to parse</span><span id="char-count">0 characters</span></div>
                <button class="action primary" id="parse" type="button">Parse client data</button>
            </section>
            <section class="review-pane" aria-labelledby="review-heading">
                <h3 class="pane-title" id="review-heading">Review and edit</h3>
                <p class="pane-desc">Confirm the information before anything is entered on Experian.</p>
                <div id="empty-state">
                    <div class="empty-art" aria-hidden="true">≡</div>
                    <h3>No data parsed yet</h3>
                    <p>Paste information on the left and choose “Parse client data” to get started.</p>
                </div>
                <div id="review-content" hidden>
                    <div id="review-message" role="status"><span class="message-icon" aria-hidden="true">i</span><span id="review-message-text"></span></div>
                    <div id="review-fields"></div>
                </div>
            </section>
        </main>
        <footer id="footer">
            <div id="form-state" aria-live="polite"><strong>Ready when you are</strong><span>Form submission is always manual.</span></div>
            <div class="footer-actions">
                <button id="clear" class="action ghost" type="button">Clear panel</button>
                <button id="fill" class="action primary" type="button" disabled>Fill Experian form</button>
            </div>
        </footer>
    </section>
</div>
<div id="notifications" aria-live="polite" aria-atomic="true"></div>
`;

    const host = document.createElement("div");
    host.id = "crc-experian-root";
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = CSS;
    shadow.appendChild(style);
    const wrapper = document.createElement("div");
    wrapper.innerHTML = HTML;
    while (wrapper.firstChild) shadow.appendChild(wrapper.firstChild);

    const $ = (id) => shadow.getElementById(id);
    const raw = $("raw");
    const overlay = $("overlay");
    const dialog = $("dialog");
    const reviewContent = $("review-content");
    const emptyState = $("empty-state");
    const reviewMessage = $("review-message");
    const reviewMessageText = $("review-message-text");
    const notifications = $("notifications");
    const inputs = new Map();
    const errors = new Map();

    function buildReviewFields() {
        const parent = $("review-fields");
        FIELD_GROUPS.forEach((group) => {
            const section = document.createElement("section");
            section.className = "field-group";
            const heading = document.createElement("h3");
            heading.className = "group-title";
            heading.textContent = group.title;
            section.appendChild(heading);
            const grid = document.createElement("div");
            grid.className = "field-grid";
            group.fields.forEach((fieldName) => {
                const container = document.createElement("div");
                container.className = "field" + (["address", "email"].includes(fieldName) ? " wide" : "");
                const label = document.createElement("label");
                const id = "crc-" + fieldName;
                label.htmlFor = id;
                label.textContent = LABELS[fieldName] + (REQUIRED_FIELDS.has(fieldName) ? " *" : "");
                const control = document.createElement("div");
                control.className = "field-control";
                const input = document.createElement("input");
                input.id = id;
                input.type = fieldName === "email" ? "email" : "text";
                input.autocomplete = "off";
                input.spellcheck = false;
                input.setAttribute("aria-describedby", id + "-error");
                input.placeholder = ({
                    state: "e.g. WA", zip: "e.g. 98101", dob: "MM/DD/YYYY",
                    generation: "e.g. Jr", ssn: "000-00-0000", email: "name@example.com"
                })[fieldName] || "";
                if (["state", "zip", "ssn", "dob", "email"].includes(fieldName)) {
                    input.inputMode = ["zip", "ssn"].includes(fieldName) ? "numeric" : "text";
                }
                input.addEventListener("input", () => {
                    clearFieldError(fieldName);
                    updateFieldAppearance(input);
                    if (reviewReady) setFormState("Reviewing changes", "Your edited values will be used when filling.");
                });
                updateFieldAppearance(input);
                control.appendChild(input);
                const error = document.createElement("span");
                error.className = "field-error";
                error.id = id + "-error";
                error.hidden = true;
                container.appendChild(label);
                container.appendChild(control);
                container.appendChild(error);
                grid.appendChild(container);
                inputs.set(fieldName, input);
                errors.set(fieldName, error);
            });
            section.appendChild(grid);
            parent.appendChild(section);
        });
    }
    buildReviewFields();

    function setFormState(title, detail) {
        const state = $("form-state");
        state.replaceChildren();
        const strong = document.createElement("strong");
        strong.textContent = title;
        const span = document.createElement("span");
        span.textContent = detail;
        state.append(strong, span);
    }

    function notify(type, title, detail) {
        if (currentToastTimer !== null) {
            clearTimeout(currentToastTimer);
            currentToastTimer = null;
        }
        notifications.replaceChildren();
        const toast = document.createElement("div");
        toast.className = "toast " + type;
        toast.setAttribute("role", type === "error" ? "alert" : "status");
        const message = document.createElement("div");
        message.className = "toast-copy";
        const heading = document.createElement("strong");
        heading.className = "toast-title";
        heading.textContent = title;
        const description = document.createElement("span");
        description.textContent = detail || "";
        message.append(heading, description);
        const close = document.createElement("button");
        close.className = "toast-close";
        close.type = "button";
        close.textContent = "×";
        close.setAttribute("aria-label", "Dismiss notification");
        close.addEventListener("click", () => {
            toast.remove();
            if (currentToastTimer !== null) clearTimeout(currentToastTimer);
            currentToastTimer = null;
        });
        toast.append(message, close);
        notifications.appendChild(toast);
        currentToastTimer = setTimeout(() => {
            toast.remove();
            currentToastTimer = null;
        }, type === "error" ? 9000 : 6000);
    }

    function setStep(step) {
        shadow.querySelectorAll("[data-step]").forEach((element) => {
            const index = Number(element.getAttribute("data-step"));
            element.classList.toggle("active", index === step);
            element.classList.toggle("done", index < step);
        });
    }

    function showReviewMessage(message, kind) {
        reviewMessage.className = kind || "";
        reviewMessageText.textContent = message;
    }

    function showFieldError(name, message) {
        const input = inputs.get(name);
        const error = errors.get(name);
        if (!input || !error) return;
        input.setAttribute("aria-invalid", "true");
        error.textContent = message;
        error.hidden = false;
    }

    function updateFieldAppearance(input) {
        const populated = Boolean(input.value.trim());
        input.classList.toggle("is-populated", populated);
        input.classList.toggle("is-empty", !populated);
    }

    function clearFieldError(name) {
        const input = inputs.get(name);
        const error = errors.get(name);
        if (!input || !error) return;
        input.removeAttribute("aria-invalid");
        error.textContent = "";
        error.hidden = true;
    }

    function normalizeText(value) {
        return String(value || "").trim().replace(/\s+/g, " ");
    }
    function normalizeLabel(value) {
        return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    }
    function findField(label) {
        const key = normalizeLabel(label);
        for (const [field, names] of Object.entries(ALIASES)) {
            if (names.includes(key)) return field;
        }
        return null;
    }
    function extractEmail(value) {
        const match = String(value || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        return match ? match[0] : "";
    }
    function extractSSN(value) {
        const digits = String(value || "").replace(/\D/g, "");
        if (digits.length !== 9) return normalizeText(value);
        return digits.slice(0, 3) + "-" + digits.slice(3, 5) + "-" + digits.slice(5);
    }
    function extractZIP(value) {
        const match = String(value || "").match(/\b\d{5}(?:-\d{4})?\b/);
        return match ? match[0] : "";
    }
    function parseLocation(line) {
        const match = normalizeText(line).match(/^(.+?),?\s+([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
        if (!match) return null;
        const state = match[2].toUpperCase();
        if (!VALID_STATES.has(state)) return null;
        return { city: match[1].replace(/,\s*$/, "").trim(), state, zip: match[3] };
    }
    function parseName(line) {
        const words = normalizeText(line).split(" ").filter(Boolean);
        if (words.length < 2) return null;
        let generation = "";
        const last = words[words.length - 1].replace(/\./g, "").toUpperCase();
        if (SUFFIXES.has(last) && words.length > 2) generation = words.pop();
        if (words.length < 2) return null;
        return {
            firstName: words.shift(),
            lastName: words.pop(),
            middleName: words.join(" "),
            generation
        };
    }
    function looksLikeName(line) {
        if (/\d|@|[:=]/.test(line)) return false;
        if (/\b(ST|STREET|AVE|AVENUE|RD|ROAD|BLVD|DR|DRIVE|LN|LANE|CT|COURT|HWY|HIGHWAY|PKWY|PARKWAY)\b/i.test(line)) return false;
        const count = normalizeText(line).split(" ").length;
        return count >= 2 && count <= 5;
    }
    function findAddressIndex(lines) {
        const terms = /\b(ST|STREET|AVE|AVENUE|RD|ROAD|BLVD|DR|DRIVE|LN|LANE|CT|COURT|HWY|HIGHWAY|PKWY|PARKWAY|WAY|PL|PLACE|CIR|CIRCLE|APT|UNIT)\b/i;
        let fallback = -1;
        for (let i = 0; i < lines.length; i++) {
            if (!/^\d+\s+\S/.test(lines[i])) continue;
            if (fallback === -1) fallback = i;
            if (terms.test(lines[i])) return i;
        }
        return fallback;
    }
    function assignParsedField(data, field, value) {
        const clean = normalizeText(value);
        if (!clean) return;
        if (field === "fullName") {
            const parsed = parseName(clean);
            if (parsed) Object.assign(data, parsed);
        } else if (field === "email") {
            data.email = extractEmail(clean);
        } else if (field === "ssn") {
            data.ssn = extractSSN(clean);
        } else if (field === "zip") {
            data.zip = extractZIP(clean);
        } else if (field === "state") {
            data.state = clean.toUpperCase();
        } else if (Object.prototype.hasOwnProperty.call(data, field)) {
            data[field] = clean;
        }
    }

    function parseRawData(text) {
        const data = Object.fromEntries(Object.keys(LABELS).map((key) => [key, ""]));
        const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        const rest = [];
        for (const line of lines) {
            const label = line.match(/^([^:=]{1,45})\s*[:=]\s*(.*)$/);
            if (label) {
                const field = findField(label[1]);
                if (field) {
                    assignParsedField(data, field, label[2]);
                    continue;
                }
            }
            rest.push(line);
        }
        // Extract unambiguous standalone values first, before guessing names or addresses.
        for (let i = rest.length - 1; i >= 0; i--) {
            const line = rest[i];
            if (!data.email && extractEmail(line)) {
                data.email = extractEmail(line);
                rest.splice(i, 1);
            } else if (!data.ssn && /^\d{3}[-\s]?\d{2}[-\s]?\d{4}$/.test(line)) {
                data.ssn = extractSSN(line);
                rest.splice(i, 1);
            } else if (!data.dob && /^(?:\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})$/.test(line)) {
                data.dob = line;
                rest.splice(i, 1);
            }
        }
        if (!data.firstName && !data.lastName) {
            const index = rest.findIndex(looksLikeName);
            if (index >= 0) {
                const parsed = parseName(rest[index]);
                if (parsed) {
                    Object.assign(data, parsed);
                    rest.splice(index, 1);
                }
            }
        }
        if (!data.address) {
            const index = findAddressIndex(rest);
            if (index >= 0) data.address = rest.splice(index, 1)[0];
        }
        if (!data.city || !data.state || !data.zip) {
            for (let i = 0; i < rest.length; i++) {
                const location = parseLocation(rest[i]);
                if (!location) continue;
                for (const [key, value] of Object.entries(location)) {
                    if (!data[key]) data[key] = value;
                }
                break;
            }
        }
        return data;
    }

    function readReview() {
        const data = {};
        for (const [field, input] of inputs) data[field] = input.value.trim();
        return data;
    }
    function loadReview(data) {
        for (const [field, input] of inputs) {
            input.value = data[field] || "";
            updateFieldAppearance(input);
            clearFieldError(field);
        }
        reviewReady = true;
        reviewContent.hidden = false;
        emptyState.hidden = true;
        $("fill").disabled = false;
        setStep(2);
        const count = Object.values(data).filter(Boolean).length;
        const required = data.firstName && data.lastName;
        showReviewMessage(
            count + " of 12 fields detected. " + (required ? "Review values carefully, then fill the form." : "First and last name need attention before filling."),
            required ? "" : "warning"
        );
        setFormState("Review your data", "The parser may not recognize every format; verify all fields.");
        notify(required ? "success" : "warning", "Parsing complete", count + " fields detected. Confirm the details on the right.");
    }

    function validDOB(value) {
        let y, m, d;
        let match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (match) {
            m = Number(match[1]); d = Number(match[2]); y = Number(match[3]);
        } else {
            match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (!match) return false;
            y = Number(match[1]); m = Number(match[2]); d = Number(match[3]);
        }
        const date = new Date(Date.UTC(y, m - 1, d));
        const now = new Date();
        return y >= 1880 && y <= now.getUTCFullYear() &&
            date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 &&
            date.getUTCDate() === d && date.getTime() <= now.getTime();
    }

    function validate(data) {
        const invalid = [];
        if (!data.firstName) invalid.push(["firstName", "First name is required."]);
        if (!data.lastName) invalid.push(["lastName", "Last name is required."]);
        if (data.state && !VALID_STATES.has(data.state.toUpperCase())) invalid.push(["state", "Use a valid two-letter US state or territory code."]);
        if (data.zip && !/^\d{5}(?:-\d{4})?$/.test(data.zip)) invalid.push(["zip", "Enter a 5-digit ZIP or ZIP+4."]);
        if (data.ssn && data.ssn.replace(/\D/g, "").length !== 9) invalid.push(["ssn", "SSN / ITIN must contain exactly 9 digits."]);
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) invalid.push(["email", "Enter a valid email address."]);
        if (data.dob && !validDOB(data.dob)) invalid.push(["dob", "Use a valid past date: MM/DD/YYYY or YYYY-MM-DD."]);
        return invalid;
    }

    function getTarget(id) {
        const element = document.getElementById(id);
        return element && !host.contains(element) ? element : null;
    }

    function setInputValue(id, value) {
        const element = getTarget(id);
        if (!element) return "field not found on this page";
        if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return "unsupported field type";
        if (element.disabled || element.readOnly) return "field is disabled or read-only";
        try {
            const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(prototype, "value").set;
            setter.call(element, value);
            element.dispatchEvent(new Event("input", { bubbles: true }));
            element.dispatchEvent(new Event("change", { bubbles: true }));
            return null;
        } catch (_error) {
            return "could not update field";
        }
    }

    function setSelectValue(id, value) {
        const element = getTarget(id);
        if (!element) return "field not found on this page";
        if (!(element instanceof HTMLSelectElement)) return setInputValue(id, value);
        if (element.disabled) return "field is disabled";
        const wanted = normalizeText(value).replace(/\.$/, "").toLowerCase();
        let match = Array.from(element.options).find((option) =>
            normalizeText(option.value).replace(/\.$/, "").toLowerCase() === wanted ||
            normalizeText(option.textContent).replace(/\.$/, "").toLowerCase() === wanted
        );
        if (!match && wanted === "jr") {
            match = Array.from(element.options).find((option) => /^junior$/i.test(normalizeText(option.textContent)));
        }
        if (!match && wanted === "sr") {
            match = Array.from(element.options).find((option) => /^senior$/i.test(normalizeText(option.textContent)));
        }
        if (!match) return "matching option unavailable";
        try {
            const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
            setter.call(element, match.value);
            element.dispatchEvent(new Event("input", { bubbles: true }));
            element.dispatchEvent(new Event("change", { bubbles: true }));
            return null;
        } catch (_error) {
            return "could not select option";
        }
    }

    function fillSSN(value) {
        const digits = value.replace(/\D/g, "");
        if (digits.length !== 9) return "must contain exactly nine digits";
        const parts = [FIELD_IDS.ssn1, FIELD_IDS.ssn2, FIELD_IDS.ssn3];
        if (parts.some((id) => !getTarget(id))) return "one or more SSN fields not found";
        if (parts.some((id) => getTarget(id).disabled || getTarget(id).readOnly)) return "one or more SSN fields are disabled";
        for (const [index, id] of parts.entries()) {
            const part = index === 0 ? digits.slice(0, 3) : index === 1 ? digits.slice(3, 5) : digits.slice(5);
            const error = setInputValue(id, part);
            if (error) return error;
        }
        return null;
    }

    function detectFormFields() {
        return [
            FIELD_IDS.firstName, FIELD_IDS.lastName, FIELD_IDS.address,
            FIELD_IDS.city, FIELD_IDS.zip, FIELD_IDS.email
        ].filter((id) => Boolean(getTarget(id))).length;
    }

    function fillExperian(data) {
        const succeeded = [];
        const issues = [];
        const mapping = [
            ["firstName", "First name", () => setInputValue(FIELD_IDS.firstName, data.firstName)],
            ["middleName", "Middle initial / name", () => setInputValue(FIELD_IDS.middleName, data.middleName)],
            ["lastName", "Last name", () => setInputValue(FIELD_IDS.lastName, data.lastName)],
            ["generation", "Suffix", () => setSelectValue(FIELD_IDS.generation, data.generation)],
            ["address", "Street address", () => setInputValue(FIELD_IDS.address, data.address)],
            ["city", "City", () => setInputValue(FIELD_IDS.city, data.city)],
            ["state", "State", () => setSelectValue(FIELD_IDS.state, data.state.toUpperCase())],
            ["zip", "ZIP code", () => setInputValue(FIELD_IDS.zip, data.zip)],
            ["ssn", "SSN / ITIN", () => fillSSN(data.ssn)],
            ["email", "Email", () => setInputValue(FIELD_IDS.email, data.email)],
            ["reportNumber", "Report number", () => setInputValue(FIELD_IDS.reportNumber, data.reportNumber)]
        ];
        for (const [name, label, fill] of mapping) {
            if (!data[name]) continue;
            const error = fill();
            if (error) issues.push(label + ": " + error);
            else succeeded.push(label);
        }
        if (data.email && !issues.some((message) => message.startsWith("Email:"))) {
            const confirmationError = setInputValue(FIELD_IDS.emailConfirm, data.email);
            if (confirmationError) issues.push("Confirm email: " + confirmationError);
        }
        if (data.dob) issues.push("Date of birth: no Experian field mapping configured; enter manually if needed.");
        const terms = getTarget(FIELD_IDS.terms);
        if (terms instanceof HTMLInputElement && terms.type === "checkbox") {
            if (!terms.checked) {
                if (terms.disabled) {
                    issues.push("Terms & Conditions: checkbox is disabled.");
                } else {
                    try {
                        terms.click();
                        if (terms.checked) {
                            succeeded.push("Terms & Conditions");
                        } else {
                            issues.push("Terms & Conditions: checkbox did not stay checked.");
                        }
                    } catch (_error) {
                        issues.push("Terms & Conditions: unable to check the box.");
                    }
                }
            }
        } else {
            issues.push("Terms & Conditions: checkbox not found on this page.");
        }
        return { succeeded, issues };
    }

    function openPanel() {
        lastFocused = document.activeElement;
        wasPageOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = "hidden";
        overlay.hidden = false;
        $("launcher").hidden = true;
        const count = detectFormFields();
        setFormState(
            count ? "Experian fields detected" : "Experian form not detected",
            count ? count + " core fields found on this page. Form submission is manual." : "Open the correct Experian form before filling."
        );
        raw.focus();
    }
    function closePanel() {
        overlay.hidden = true;
        $("launcher").hidden = false;
        document.documentElement.style.overflow = wasPageOverflow;
        if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
        else $("launcher").focus();
    }

    function clearEverything() {
        raw.value = "";
        $("char-count").textContent = "0 characters";
        for (const [name, input] of inputs) {
            input.value = "";
            updateFieldAppearance(input);
            clearFieldError(name);
        }
        reviewReady = false;
        reviewContent.hidden = true;
        emptyState.hidden = false;
        $("fill").disabled = true;
        setStep(1);
        setFormState("Panel cleared", "Experian's form itself has not been changed.");
        notify("info", "Client data cleared", "Paste and review another client's information.");
        raw.focus();
    }

    function parseAction() {
        try {
            if (!raw.value.trim()) {
                notify("warning", "Nothing to parse", "Paste client information into the text box first.");
                raw.focus();
                return;
            }
            const data = parseRawData(raw.value);
            if (!Object.values(data).some(Boolean)) {
                notify("error", "No details recognized", "Check the format or use labels such as First Name: and Address:.");
                return;
            }
            loadReview(data);
        } catch (_error) {
            notify("error", "Unable to parse data", "Review the pasted format and try again.");
        }
    }

    function fillAction() {
        if (!reviewReady) {
            notify("warning", "Parse data first", "Review the parsed fields before filling.");
            return;
        }
        const data = readReview();
        const validationErrors = validate(data);
        for (const name of inputs.keys()) clearFieldError(name);
        if (validationErrors.length) {
            validationErrors.forEach(([name, message]) => showFieldError(name, message));
            showReviewMessage(validationErrors.length + " field(s) need correction before filling.", "error");
            notify("error", "Please fix highlighted fields", validationErrors.map(([name]) => LABELS[name]).join(", "));
            inputs.get(validationErrors[0][0]).focus();
            return;
        }
        if (!detectFormFields()) {
            notify("error", "Experian form not found", "Open the correct Experian form on this page and try again.");
            setFormState("Form not found", "Nothing was filled. Your reviewed details are still available.");
            return;
        }
        try {
            const result = fillExperian(data);
            if (!result.succeeded.length) {
                showReviewMessage("No fields could be filled. Verify you are on the correct Experian form.", "error");
                setFormState("No fields updated", "No changes were submitted.");
                notify("error", "Unable to fill form", "None of the reviewed fields matched writable form fields.");
                return;
            }
            setStep(3);
            const summary = result.succeeded.length + " field(s) filled.";
            if (result.issues.length) {
                showReviewMessage(summary + " Check: " + result.issues.join(" "), "warning");
                notify("warning", "Partially filled", summary + " Review the attention items before proceeding.");
            } else {
                showReviewMessage(summary + " Verify the form before submitting. No form was submitted.", "");
                notify("success", "Experian form filled", summary + " Double-check details before submitting manually.");
            }
            setFormState("Filled: " + result.succeeded.length + " · Needs attention: " + result.issues.length,
                "Review the Experian form. Submission remains manual.");
        } catch (_error) {
            showReviewMessage("Unexpected fill error. Confirm each field on the Experian page.", "error");
            notify("error", "Form update interrupted", "Check the Experian fields for partial changes.");
        }
    }

    $("launcher").addEventListener("click", openPanel);
    $("close").addEventListener("click", closePanel);
    $("parse").addEventListener("click", parseAction);
    $("fill").addEventListener("click", fillAction);
    $("clear").addEventListener("click", clearEverything);
    raw.addEventListener("input", () => {
        $("char-count").textContent = raw.value.length.toLocaleString() + " characters";
    });
    raw.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            parseAction();
        }
    });
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closePanel();
    });
    shadow.addEventListener("keydown", (event) => {
        if (overlay.hidden) return;
        if (event.key === "Escape") {
            event.preventDefault();
            closePanel();
        } else if (event.key === "Tab") {
            const focusable = Array.from(dialog.querySelectorAll("button:not([disabled]), input:not([disabled]), textarea:not([disabled])"))
                .filter((node) => node.getClientRects().length);
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && shadow.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && shadow.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    });
})();