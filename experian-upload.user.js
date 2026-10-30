// ==UserScript==
// @name         Experian Client Data Parser & Autofill
// @namespace    CRC Tools
// @version      2.0
// @description  Paste messy client data, automatically parse it, review/edit it, then populate the Experian form.
// @match        https://*.experian.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==


/* =========================================================
   CSS
   ========================================================= */

const EXPERIAN_CSS = `
* {
    box-sizing: border-box;
}

:root {
    --crc-blue: #2563eb;
    --crc-blue-hover: #1d4ed8;
    --crc-dark: #1f2937;
    --crc-text: #374151;
    --crc-muted: #6b7280;
    --crc-border: #d1d5db;
    --crc-bg: #f9fafb;
    --crc-white: #ffffff;
    --crc-warning: #92400e;
    --crc-warning-bg: #fffbeb;
    --crc-success: #166534;
    --crc-success-bg: #f0fdf4;
}


/* =========================================================
   LAUNCH BUTTON
   ========================================================= */

#crc-experian-launch {
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 999999;

    height: 42px;
    padding: 0 16px;

    border: none;
    border-radius: 7px;

    background: var(--crc-dark);
    color: #fff;

    font-family: Arial, sans-serif;
    font-size: 12px;
    font-weight: 600;

    cursor: pointer;

    box-shadow: 0 3px 12px rgba(0, 0, 0, .20);

    transition: .15s ease;
}

#crc-experian-launch:hover {
    background: #111827;
    transform: translateY(-1px);
}


/* =========================================================
   OVERLAY
   ========================================================= */

#crc-experian-overlay {
    position: fixed;
    inset: 0;
    z-index: 999998;

    display: none;

    align-items: center;
    justify-content: center;

    padding: 20px;

    background: rgba(0, 0, 0, .45);

    font-family: Arial, sans-serif;
}


/* =========================================================
   PANEL
   ========================================================= */

#crc-experian-panel {
    width: 700px;
    max-width: 100%;
    max-height: calc(100vh - 40px);

    display: flex;
    flex-direction: column;

    overflow: hidden;

    background: var(--crc-white);

    border-radius: 9px;

    box-shadow:
        0 15px 45px rgba(0, 0, 0, .25);
}


/* =========================================================
   HEADER
   ========================================================= */

#crc-experian-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    padding: 14px 17px;

    background: var(--crc-dark);
    color: #fff;
}

#crc-experian-title {
    font-size: 15px;
    font-weight: 700;
}

#crc-experian-subtitle {
    margin-top: 3px;

    color: #cbd5e1;

    font-size: 10px;
}

#crc-experian-close {
    width: 28px;
    height: 28px;

    padding: 0;

    border: none;
    border-radius: 5px;

    background: rgba(255, 255, 255, .08);
    color: #fff;

    font-size: 21px;
    line-height: 1;

    cursor: pointer;
}

#crc-experian-close:hover {
    background: rgba(255, 255, 255, .18);
}


/* =========================================================
   CONTENT
   ========================================================= */

#crc-experian-content {
    padding: 18px;

    overflow-y: auto;

    background: #fff;
}


/* =========================================================
   SECTION
   ========================================================= */

.crc-section {
    margin-bottom: 18px;
}

.crc-section-title {
    margin-bottom: 7px;

    color: var(--crc-text);

    font-size: 11px;
    font-weight: 700;

    text-transform: uppercase;
    letter-spacing: .4px;
}


/* =========================================================
   RAW DATA
   ========================================================= */

#crc-experian-raw {
    display: block;

    width: 100%;
    height: 145px;

    padding: 10px;

    resize: vertical;

    border: 1px solid var(--crc-border);
    border-radius: 6px;

    outline: none;

    background: var(--crc-bg);
    color: var(--crc-text);

    font-family: Consolas, monospace;
    font-size: 12px;

    line-height: 1.5;
}

#crc-experian-raw:focus {
    border-color: var(--crc-blue);

    background: #fff;

    box-shadow:
        0 0 0 2px rgba(37, 99, 235, .10);
}


/* =========================================================
   PARSE BUTTON
   ========================================================= */

#crc-experian-parse {
    margin-top: 8px;

    height: 34px;

    padding: 0 14px;

    border: none;
    border-radius: 6px;

    background: var(--crc-blue);
    color: #fff;

    font-size: 11px;
    font-weight: 700;

    cursor: pointer;
}

#crc-experian-parse:hover {
    background: var(--crc-blue-hover);
}


/* =========================================================
   REVIEW PANEL
   ========================================================= */

#crc-experian-review {
    display: none;

    padding: 13px;

    border: 1px solid #e5e7eb;
    border-radius: 7px;

    background: var(--crc-bg);
}


/* =========================================================
   FIELD ROW
   ========================================================= */

.crc-field-row {
    display: grid;

    grid-template-columns: 125px 1fr;

    align-items: center;

    gap: 10px;

    margin-bottom: 7px;
}

.crc-field-row:last-child {
    margin-bottom: 0;
}


/* =========================================================
   FIELD LABEL
   ========================================================= */

.crc-field-label {
    color: var(--crc-muted);

    font-size: 11px;
    font-weight: 600;
}


/* =========================================================
   INPUTS
   ========================================================= */

.crc-field-input {
    width: 100%;
    height: 32px;

    padding: 0 8px;

    border: 1px solid var(--crc-border);
    border-radius: 5px;

    outline: none;

    background: #fff;
    color: var(--crc-text);

    font-family: Arial, sans-serif;
    font-size: 12px;
}

.crc-field-input:hover {
    border-color: #9ca3af;
}

.crc-field-input:focus {
    border-color: var(--crc-blue);

    box-shadow:
        0 0 0 2px rgba(37, 99, 235, .10);
}


/* =========================================================
   WARNING
   ========================================================= */

#crc-experian-warning {
    display: none;

    margin-top: 10px;

    padding: 8px 10px;

    border-radius: 5px;

    background: var(--crc-warning-bg);
    color: var(--crc-warning);

    font-size: 10px;
    line-height: 1.4;
}


/* =========================================================
   STATUS
   ========================================================= */

#crc-experian-status {
    display: none;

    margin-top: 10px;

    padding: 8px 10px;

    border-radius: 5px;

    background: var(--crc-success-bg);
    color: var(--crc-success);

    font-size: 10px;
    line-height: 1.4;
}


/* =========================================================
   FOOTER
   ========================================================= */

#crc-experian-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 8px;

    padding: 11px 15px;

    border-top: 1px solid #e5e7eb;

    background: #f9fafb;
}


/* =========================================================
   FOOTER BUTTONS
   ========================================================= */

.crc-footer-btn {
    height: 34px;

    padding: 0 13px;

    border-radius: 5px;

    font-size: 11px;
    font-weight: 700;

    cursor: pointer;
}


/* =========================================================
   CLEAR
   ========================================================= */

#crc-experian-clear {
    border: 1px solid var(--crc-border);

    background: #fff;
    color: var(--crc-text);
}

#crc-experian-clear:hover {
    background: #f3f4f6;
}


/* =========================================================
   FILL
   ========================================================= */

#crc-experian-fill {
    border: 1px solid var(--crc-blue);

    background: var(--crc-blue);
    color: #fff;
}

#crc-experian-fill:hover {
    background: var(--crc-blue-hover);
}


/* =========================================================
   RESPONSIVE
   ========================================================= */

@media (max-width: 600px) {

    #crc-experian-overlay {
        padding: 10px;
    }

    #crc-experian-panel {
        max-height: calc(100vh - 20px);
    }

    #crc-experian-content {
        padding: 13px;
    }

    .crc-field-row {
        grid-template-columns: 1fr;
        gap: 4px;
    }

    .crc-field-input {
        height: 34px;
    }

    #crc-experian-footer {
        padding: 10px;
    }

    .crc-footer-btn {
        flex: 1;
    }
}


/* =========================================================
   REDUCED MOTION
   ========================================================= */

@media (prefers-reduced-motion: reduce) {

    #crc-experian-launch {
        transition: none;
    }
}

`;


