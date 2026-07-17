// ==UserScript==
// @name         AutoBSC++Fa
// @namespace    https://github.com/123SONIC321
// @homepageURL  https://github.com/123SONIC321/AutoBSC-Fa
// @supportURL   https://github.com/123SONIC321/AutoBSC-Fa/issues
// @license      MIT
// @version      3.0.1
// @description  Auto completes Brawl Stars Championship live stream events
// @author       123SONIC321
// @match        https://event.supercell.com/brawlstars/*
// @icon         https://event.supercell.com/brawlstars/page-icon.ico
// @grant        none
// ==/UserScript==

function load(key, def) {
    let res = localStorage.getItem("autobsc-" + key);
    if (res === null) {
        store(key, def);
        return def;
    } else {
        return JSON.parse(res);
    }
}

function store(key, val) {
    localStorage.setItem("autobsc-" + key, JSON.stringify(val));
}

let cheerEnabled = load("cheer", true);
let pollEnabled = load("poll", true);
let quizEnabled = load("quiz", true);
let matchPredictionEnabled = load("matchPrediction", false);
let matchPredictionStrategy = load("predictionStrategy", "maj");
let dropEnabled = load("drop", true);
let sliderEnabled = load("slider", true);
let feedLoggingEnabled = load("feedLogging", true);
let dynamicLogging = load("dynamicLogging", true);
let lowDetail = load("lowDetail", false);
let debug = false;
let feed;

function log(msg, id) {
    if (!feedLoggingEnabled) {
        return;
    }
    if (!feed) {
        feed = document.getElementsByClassName("feed__content")[0];
        if (!feed) { return; }
    }
    if (id) {
        let existing = document.getElementById(id);
        if (existing) {
            let title = existing.getElementsByClassName("rewardCard__textContainer__title")[0];
            if (title) {
                title.textContent = msg;
                return;
            }
        }
    }
    let cardIdAttr = id ? `id="${id}"` : '';
    feed.children[feed.children.length - 2].insertAdjacentHTML("afterend", `<div data-v-6ab4ab95="" data-v-e989f123="" ${cardIdAttr}>
    <div data-v-307c1ac7="" data-v-6ab4ab95="" class="contentCardContainer" with-extra-top-margin="" style="translate: none; rotate: none; scale: none; transform: translate3d(0px, 0px, 0px); opacity: 1; --v3ee5afce: #245fc1;">
        <div data-v-615f3480="" data-v-307c1ac7="" class="baseCard baseCard--paper" radius="medium">
            <div data-v-615f3480="" class="baseCard__cardBackground baseCard__cardBackground--paper-3"></div>
            <div data-v-307c1ac7="" class="contentCard contentCard--paper contentCard--isFullWidth contentCard--enabled">
                <div data-v-307c1ac7="" class="contentCard__gameBackground"></div>
                <div data-v-307c1ac7="" class="contentCard__slot">
                    <div data-v-6ab4ab95="" class="rewardCard">
                        <div data-v-6ab4ab95="" class="rewardCard__rewardContainer">
                            <div data-v-6ab4ab95="" class="rewardCard__infoContainer">
                                <div data-v-6ab4ab95="" class="rewardCard__textContainer" style="opacity: 1;">
                                    <div data-v-6ab4ab95="" class="rewardCard__textContainer__title">${msg}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <figure data-v-615f3480="" class="baseCard__corner baseCard__corner--topLeft"></figure>
            <figure data-v-615f3480="" class="baseCard__corner baseCard__corner--bottomRight"></figure>
        </div>
    </div>
</div>`);
    feed.children[feed.children.length - 2].scrollIntoView();
}

function purge(elements) {
    for (let elem of elements) {
        try {
            elem.remove();
        } catch (e) {
            console.warn("[AutoBSC] Failed to remove element", elem, e);
        }
    }
}