/* =========================================================
   HTML
   ========================================================= */

const EXPERIAN_HTML = `

<!-- =====================================================
     FLOATING BUTTON
     ===================================================== -->

<button id="crc-experian-launch">
    OPEN ME!
</button>


<!-- =====================================================
     OVERLAY
     ===================================================== -->

<div id="crc-experian-overlay">


    <!-- =================================================
         PANEL
         ================================================= -->

    <div id="crc-experian-panel">


        <!-- =============================================
             HEADER
             ============================================= -->

        <div id="crc-experian-header">

            <div>

                <div id="crc-experian-title">
                    PASTE MO NA LANG DINE!
                </div>

                <div id="crc-experian-subtitle">
                    Paste → Parse → Review → Fill :)
                </div>

            </div>

            <button id="crc-experian-close">
                ×
            </button>

        </div>


        <!-- =============================================
             CONTENT
             ============================================= -->

        <div id="crc-experian-content">


            <!-- =========================================
                 RAW DATA
                 ========================================= -->

            <div class="crc-section">

                <div class="crc-section-title">
                    1. Paste Raw Client Data
                </div>


                <textarea
                    id="crc-experian-raw"
                    placeholder="Example:
Leborah Joy Angeles
123 Kalachuchi Road
Tabing Ilog STC 64120
DOB: 05/01/1914
SSN: 123-12-2222
Email: [AymaBadGurl@gmail.com](mailto:AymaBadGurl@gmail.com)"
                ></textarea>


                <button id="crc-experian-parse">
                    PARSE DATA
                </button>

            </div>


            <!-- =========================================
                 REVIEW
                 ========================================= -->

            <div class="crc-section">

                <div class="crc-section-title">
                    2. Review & Edit
                </div>


                <div id="crc-experian-review">


                    <!-- First Name -->

                    <div class="crc-field-row">

                        <label
                            class="crc-field-label"
                            for="crc-firstName">
                            First Name
                        </label>

                        <input
                            class="crc-field-input"
                            id="crc-firstName"
                            type="text"
                        >

                    </div>


                    <!-- Middle Initial -->

                    <div class="crc-field-row">

                        <label
                            class="crc-field-label"
                            for="crc-middleName">
                            Middle Initial
                        </label>

                        <input
                            class="crc-field-input"
                            id="crc-middleName"
                            type="text"
                        >

                    </div>


                    <!-- Last Name -->

                    <div class="crc-field-row">

                        <label
                            class="crc-field-label"
                            for="crc-lastName">
                            Last Name
                        </label>

                        <input
                            class="crc-field-input"
                            id="crc-lastName"
                            type="text"
                        >

                    </div>


                    <!-- Generation -->

                    <div class="crc-field-row">

                        <label
                            class="crc-field-label"
                            for="crc-generation">
                            Generation
                        </label>

                        <input
                            class="crc-field-input"
                            id="crc-generation"
                            type="text"
                        >

                    </div>


                    <!-- Address -->

                    <div class="crc-field-row">

                        <label
                            class="crc-field-label"
                            for="crc-address">
                            Address
                        </label>

                        <input
                            class="crc-field-input"
                            id="crc-address"
                            type="text"
                        >

                    </div>


                    <!-- City -->

                    <div class="crc-field-row">

                        <label
                            class="crc-field-label"
                            for="crc-city">
                            City
                        </label>

                        <input
                            class="crc-field-input"
                            id="crc-city"
                            type="text"
                        >

                    </div>


                    <!-- State -->

                    <div class="crc-field-row">

                        <label
                            class="crc-field-label"
                            for="crc-state">
                            State
                        </label>

                        <input
                            class="crc-field-input"
                            id="crc-state"
                            type="text"
                            maxlength="2"
                        >

                    </div>


                    <!-- ZIP -->

                    <div class="crc-field-row">

                        <label
                            class="crc-field-label"
                            for="crc-zip">
                            ZIP Code
                        </label>

                        <input
                            class="crc-field-input"
                            id="crc-zip"
                            type="text"
                            maxlength="5"
                        >

                    </div>


                    <!-- DOB -->

                    <div class="crc-field-row">

                        <label
                            class="crc-field-label"
                            for="crc-dob">
                            Date of Birth
                        </label>

                        <input
                            class="crc-field-input"
                            id="crc-dob"
                            type="text"
                        >

                    </div>


                    <!-- SSN -->

                    <div class="crc-field-row">

                        <label
                            class="crc-field-label"
                            for="crc-ssn">
                            SSN / ITIN
                        </label>

                        <input
                            class="crc-field-input"
                            id="crc-ssn"
                            type="text"
                        >

                    </div>


                    <!-- Email -->

                    <div class="crc-field-row">

                        <label
                            class="crc-field-label"
                            for="crc-email">
                            Email
                        </label>

                        <input
                            class="crc-field-input"
                            id="crc-email"
                            type="text"
                        >

                    </div>


                    <!-- Report Number -->

                    <div class="crc-field-row">

                        <label
                            class="crc-field-label"
                            for="crc-reportNumber">
                            Report Number
                        </label>

                        <input
                            class="crc-field-input"
                            id="crc-reportNumber"
                            type="text"
                        >

                    </div>


                    <!-- WARNING -->

                    <div id="crc-experian-warning">

                        Review the information above carefully
                        before filling the Experian form.

                    </div>


                    <!-- STATUS -->

                    <div id="crc-experian-status"></div>


                </div>

            </div>


        </div>


        <!-- =============================================
             FOOTER
             ============================================= -->

        <div id="crc-experian-footer">

            <button
                id="crc-experian-clear"
                class="crc-footer-btn">

                CLEAR

            </button>


            <button
                id="crc-experian-fill"
                class="crc-footer-btn">

                FILL EXPERIAN FORM

            </button>

        </div>


    </div>

</div>

`;


/* =========================================================
   JAVASCRIPT
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONFIGURATION
       ===================================================== */

    const FIELD_IDS = {

        firstName:
            "firstName",

        middleName:
            "middleName",

        lastName:
            "lastName",

        generation:
            "genCode",

        address:
            "address",

        city:
            "city",

        state:
            "state",

        zip:
            "zip",

        ssn1:
            "ssn1",

        ssn2:
            "ssn2",

        ssn3:
            "ssn3",

        email:
            "emailAddress",

        emailConfirm:
            "emailAddressConfirm",

        reportNumber:
            "alertReportId",

        terms:
            "frmAcceptTC1"

    };


    /* =====================================================
       PARSER ALIASES
       ===================================================== */

    const ALIASES = {

        firstName: [
            "firstname",
            "first",
            "fname",
            "givenname",
            "given"
        ],

        middleName: [
            "middle",
            "middleinitial",
            "middlename",
            "mi"
        ],

        lastName: [
            "lastname",
            "last",
            "lname",
            "surname",
            "familyname"
        ],

        generation: [
            "generation",
            "suffix",
            "gensuffix"
        ],

        address: [
            "address",
            "street",
            "streetaddress",
            "mailingaddress"
        ],

        city: [
            "city"
        ],

        state: [
            "state",
            "st"
        ],

        zip: [
            "zip",
            "zipcode",
            "postalcode",
            "postal"
        ],

        dob: [
            "dob",
            "dateofbirth",
            "birthdate",
            "birthday"
        ],

        ssn: [
            "ssn",
            "socialsecurity",
            "socialsecuritynumber",
            "itin",
            "taxid"
        ],

        email: [
            "email",
            "emailaddress",
            "aliasemail",
            "emailaddr"
        ],

        reportNumber: [
            "reportnumber",
            "reportno",
            "reportid",
            "report"
        ]

    };


    /* =====================================================
       INJECT CSS
       ===================================================== */

    const style =
        document.createElement("style");

    style.id =
        "crc-experian-style";

    style.textContent =
        EXPERIAN_CSS;

    document.head.appendChild(style);


    /* =====================================================
       INJECT HTML
       ===================================================== */

    document.body.insertAdjacentHTML(
        "beforeend",
        EXPERIAN_HTML
    );


    /* =====================================================
       ELEMENT REFERENCES
       ===================================================== */

    const launchButton =
        document.getElementById(
            "crc-experian-launch"
        );

    const overlay =
        document.getElementById(
            "crc-experian-overlay"
        );

    const closeButton =
        document.getElementById(
            "crc-experian-close"
        );

    const rawInput =
        document.getElementById(
            "crc-experian-raw"
        );

    const parseButton =
        document.getElementById(
            "crc-experian-parse"
        );

    const reviewPanel =
        document.getElementById(
            "crc-experian-review"
        );

    const clearButton =
        document.getElementById(
            "crc-experian-clear"
        );

    const fillButton =
        document.getElementById(
            "crc-experian-fill"
        );

    const warning =
        document.getElementById(
            "crc-experian-warning"
        );

    const status =
        document.getElementById(
            "crc-experian-status"
        );


    /* =====================================================
       REVIEW FIELD MAP
       ===================================================== */

    const REVIEW_FIELDS = {

        firstName:
            "crc-firstName",

        middleName:
            "crc-middleName",

        lastName:
            "crc-lastName",

        generation:
            "crc-generation",

        address:
            "crc-address",

        city:
            "crc-city",

        state:
            "crc-state",

        zip:
            "crc-zip",

        dob:
            "crc-dob",

        ssn:
            "crc-ssn",

        email:
            "crc-email",

        reportNumber:
            "crc-reportNumber"

    };


    /* =====================================================
       OPEN PANEL
       ===================================================== */

    function openPanel() {

        overlay.style.display =
            "flex";

        rawInput.focus();

    }


    /* =====================================================
       CLOSE PANEL
       ===================================================== */

    function closePanel() {

        overlay.style.display =
            "none";

    }


    /* =====================================================
       NORMALIZE TEXT
       ===================================================== */

    function normalizeText(value) {

        return String(value || "")
            .trim()
            .replace(/\s+/g, " ");

    }


    /* =====================================================
       NORMALIZE LABEL
       ===================================================== */

    function normalizeLabel(label) {

        return String(label || "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");

    }


    /* =====================================================
       FIND FIELD
       ===================================================== */

    function findField(label) {

        const normalized =
            normalizeLabel(label);


        for (
            const fieldName in ALIASES
        ) {

            if (
                ALIASES[fieldName]
                    .includes(normalized)
            ) {

                return fieldName;

            }

        }


        return null;

    }


    /* =====================================================
       EXTRACT EMAIL
       ===================================================== */

    function extractEmail(value) {

        if (!value) {
            return "";
        }


        /*
         * Handles:
         *
         * john@example.com
         *
         * [john@example.com](mailto:john@example.com)
         */

        const markdown =
            String(value).match(
                /\[[^\]]+\]\(\s*mailto:([^)]+)\)/i
            );


        if (markdown) {

            return markdown[1]
                .trim();

        }


        const email =
            String(value).match(
                /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
            );


        return email
            ? email[0]
            : "";

    }


    /* =====================================================
       EXTRACT SSN
       ===================================================== */

    function extractSSN(value) {

        if (!value) {
            return "";
        }


        const digits =
            String(value)
                .replace(/\D/g, "");


        if (
            digits.length !== 9
        ) {

            return normalizeText(value);

        }


        return (
            digits.substring(0, 3) +
            "-" +
            digits.substring(3, 5) +
            "-" +
            digits.substring(5, 9)
        );

    }


    /* =====================================================
       EXTRACT ZIP
       ===================================================== */

    function extractZIP(value) {

        if (!value) {
            return "";
        }


        const match =
            String(value)
                .match(/\b\d{5}(?:-\d{4})?\b/);


        return match
            ? match[0]
            : "";

    }


    /* =====================================================
       EXTRACT STATE + ZIP
       ===================================================== */

    function parseLocation(line) {

        const result = {

            city: "",
            state: "",
            zip: ""

        };


        const clean =
            normalizeText(line);


        /*
         * Example:
         *
         * BATON ROUGE LA 70802
         *
         * CITY = BATON ROUGE
         * STATE = LA
         * ZIP = 70802
         */


        const match =
            clean.match(
                /^(.+?)\s+([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/
            );


        if (match) {

            result.city =
                match[1].trim();

            result.state =
                match[2]
                    .toUpperCase();

            result.zip =
                match[3];

            return result;

        }


        /*
         * Example:
         *
         * BATON ROUGE, LA 70802
         */

        const commaMatch =
            clean.match(
                /^(.+?),\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/
            );


        if (commaMatch) {

            result.city =
                commaMatch[1].trim();

            result.state =
                commaMatch[2]
                    .toUpperCase();

            result.zip =
                commaMatch[3];

            return result;

        }


        return result;

    }


    /* =====================================================
       PARSE NAME
       ===================================================== */

    function parseName(line) {

        const result = {

            firstName: "",
            middleName: "",
            lastName: "",
            generation: ""

        };


        const words =
            normalizeText(line)
                .split(" ")
                .filter(Boolean);


        if (words.length < 2) {

            return result;

        }


        /*
         * Check for suffix/generation.
         */

        const generations = [
            "JR",
            "JR.",
            "SR",
            "SR.",
            "I",
            "II",
            "III",
            "IV",
            "V",
            "VI",
            "VII",
            "VIII",
            "IX"
        ];


        let generation = "";


        if (
            generations.includes(
                words[words.length - 1]
                    .toUpperCase()
            )
        ) {

            generation =
                words.pop();

        }


        /*
         * First word = first name.
         * Last word = last name.
         * Anything between = middle name/initial.
         */

        result.firstName =
            words.shift() || "";


        result.lastName =
            words.pop() || "";


        result.middleName =
            words.join(" ");


        result.generation =
            generation;


        return result;

    }


    /* =====================================================
       PARSE RAW DATA
       ===================================================== */

    function parseRawData(raw) {

        const data = {

            firstName: "",
            middleName: "",
            lastName: "",
            generation: "",

            address: "",
            city: "",
            state: "",
            zip: "",

            dob: "",
            ssn: "",
            email: "",

            reportNumber: ""

        };


        const lines =
            String(raw)
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(Boolean);


        if (!lines.length) {

            return data;

        }


        /*
         * -------------------------------------------------
         * STEP 1
         * Find explicitly labeled fields.
         * -------------------------------------------------
         */

        const unlabeledLines = [];


        for (
            let i = 0;
            i < lines.length;
            i++
        ) {

            const line =
                lines[i];


            /*
             * Ignore Markdown links as standalone noise.
             */

            if (
                line.startsWith("[") &&
                line.includes("](mailto:")
            ) {

                continue;

            }


            /*
             * Look for:
             *
             * DOB: 11/26/1989
             * SSN: 222-22-2222
             * Email: john@example.com
             */

            const match =
                line.match(
                    /^([^:]+):\s*(.+)$/
                );


            if (!match) {

                /*
                 * Also support:
                 *
                 * Email = john@example.com
                 */

                const equalsMatch =
                    line.match(
                        /^([^=]+)=\s*(.+)$/
                    );


                if (!equalsMatch) {

                    unlabeledLines.push(
                        line
                    );

                    continue;

                }


                const field =
                    findField(
                        equalsMatch[1]
                    );


                if (!field) {

                    unlabeledLines.push(
                        line
                    );

                    continue;

                }


                const value =
                    equalsMatch[2]
                        .trim();


                assignParsedField(
                    data,
                    field,
                    value
                );


                continue;

            }


            const field =
                findField(
                    match[1]
                );


            if (!field) {

                unlabeledLines.push(
                    line
                );

                continue;

            }


            const value =
                match[2].trim();


            assignParsedField(
                data,
                field,
                value
            );

        }


        /*
         * -------------------------------------------------
         * STEP 2
         * Process obvious unlabeled lines.
         * -------------------------------------------------
         */

        const cleanUnlabeled =
            unlabeledLines
                .map(normalizeText)
                .filter(Boolean);


        /*
         * Name:
         *
         * Terrance DUDULA
         */

        if (
            !data.firstName &&
            !data.lastName &&
            cleanUnlabeled.length
        ) {

            const nameIndex =
                findLikelyNameLine(
                    cleanUnlabeled
                );


            if (
                nameIndex !== -1
            ) {

                const name =
                    parseName(
                        cleanUnlabeled[
                            nameIndex
                        ]
                    );


                data.firstName =
                    name.firstName;

                data.middleName =
                    name.middleName;

                data.lastName =
                    name.lastName;

                data.generation =
                    name.generation;


                cleanUnlabeled.splice(
                    nameIndex,
                    1
                );

            }

        }


        /*
         * -------------------------------------------------
         * STEP 3
         * Find address.
         * -------------------------------------------------
         */

        if (!data.address) {

            const addressIndex =
                findLikelyAddressLine(
                    cleanUnlabeled
                );


            if (
                addressIndex !== -1
            ) {

                data.address =
                    cleanUnlabeled[
                        addressIndex
                    ];


                cleanUnlabeled.splice(
                    addressIndex,
                    1
                );

            }

        }


        /*
         * -------------------------------------------------
         * STEP 4
         * Find CITY STATE ZIP.
         * -------------------------------------------------
         */

        for (
            let i = 0;
            i < cleanUnlabeled.length;
            i++
        ) {

            const location =
                parseLocation(
                    cleanUnlabeled[i]
                );


            if (
                location.city &&
                location.state &&
                location.zip
            ) {

                if (!data.city) {

                    data.city =
                        location.city;

                }

                if (!data.state) {

                    data.state =
                        location.state;

                }

                if (!data.zip) {

                    data.zip =
                        location.zip;

                }


                cleanUnlabeled.splice(
                    i,
                    1
                );


                break;

            }

        }


        /*
         * -------------------------------------------------
         * STEP 5
         * Find standalone email.
         * -------------------------------------------------
         */

        if (!data.email) {

            for (
                let i = 0;
                i < cleanUnlabeled.length;
                i++
            ) {

                const email =
                    extractEmail(
                        cleanUnlabeled[i]
                    );


                if (email) {

                    data.email =
                        email;


                    cleanUnlabeled.splice(
                        i,
                        1
                    );


                    break;

                }

            }

        }


        /*
         * -------------------------------------------------
         * STEP 6
         * Find standalone SSN.
         * -------------------------------------------------
         */

        if (!data.ssn) {

            for (
                let i = 0;
                i < cleanUnlabeled.length;
                i++
            ) {

                if (
                    /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/
                        .test(
                            cleanUnlabeled[i]
                        )
                ) {

                    data.ssn =
                        extractSSN(
                            cleanUnlabeled[i]
                        );


                    cleanUnlabeled.splice(
                        i,
                        1
                    );


                    break;

                }

            }

        }


        return data;

    }


    /* =====================================================
       ASSIGN PARSED FIELD
       ===================================================== */

    function assignParsedField(
        data,
        field,
        value
    ) {

        value =
            normalizeText(value);


        switch (field) {

            case "firstName":

                data.firstName =
                    value;

                break;


            case "middleName":

                data.middleName =
                    value;

                break;


            case "lastName":

                data.lastName =
                    value;

                break;


            case "generation":

                data.generation =
                    value;

                break;


            case "address":

                data.address =
                    value;

                break;


            case "city":

                data.city =
                    value;

                break;


            case "state":

                data.state =
                    value
                        .toUpperCase();

                break;


            case "zip":

                data.zip =
                    extractZIP(value);

                break;


            case "dob":

                data.dob =
                    value;

                break;


            case "ssn":

                data.ssn =
                    extractSSN(value);

                break;


            case "email":

                data.email =
                    extractEmail(value);

                break;


            case "reportNumber":

                data.reportNumber =
                    value;

                break;

        }

    }


    /* =====================================================
       FIND LIKELY NAME
       ===================================================== */

    function findLikelyNameLine(lines) {

        for (
            let i = 0;
            i < lines.length;
            i++
        ) {

            const line =
                lines[i];


            /*
             * A name generally:
             *
             * Terrance DUDULA
             *
             * and does not contain:
             *
             * numbers
             * @
             * address indicators
             */

            if (
                /\d/.test(line)
            ) {

                continue;

            }


            if (
                /@/.test(line)
            ) {

                continue;

            }


            if (
                /\b(ST|STREET|AVE|AVENUE|RD|ROAD|BLVD|DR|DRIVE|LN|LANE|CT|COURT|HWY|HIGHWAY)\b/i
                    .test(line)
            ) {

                continue;

            }


            const words =
                line.split(/\s+/);


            if (
                words.length >= 2 &&
                words.length <= 4
            ) {

                return i;

            }

        }


        return -1;

    }


    /* =====================================================
       FIND LIKELY ADDRESS
       ===================================================== */

    function findLikelyAddressLine(lines) {

        const addressWords = [
            "ST",
            "STREET",
            "AVE",
            "AVENUE",
            "RD",
            "ROAD",
            "BLVD",
            "BOULEVARD",
            "DR",
            "DRIVE",
            "LN",
            "LANE",
            "CT",
            "COURT",
            "HWY",
            "HIGHWAY",
            "PKWY",
            "PARKWAY",
            "WAY",
            "PL",
            "PLACE",
            "CIR",
            "CIRCLE"
        ];


        for (
            let i = 0;
            i < lines.length;
            i++
        ) {

            const line =
                lines[i];


            if (
                !/^\d+\s+/.test(line)
            ) {

                continue;

            }


            const upper =
                line.toUpperCase();


            if (
                addressWords.some(
                    word =>
                        new RegExp(
                            "\\b" +
                            word +
                            "\\b"
                        ).test(upper)
                )
            ) {

                return i;

            }

        }


        /*
         * If it begins with a number,
         * it is still probably an address.
         */

        for (
            let i = 0;
            i < lines.length;
            i++
        ) {

            if (
                /^\d+\s+/.test(
                    lines[i]
                )
            ) {

                return i;

            }

        }


        return -1;

    }


    /* =====================================================
       PUT DATA INTO REVIEW PANEL
       ===================================================== */

    function setReviewField(
        field,
        value
    ) {

        const element =
            document.getElementById(
                REVIEW_FIELDS[field]
            );


        if (element) {

            element.value =
                value || "";

        }

    }


    /* =====================================================
       LOAD REVIEW PANEL
       ===================================================== */

    function loadReview(data) {

        Object.keys(
            REVIEW_FIELDS
        ).forEach(field => {

            setReviewField(
                field,
                data[field] || ""
            );

        });


        reviewPanel.style.display =
            "block";


        warning.style.display =
            "block";


        status.style.display =
            "block";


        status.textContent =
            "Data parsed. Review and edit the fields before filling the Experian form.";

    }


    /* =====================================================
       READ REVIEW PANEL
       ===================================================== */

    function readReview() {

        const data = {};


        Object.keys(
            REVIEW_FIELDS
        ).forEach(field => {

            const element =
                document.getElementById(
                    REVIEW_FIELDS[field]
                );


            data[field] =
                element
                    ? element.value.trim()
                    : "";

        });


        return data;

    }


    /* =====================================================
       SET EXPERIAN INPUT
       ===================================================== */

    function setInputValue(
        id,
        value
    ) {

        const element =
            document.getElementById(id);


        if (!element) {

            return false;

        }


        /*
         * Use the native setter.
         * This helps with older pages
         * that listen for input events.
         */

        const descriptor =
            Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                "value"
            );


        if (
            descriptor &&
            descriptor.set
        ) {

            descriptor.set.call(
                element,
                value || ""
            );

        } else {

            element.value =
                value || "";

        }


        element.dispatchEvent(
            new Event(
                "input",
                {
                    bubbles: true
                }
            )
        );


        element.dispatchEvent(
            new Event(
                "change",
                {
                    bubbles: true
                }
            )
        );


        element.dispatchEvent(
            new Event(
                "blur",
                {
                    bubbles: true
                }
            )
        );


        return true;

    }


    /* =====================================================
       SET SELECT VALUE
       ===================================================== */

    function setSelectValue(
        id,
        value
    ) {

        const select =
            document.getElementById(id);


        if (!select) {

            return false;

        }


        const wanted =
            String(value)
                .trim()
                .toLowerCase();


        for (
            const option of select.options
        ) {

            const optionValue =
                option.value
                    .trim()
                    .toLowerCase();

            const optionText =
                option.textContent
                    .trim()
                    .toLowerCase();


            if (
                optionValue === wanted ||
                optionText === wanted
            ) {

                select.value =
                    option.value;


                select.dispatchEvent(
                    new Event(
                        "change",
                        {
                            bubbles: true
                        }
                    )
                );


                select.dispatchEvent(
                    new Event(
                        "input",
                        {
                            bubbles: true
                        }
                    )
                );


                return true;

            }

        }


        return false;

    }


    /* =====================================================
       FILL SSN
       ===================================================== */

    function fillSSN(ssn) {

        const digits =
            String(ssn || "")
                .replace(/\D/g, "");


        if (
            digits.length !== 9
        ) {

            return false;

        }


        setInputValue(
            FIELD_IDS.ssn1,
            digits.substring(0, 3)
        );


        setInputValue(
            FIELD_IDS.ssn2,
            digits.substring(3, 5)
        );


        setInputValue(
            FIELD_IDS.ssn3,
            digits.substring(5, 9)
        );


        return true;

    }


    /* =====================================================
       FILL EXPERIAN FORM
       ===================================================== */

    function fillExperian(data) {

        const filled = [];

        const missing = [];


        /*
         * NAME
         */

        if (data.firstName) {

            if (
                setInputValue(
                    FIELD_IDS.firstName,
                    data.firstName
                )
            ) {

                filled.push(
                    "First Name"
                );

            }

        }


        if (data.middleName) {

            if (
                setInputValue(
                    FIELD_IDS.middleName,
                    data.middleName
                )
            ) {

                filled.push(
                    "Middle Initial"
                );

            }

        }


        if (data.lastName) {

            if (
                setInputValue(
                    FIELD_IDS.lastName,
                    data.lastName
                )
            ) {

                filled.push(
                    "Last Name"
                );

            }

        }


        /*
         * GENERATION
         */

        if (data.generation) {

            if (
                setSelectValue(
                    FIELD_IDS.generation,
                    data.generation
                )
            ) {

                filled.push(
                    "Generation"
                );

            } else {

                missing.push(
                    "Generation"
                );

            }

        }


        /*
         * ADDRESS
         */

        if (data.address) {

            if (
                setInputValue(
                    FIELD_IDS.address,
                    data.address
                )
            ) {

                filled.push(
                    "Address"
                );

            }

        }


        /*
         * CITY
         */

        if (data.city) {

            if (
                setInputValue(
                    FIELD_IDS.city,
                    data.city
                )
            ) {

                filled.push(
                    "City"
                );

            }

        }


        /*
         * STATE
         */

        if (data.state) {

            if (
                setSelectValue(
                    FIELD_IDS.state,
                    data.state
                )
            ) {

                filled.push(
                    "State"
                );

            } else {

                missing.push(
                    "State"
                );

            }

        }


        /*
         * ZIP
         */

        if (data.zip) {

            if (
                setInputValue(
                    FIELD_IDS.zip,
                    data.zip
                )
            ) {

                filled.push(
                    "ZIP"
                );

            }

        }


        /*
         * SSN
         */

        if (data.ssn) {

            if (
                fillSSN(
                    data.ssn
                )
            ) {

                filled.push(
                    "SSN"
                );

            } else {

                missing.push(
                    "SSN"
                );

            }

        }


        /*
         * EMAIL
         */

        if (data.email) {

            if (
                setInputValue(
                    FIELD_IDS.email,
                    data.email
                )
            ) {

                filled.push(
                    "Email"
                );

            }


            setInputValue(
                FIELD_IDS.emailConfirm,
                data.email
            );

        }


        /*
         * REPORT NUMBER
         */

        if (data.reportNumber) {

            if (
                setInputValue(
                    FIELD_IDS.reportNumber,
                    data.reportNumber
                )
            ) {

                filled.push(
                    "Report Number"
                );

            }

        }


        /*
         * TERMS
         */

        const terms =
            document.getElementById(
                FIELD_IDS.terms
            );


        if (
            terms &&
            !terms.checked
        ) {

            terms.click();

            filled.push(
                "Terms & Conditions"
            );

        }


        return {
            filled,
            missing
        };

    }


    /* =====================================================
       SHOW FILL RESULT
       ===================================================== */

    function showFillResult(result) {

        status.style.display =
            "block";


        let message =
            "<strong>Experian form updated.</strong>";


        if (
            result.filled.length
        ) {

            message +=
                "<br><br><strong>Filled:</strong> " +
                result.filled.join(", ");

        }


        if (
            result.missing.length
        ) {

            message +=
                "<br><br><strong>Not filled / needs attention:</strong> " +
                result.missing.join(", ");

        }


        status.innerHTML =
            message;

    }


    /* =====================================================
       CLEAR EVERYTHING
       ===================================================== */

    function clearEverything() {

        rawInput.value =
            "";


        Object.keys(
            REVIEW_FIELDS
        ).forEach(field => {

            const element =
                document.getElementById(
                    REVIEW_FIELDS[field]
                );


            if (element) {

                element.value =
                    "";

            }

        });


        reviewPanel.style.display =
            "none";


        warning.style.display =
            "none";


        status.style.display =
            "none";


        status.innerHTML =
            "";

    }


    /* =====================================================
       PARSE BUTTON
       ===================================================== */

    parseButton.addEventListener(
        "click",
        function () {

            const raw =
                rawInput.value.trim();


            if (!raw) {

                status.style.display =
                    "block";


                status.innerHTML =
                    "<strong>Paste client information first.</strong>";

                return;

            }


            const data =
                parseRawData(raw);


            console.log(
                "[Experian Parser] Parsed data:",
                data
            );


            loadReview(data);

        }
    );


    /* =====================================================
       FILL BUTTON
       ===================================================== */

    fillButton.addEventListener(
        "click",
        function () {

            const data =
                readReview();


            /*
             * Require basic identifying
             * information before filling.
             */

            if (
                !data.firstName ||
                !data.lastName
            ) {

                status.style.display =
                    "block";


                status.innerHTML =
                    "<strong>First Name and Last Name are required before filling.</strong>";

                return;

            }


            const result =
                fillExperian(data);


            showFillResult(result);

        }
    );


    /* =====================================================
       CLEAR BUTTON
       ===================================================== */

    clearButton.addEventListener(
        "click",
        clearEverything
    );


    /* =====================================================
       OPEN BUTTON
       ===================================================== */

    launchButton.addEventListener(
        "click",
        openPanel
    );


    /* =====================================================
       CLOSE BUTTON
       ===================================================== */

    closeButton.addEventListener(
        "click",
        closePanel
    );


    /* =====================================================
       CLICK OUTSIDE
       ===================================================== */

    overlay.addEventListener(
        "click",
        function (event) {

            if (
                event.target === overlay
            ) {

                closePanel();

            }

        }
    );


    /* =====================================================
       ESCAPE KEY
       ===================================================== */

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape" &&
                overlay.style.display === "flex"
            ) {

                closePanel();

            }

        }
    );


    /* =====================================================
       CTRL + ENTER = PARSE
       ===================================================== */

    rawInput.addEventListener(
        "keydown",
        function (event) {

            if (
                event.ctrlKey &&
                event.key === "Enter"
            ) {

                parseButton.click();

            }

        }
    );


    /* =====================================================
       PREVENT DUPLICATE INJECTION
       ===================================================== */

    console.log(
        "[Experian Parser] Loaded successfully."
    );

})();