(function() {
    "use strict";

    let loaded = false;
    let conn;
    let matchpredblue;
    let matchpredred;
    let predictions;

    let lastCheerId = "";
    let lastPollId = "";
    let lastImagePollId = "";
    let lastQuizId = "";
    let lastDropId = "";
    let lastMatchPredictionId = "";
    let lastSliderId = "";

    const OriginalWebSocket = window.WebSocket;

    class PatchedWebSocket extends OriginalWebSocket {
        constructor(...args) {
            super(...args);
            const originalGet = Object.getOwnPropertyDescriptor(OriginalWebSocket.prototype, "onmessage").get;
            const originalSet = Object.getOwnPropertyDescriptor(OriginalWebSocket.prototype, "onmessage").set;

            Object.defineProperty(this, "onmessage", {
                configurable: true,
                enumerable: true,
                get() {
                    return originalGet.call(this);
                },
                set(newOnMessage) {
                    const onMessage = (event) => {
                        parse(event.data, this);
                        newOnMessage(event);
                    };
                    originalSet.call(this, onMessage);
                },
            });

            const originalSend = this.send;
            this.send = function(data) {
                if (debug) {
                    const parsed = JSON.parse(data);
                    console.log("[AutoBSC] Sending message:", data, parsed);
                }
                originalSend.call(this, data);
            };
        }
    }

    window.WebSocket = PatchedWebSocket;

    function parse(data, ws) {
        const msg = JSON.parse(data);
        if (debug) {
            console.log("[AutoBSC] Received message:", msg, data);
        }

        msg.forEach(event => {
            const messageType = event.messageType;
            if (messageType === "global_state" && !loaded) {
                setupAutoBsc();
            }

            if (messageType === "cheer") {
                if (conn) {
                    conn.textContent = event.payload.connectedClients;
                }

                if (lowDetail) {
                    purge(document.getElementsByClassName("cheer__gradient"));
                    purge(document.getElementsByClassName("cheer__canvas"));
                }

                if (cheerEnabled && event.payload.typeId !== lastCheerId) {
                    let cardId = "autobsc-log-cheer-" + Date.now();
                    if (dynamicLogging) {
                        log("در حال ارسال تشویق...", cardId);
                        setTimeout(() => {
                            for (let btn of document.getElementsByClassName("cheerButtonContainer__cheerButton")) {
                                btn.click();
                            }
                            log("تشویق ارسال شد", cardId);
                        }, 1500);
                    } else {
                        log("تشویق ارسال شد");
                        setTimeout(() => {
                            for (let btn of document.getElementsByClassName("cheerButtonContainer__cheerButton")) {
                                btn.click();
                            }
                        }, 1500);
                    }
                    lastCheerId = event.payload.typeId;
                }
            }

            if (messageType === "poll" && pollEnabled) {
                if (event.payload.typeId !== lastPollId) {
                    let cardId = "autobsc-log-poll-" + Date.now();
                    if (dynamicLogging) {
                        log("در حال پاسخگویی به نظرسنجی...", cardId);
                        setTimeout(() => {
                            try {
                                for (let que of document.getElementsByClassName("multiChoiceQuestionCard")) {
                                    que.getElementsByTagName("button")[0].click();
                                }
                                for (let que of document.getElementsByClassName("cardImagePoll")) {
                                    que.getElementsByTagName("button")[0].click();
                                }
                            } catch (e) {
                                console.error("[AutoBSC]", e);
                            }
                            log("نظرسنجی ارسال شد", cardId);
                        }, 3500);
                    } else {
                        log("ارسال نظرسنجی");
                        setTimeout(() => {
                            try {
                                for (let que of document.getElementsByClassName("multiChoiceQuestionCard")) {
                                    que.getElementsByTagName("button")[0].click();
                                }
                                for (let que of document.getElementsByClassName("cardImagePoll")) {
                                    que.getElementsByTagName("button")[0].click();
                                }
                            } catch (e) {
                                console.error("[AutoBSC]", e);
                            }
                        }, 3500);
                    }
                    lastPollId = event.payload.typeId;
                }
            }

            if (messageType === "image_poll" && pollEnabled) {
                if (event.payload.typeId !== lastImagePollId) {
                    let cardId = "autobsc-log-imgpoll-" + Date.now();
                    if (dynamicLogging) {
                        log("در حال پاسخگویی به نظرسنجی تصویری...", cardId);
                        setTimeout(() => {
                            try {
                                for (let que of document.getElementsByClassName("cardImagePoll")) {
                                    que.getElementsByTagName("button")[0].click();
                                }
                            } catch (e) {
                                console.error("[AutoBSC]", e);
                            }
                            log("نظرسنجی تصویری ارسال شد", cardId);
                        }, 3500);
                    } else {
                        log("ارسال نظرسنجی تصویری");
                        setTimeout(() => {
                            try {
                                for (let que of document.getElementsByClassName("cardImagePoll")) {
                                    que.getElementsByTagName("button")[0].click();
                                }
                            } catch (e) {
                                console.error("[AutoBSC]", e);
                            }
                        }, 3500);
                    }
                    lastImagePollId = event.payload.typeId;
                }
            }

            if (messageType === "quiz" && quizEnabled) {
                if (event.payload.typeId !== lastQuizId) {
                    let cardId = "autobsc-log-quiz-" + Date.now();
                    if (dynamicLogging) {
                        log("در حال پاسخگویی به سؤال...", cardId);
                        setTimeout(() => {
                            for (let que of document.getElementsByClassName("baseCard")) {
                                try {
                                    if (que.getElementsByClassName("cardRules__extraPointsLabel").length === 0) {
                                        continue;
                                    }
                                    que.getElementsByClassName("multiChoiceQuestionCard__button")[event.payload.correctAnswer.alternative].click();
                                } catch (e) {
                                    console.error("[AutoBSC]", e);
                                }
                            }
                            log("پاسخگویی به سؤال انجام شد", cardId);
                        }, 3500);
                    } else {
                        log("پاسخگویی به سؤال");
                        setTimeout(() => {
                            for (let que of document.getElementsByClassName("baseCard")) {
                                try {
                                    if (que.getElementsByClassName("cardRules__extraPointsLabel").length === 0) {
                                        continue;
                                    }
                                    que.getElementsByClassName("multiChoiceQuestionCard__button")[event.payload.correctAnswer.alternative].click();
                                } catch (e) {
                                    console.error("[AutoBSC]", e);
                                }
                            }
                        }, 3500);
                    }
                    lastQuizId = event.payload.typeId;
                }
            }

            if (messageType === "match_prediction") {
                predictions = event.payload.answers;
                if (matchpredblue) {
                    matchpredblue.textContent = predictions["0"];
                }
                if (matchpredred) {
                    matchpredred.textContent = predictions["1"];
                }
                if (matchPredictionEnabled && event.payload.typeId !== lastMatchPredictionId) {
                    let cardId = "autobsc-log-predict-" + Date.now();
                    if (dynamicLogging) {
                        log("در حال ثبت پیش‌بینی بازی...", cardId);
                        let team = 0;
                        setTimeout(() => {
                            switch (matchPredictionStrategy) {
                                case "2":
                                    team = 1;
                                    break;
                                case "rand":
                                    team = Math.floor(Math.random() * 2);
                                    break;
                                case "maj":
                                    if (predictions["0"] > predictions["1"]) {
                                        team = 0;
                                    } else {
                                        team = 1;
                                    }
                                    break;
                                default:
                                    break;
                            }
                            log(`ثبت پیش‌بینی نتیجۀ بازی برای تیم با رنگ ${team === 0 ? "آبی" : "قرمز"} انجام شد`, cardId);
                            for (let a of document.getElementsByClassName("matchPredictionQuestionCard__buttonGroup")) {
                                try {
                                    a.getElementsByTagName("button")[team].click();
                                } catch (e) {
                                    console.error("[AutoBSC]", e);
                                }
                            }
                        }, 10000);
                    } else {
                        log("ارسال پیش‌بینی بازی");
                        let team = 0;
                        setTimeout(() => {
                            switch (matchPredictionStrategy) {
                                case "2":
                                    team = 1;
                                    break;
                                case "rand":
                                    team = Math.floor(Math.random() * 2);
                                    break;
                                case "maj":
                                    if (predictions["0"] > predictions["1"]) {
                                        team = 0;
                                    } else {
                                        team = 1;
                                    }
                                    break;
                                default:
                                    break;
                            }
                            log(`ارسال پیش‌بینی نتیجۀ بازی برای تیم با رنگ ${team === 0 ? "آبی" : "قرمز"}`);
                            for (let a of document.getElementsByClassName("matchPredictionQuestionCard__buttonGroup")) {
                                try {
                                    a.getElementsByTagName("button")[team].click();
                                } catch (e) {
                                    console.error("[AutoBSC]", e);
                                }
                            }
                        }, 10000);
                    }
                    lastMatchPredictionId = event.payload.typeId;
                }
            }

            if (messageType === "loot_drop" && dropEnabled) {
                if (event.payload.typeId !== lastDropId) {
                    let cardId = "autobsc-log-drop-" + Date.now();
                    if (dynamicLogging) {
                        log("در حال دریافت لوت دراپ...", cardId);
                        setTimeout(() => {
                            for (let drop of document.getElementsByClassName("lootDropCard")) {
                                try {
                                    drop.getElementsByClassName("rectangleButton")[0].click();
                                } catch (e) {
                                    console.error("[AutoBSC]", e);
                                }
                            }
                            log("لوت دراپ دریافت شد", cardId);
                        }, 2000);
                    } else {
                        log("دریافت لوت دراپ");
                        setTimeout(() => {
                            for (let drop of document.getElementsByClassName("lootDropCard")) {
                                try {
                                    drop.getElementsByClassName("rectangleButton")[0].click();
                                } catch (e) {
                                    console.error("[AutoBSC]", e);
                                }
                            }
                        }, 2000);
                    }
                    lastDropId = event.payload.typeId;
                }
            }

            if (messageType === "slider" && sliderEnabled) {
                if (event.payload.typeId !== lastSliderId) {
                    let cardId = "autobsc-log-slider-" + Date.now();
                    if (dynamicLogging) {
                        log("در حال پاسخ به اسلایدر...", cardId);
                        setTimeout(() => {
                            for (let drop of document.getElementsByClassName("sliderQuestionCard")) {
                                try {
                                    let elem = drop.getElementsByTagName("input")[0];
                                    elem.value = "100";
                                    elem.dispatchEvent(new InputEvent("input"));
                                    elem.dispatchEvent(new Event("change"));
                                } catch (e) {
                                    console.error("[AutoBSC]", e);
                                }
                            }
                            log("پاسخ به اسلایدر انجام شد", cardId);
                        }, 2000);
                    } else {
                        log("پاسخ به اسلایدر");
                        setTimeout(() => {
                            for (let drop of document.getElementsByClassName("sliderQuestionCard")) {
                                try {
                                    let elem = drop.getElementsByTagName("input")[0];
                                    elem.value = "100";
                                    elem.dispatchEvent(new InputEvent("input"));
                                    elem.dispatchEvent(new Event("change"));
                                } catch (e) {
                                    console.error("[AutoBSC]", e);
                                }
                            }
                        }, 2000);
                    }
                    lastSliderId = event.payload.typeId;
                }
            }
        });
    }

    function setupAutoBsc() {
        loaded = true;
        console.log("[AutoBSC] AutoBSC با موفقیت بارگذاری شد");

        const interval = setInterval(() => {
            const div = document.getElementsByClassName("feed__content")[0];
            if (div) {
                div.insertAdjacentHTML("afterbegin", loadedMessageHtml);
                clearInterval(interval);
            }
        }, 500);

        document.body.insertAdjacentHTML("afterbegin", `
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap');

    #autobsc-overlay, #autobsc-overlay *, [id^="autobsc-log-"] * {
        font-family: 'Vazirmatn', sans-serif !important;
    }
    #autobsc-overlay {
        direction: rtl !important;
        text-align: right !important;
    }
    #autobsc-overlay > details[open] {
       width: 20rem;
    }
    .autobsc-config-container {
        width: 15rem;
        padding-bottom: 0.15rem;
    }
    .autobsc-config-container > input[type=checkbox] {
        float: left;
        position: relative;
        top: 0.15rem;
    }
    .Video__InteractionBlocker, .VideoCover.VideoCover--hidden {
        all: unset !important;
        display: none;
    }
    </style>
    <div id="autobsc-overlay" style="position: absolute; top: 20%; z-index: 99999999; background: antiquewhite">
    <details>
    <summary style="list-style: none;" id="autobsc-overlayheader" onclick="if (getAttribute('drag') === '') event.preventDefault()">
      <div style="padding: 1rem; font-weight: 700;">AutoBSC++</div>
    </summary>
    <div style="display: grid; justify-content: center; margin-bottom: .5rem;">
    <div>
      <div style="margin-bottom: .5rem">
        <h1 style="font-size: 1.2rem; font-weight: 700;">داده‌ها</h1>
        تعداد کاربران آنلاین: <span id="autobsc-connected">unknown</span>
      </div>
      <div style="margin-bottom: .5rem;">
        <h3 style="font-weight: 700;">پیش‌بینی‌ها</h3>
        آبی: <span id="autobsc-pick-blue">unknown</span><br>
        قرمز: <span id="autobsc-pick-red">unknown</span>
      </div>
      <h1 style="font-size: 1.2rem; font-weight: 700;">پیکربندی</h1>
      <div class="autobsc-config-container">تشویق خودکار <input type="checkbox" id="autobsc-cheer"></div>
      <div class="autobsc-config-container">پاسخگویی به نظرسنجی‌ها <input type="checkbox" id="autobsc-poll"></div>
      <div class="autobsc-config-container">پاسخگویی به سؤالات <input type="checkbox" id="autobsc-quiz"></div>
      <div class="autobsc-config-container">پاسخ به اسلایدر <input type="checkbox" id="autobsc-slider"></div>
      <div class="autobsc-config-container">دریافت لوت دراپ‌ها <input type="checkbox" id="autobsc-lootdrop"></div>
      <div class="autobsc-config-container">ثبت پیش‌بینی <input type="checkbox" id="autobsc-predict"></div>
      <div class="autobsc-config-container">نحوه‌ی انتخاب پیش‌بینی <select style="width: 6.5rem; font-family: 'Vazirmatn', sans-serif;" id="autobsc-predict-strat">
      <option value="1">فقط تیم آبی</option>
      <option value="2">فقط تیم قرمز</option>
      <option value="rand">تصادفی</option>
      <option value="maj">اکثریت آرا</option>
    </select></div>
      <div class="autobsc-config-container">نمایش رویداد‌ها <input type="checkbox" id="autobsc-feedlogging"></div>
      <div class="autobsc-config-container">لاگ پویا (بروزرسانی زنده) <input type="checkbox" id="autobsc-dynamiclogging"></div>
      <div class="autobsc-config-container">حالت جزئیات کم <input type="checkbox" id="autobsc-lowdetail"></div>
      <button style="background-color: red; border: none; color: white; font-family: 'Vazirmatn', sans-serif; cursor: pointer; margin-top: 0.5rem; padding: 0.2rem 0.5rem;" onclick='if (confirm("آیا مطمئن هستید؟ شما فقط با رفرش کردن صفحه می‌توانید به این منو دوباره دسترسی داشته باشید")) document.getElementById("autobsc-overlay").remove()'>مخفی کردن منو</button>
    </div>
    </div>
    </details></div>
        `);

        dragElement(document.getElementById("autobsc-overlay"));

        const elems = {
            cheer: document.getElementById("autobsc-cheer"),
            poll: document.getElementById("autobsc-poll"),
            quiz: document.getElementById("autobsc-quiz"),
            slider: document.getElementById("autobsc-slider"),
            lootdrop: document.getElementById("autobsc-lootdrop"),
            predict: document.getElementById("autobsc-predict"),
            predictstrat: document.getElementById("autobsc-predict-strat"),
            feedlogging: document.getElementById("autobsc-feedlogging"),
            dynamiclogging: document.getElementById("autobsc-dynamiclogging"),
            lowdetail: document.getElementById("autobsc-lowdetail")
        };

        elems.cheer.checked = cheerEnabled;
        elems.poll.checked = pollEnabled;
        elems.quiz.checked = quizEnabled;
        elems.slider.checked = sliderEnabled;
        elems.predict.checked = matchPredictionEnabled;
        elems.lootdrop.checked = dropEnabled;
        elems.feedlogging.checked = feedLoggingEnabled;
        elems.dynamiclogging.checked = dynamicLogging;
        elems.predictstrat.value = matchPredictionStrategy;
        elems.lowdetail.checked = lowDetail;

        elems.cheer.onchange = function(e) {
            cheerEnabled = e.target.checked;
            store("cheer", cheerEnabled);
        };
        elems.poll.onchange = function(e) {
            pollEnabled = e.target.checked;
            store("poll", pollEnabled);
        };
        elems.quiz.onchange = function(e) {
            quizEnabled = e.target.checked;
            store("quiz", quizEnabled);
        };
        elems.slider.onchange = function(e) {
            sliderEnabled = e.target.checked;
            store("slider", sliderEnabled);
        };
        elems.predict.onchange = function(e) {
            matchPredictionEnabled = e.target.checked;
            store("matchPrediction", matchPredictionEnabled);
        };
        elems.lootdrop.onchange = function(e) {
            dropEnabled = e.target.checked;
            store("drop", dropEnabled);
        };
        elems.feedlogging.onchange = function(e) {
            feedLoggingEnabled = e.target.checked;
            store("feedLogging", feedLoggingEnabled);
        };
        elems.dynamiclogging.onchange = function(e) {
            dynamicLogging = e.target.checked;
            store("dynamicLogging", dynamicLogging);
        };
        elems.predictstrat.onchange = function(e) {
            matchPredictionStrategy = e.target.value;
            store("predictionStrategy", matchPredictionStrategy);
        };
        elems.lowdetail.onchange = function(e) {
            lowDetail = e.target.checked;
            store("lowDetail", lowDetail);
            if (!lowDetail) {
                return;
            }
            purge(document.getElementsByClassName("cheer__gradient"));
            purge(document.getElementsByClassName("cheer__canvas"));
        };

        conn = document.getElementById("autobsc-connected");
        matchpredblue = document.getElementById("autobsc-pick-blue");
        matchpredred = document.getElementById("autobsc-pick-red");
    }

    const loadedMessageHtml = `<div data-v-6ab4ab95="" data-v-e989f123="" id="card-unlockReward-0">
    <div data-v-307c1ac7="" data-v-6ab4ab95="" class="contentCardContainer" with-extra-top-margin="" style="translate: none; rotate: none; scale: none; transform: translate3d(0px, 0px, 0px); opacity: 1; --v3ee5afce: #245fc1;">
        <div data-v-615f3480="" data-v-307c1ac7="" class="baseCard baseCard--paper" radius="medium">
            <div data-v-615f3480="" class="baseCard__cardBackground baseCard__cardBackground--paper-3"></div>
            <div data-v-307c1ac7="" class="contentCard contentCard--paper contentCard--isFullWidth contentCard--enabled">
                <div data-v-307c1ac7="" class="contentCard__gameBackground"></div>
                <div data-v-307c1ac7="" class="contentCard__slot">
                    <div data-v-6ab4ab95="" class="rewardCard">
                        <div data-v-6ab4ab95="" class="rewardCard__rewardContainer">
                            <div data-v-6ab4ab95="" class="rewardCard__reward" style="translate: none; rotate: none; scale: none; transform: translate3d(0px, -1.3431px, 0px);">
                                <picture data-v-58643600="" data-v-6ab4ab95="" class="cmsImage cmsImage--loaded cmsImage--fullWidth"><img data-v-58643600="" class="cmsImage cmsImage--loaded cmsImage--fullWidth" src="https://event.supercell.com/brawlstars/assets/rewards/images/7emETQCs7gjPr7rg1VJyFa.svg" loading="lazy"></picture>
                            </div>
                            <div data-v-6ab4ab95="" class="rewardCard__infoContainer">
                                <div data-v-6ab4ab95="" class="rewardCard__textContainer" style="opacity: 1;">
                                    <div data-v-6ab4ab95="" class="rewardCard__textContainer__title">AutoBSC++ بارگذاری شد</div>
                                    <div data-v-6ab4ab95="" class="rewardCard__textContainer__subTitle">made by laptopcat (translated by 123SONIC321)</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <figure data-v-615f3480="" class="baseCard__corner baseCard__corner--topLeft"></figure>
            <figure data-v-615f3480="" class="baseCard__corner baseCard__corner--bottomRight"></figure>
        </div>
    </div>
</div>`;
})();

function dragElement(elmnt) {
    var pos1 = 0,
        pos2 = 0,
        pos3 = 0,
        pos4 = 0;
    let dragger = document.getElementById(elmnt.id + "header") ?? elmnt;
    dragger.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        dragger.setAttribute("drag", "");
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        setTimeout(() => dragger.removeAttribute("drag"), 100);
        document.onmouseup = null;
        document.onmousemove = null;
    }
}
