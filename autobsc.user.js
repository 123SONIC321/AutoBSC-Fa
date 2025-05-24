// ==UserScript==
// @name         AutoBSC++Fa
// @namespace    https://github.com/123SONIC321
// @homepageURL  https://github.com/123SONIC321/AutoBSC-Fa
// @supportURL   https://github.com/123SONIC321/AutoBSC-Fa/issues
// @license      MIT
// @version      2.4.0
// @description  Auto completes Brawl Stars Championship live stream events
// @author       123SONIC321
// @match        https://event.supercell.com/brawlstars/*
// @icon         https://event.supercell.com/brawlstars/page-icon.ico
// @grant        none
// ==/UserScript==

function load(key, def) {
    let res = localStorage.getItem("autobsc-" + key)
	
    if (res === null) {
        store(key, def)
        return def
    } else {
        return JSON.parse(res)
    }
}

function store(key, val) {
    localStorage.setItem("autobsc-"+key, JSON.stringify(val))
}

// ==================== Begin AutoBSC Configuration ====================
// This is the default configuration
// load(config_key, default_value)
// Do not change the config key unless you know what you are doing

// Auto send cheer, +5 points
let cheerEnabled = load("cheer", true);

// Auto send poll (choosing MVP), always choose the first option, +100 points
let pollEnabled = load("poll", true);

// Auto send quiz, always choose correct option
let quizEnabled = load("quiz", true);

// Auto send match prediction
let matchPredictionEnabled = load("matchPrediction", false);

// Team selection strategy
// Can be 1 (select first team), 2 (select second team), rand (select random), maj (follow majority)
// This setting will only be used if match prediction is enabled
let matchPredictionStrategy = load("predictionStrategy", "maj")

// Auto collect lootdrops (randomly appearing 10 point drops)
let dropEnabled = load("drop", true);

// Auto collect sliders
let sliderEnabled = load("slider", true);

// Log events (such as sending cheer) to the feed
let feedLoggingEnabled = load("feedLogging", true);

// Remove cheer graphics (improves performance? haven't tested but pretty sure it does)
let lowDetail = load("lowDetail", false);

// Debug logging of websocket messages to console
let debug = false;

// ===================== End AutoBSC Configuration =====================

let feed;

function log(msg) {
  if (!feedLoggingEnabled) {
    return
  }
  if (!feed) {
    feed = document.getElementsByClassName("feed__content")[0];
    if (!feed) {return}
  }
  
  feed.children[feed.children.length - 2].insertAdjacentHTML("afterend", `<div data-v-d6e82d06="" data-v-e516d47b="" class="contentCardContainer" style="translate: none; rotate: none; scale: none; transform: translate(0px);">
    <div data-v-ff43890a="" data-v-d6e82d06="" class="baseCard baseCard--paper" radius="medium">
        <div data-v-d6e82d06="" class="contentCard contentCard--paper contentCard--isFullWidth contentCard--enabled">
            <div data-v-d6e82d06="" class="contentCard__gameBackground"></div>
            <div data-v-d6e82d06="" class="contentCard__slot">
                <div data-v-e516d47b="" class="rewardCard">
                    <div data-v-e516d47b="" class="rewardCard__rewardContainer">
                        <div data-v-e516d47b="" class="rewardCard__infoContainer">
                            <div data-v-e516d47b="" class="rewardCard__textContainer" style="opacity: 1;">
                                <div data-v-e516d47b="" class="rewardCard__textContainer__title">${msg}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>`)
};

function purge(elements) {
    for (let elem of elements) {
        try {
            elem.remove()
        } catch (e) {
            console.warn("[AutoBSC] Failed to remove element", elem, e)
        }
    }
}

// The rest of the code is not recommended to modify unless you know what you are doing
(function() {
  "use strict";

  let loaded = false;
  let conn
  let matchpredblue
  let matchpredred
  let predictions

  let lastCheerId = "";
  let lastPollId = "";
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
    const msg = JSON.parse(data)
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
          conn.textContent = event.payload.connectedClients
        }

        if (lowDetail) {
            purge(document.getElementsByClassName("Cheer__gradient"))
            purge(document.getElementsByClassName("Cheer__canvas"))
        }

        if (cheerEnabled && event.payload.typeId !== lastCheerId) {
          log("تشویق ارسال شد");

          setTimeout(() => {
            for (let btn of document.getElementsByClassName("cheer-btn-container__cheer-btn")) {
              btn.click()
            }
          }, 500)
          lastCheerId = event.payload.typeId
        }
      }

      if (messageType === "poll" && pollEnabled) {
        if (event.payload.typeId !== lastPollId) {
          log("ارسال نظرسنجی");

          setTimeout(() => {
            try {
              for (let que of document.getElementsByClassName("MultiChoiceQuestionCard")) {
                que.getElementsByTagName("button")[0].click()
              }
            } catch (e) {
              console.error("[AutoBSC]", e)
            }
          }, 3500);
          lastPollId = event.payload.typeId;
        }
      }

      if (messageType === "quiz" && quizEnabled) {
        if (event.payload.typeId !== lastQuizId) {
          log("پاسخگویی به سؤال");

          setTimeout(() => {
            for (let que of document.getElementsByClassName("baseCard")) {
              try {
                if (que.getElementsByClassName("cardRules__extraPoints").length === 0) {
                  continue
                }

                que.getElementsByClassName("MultiChoiceQuestionCard__button")[event.payload.correctAnswer.alternative].click()
              } catch (e) {
                console.error("[AutoBSC]", e)
              }
            }
          }, 3500);
          lastQuizId = event.payload.typeId;
        }
      }

      if (messageType === "match_prediction") {
        predictions = event.payload.answers
        if (matchpredblue) {
          matchpredblue.textContent = predictions["0"]
        }
        if (matchpredred) {
          matchpredred.textContent = predictions["1"]
        }
        if (matchPredictionEnabled && event.payload.typeId !== lastMatchPredictionId) {
          log("ارسال پیش‌بینی بازی");
          let team = 0
          setTimeout(() => {
            switch (matchPredictionStrategy) {
              case "2":
                team = 1
                break
              case "rand":
                team = Math.floor(Math.random() * 2)
                break
              case "maj":
                if (predictions["0"] > predictions["1"]) {
                  team = 0
                } else {
                  team = 1
                }
                break
              default:
                break
            }
            log(`ارسال پیش‌بینی نتیجۀ بازی برای تیم با رنگ ${team === 0 ? "آبی" : "قرمز"}`)
            for (let a of document.getElementsByClassName("MatchPredictionQuestionCard__buttonGroup")) {
              try {
                a.getElementsByTagName("button")[team].click()
              } catch (e) {
                console.error("[AutoBSC]", e)
              }
            }
          }, 10000);

          lastMatchPredictionId = event.payload.typeId
        }
      }

      if (messageType === "loot_drop" && dropEnabled) {
        if (event.payload.typeId !== lastDropId) {
          log("دریافت لوت دراپ")

          setTimeout(() => {
            for (let drop of document.getElementsByClassName("LootDropCard")) {
              try {
                drop.getElementsByClassName("RectangleButton")[0].click()
              } catch (e) {
                console.error("[AutoBSC]", e)
              }
            }
            lastDropId = event.payload.typeId
          }, 2000)
        }
      }
	  
      if (messageType === "slider" && sliderEnabled) {
        if (event.payload.typeId !== lastSliderId) {
          log("دریافت لغزنده")
		  
          setTimeout(() => {
            for (let drop of document.getElementsByClassName("SliderQuestionCard")) {
              try {
                let elem = drop.getElementsByTagName("input")[0]
                elem.value = "100"
                elem.dispatchEvent(new InputEvent("input"))
                elem.dispatchEvent(new Event("change"))
              } catch (e) {
                console.error("[AutoBSC]", e)
              }
            }
            lastSliderId = event.payload.typeId
          }, 2000)
        }
      }
    })
  }

  function setupAutoBsc() {
    loaded = true;

    console.log("[AutoBSC] AutoBSC با موفقیت بارگزاری شد");

    const interval = setInterval(() => {
      const div = document.getElementsByClassName("feed__content")[0];
      if (div) {
        div.insertAdjacentHTML("afterbegin", loadedMessageHtml);
        clearInterval(interval);
      }
    }, 500);

    document.body.insertAdjacentHTML("afterbegin", `
<style>
#autobsc-overlay > details[open] {
   width: 20rem;
}

.autobsc-config-container {
    width: 15rem;
    padding-bottom: 0.15rem;
}

.autobsc-config-container > input[type=checkbox] {
    float: right;
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
  <div style="padding: 1rem;">AutoBSC++</div>
</summary>

<div style="display: grid; justify-content: center; margin-bottom: .5rem;">
<div>
  <div style="margin-bottom: .5rem">
    <h1>داده‌ها</h1>
    متصل به: <span id="autobsc-connected">unknown</span>
  </div>

  <div style="margin-bottom: .5rem;">
    <h3>پیش‌بینی‌ها</h3>
    آبی: <span id="autobsc-pick-blue">unknown</span><br>
    قرمز: <span id="autobsc-pick-red">unknown</span>
  </div>

  <h1>پیکربندی</h1>
  <div class="autobsc-config-container">تشویق خودکار <input type="checkbox" id="autobsc-cheer"></div>

  <div class="autobsc-config-container">پاسخگویی به نظرسنجی‌ها <input type="checkbox" id="autobsc-poll"></div>

  <div class="autobsc-config-container">پاسخگویی به سؤالات <input type="checkbox" id="autobsc-quiz"></div>

  <div class="autobsc-config-container">پاسخگویی به لغزنده <input type="checkbox" id="autobsc-slider"></div>
  
  <div class="autobsc-config-container">دریافت لوت دراپ‌ها <input type="checkbox" id="autobsc-lootdrop"></div>

  <div class="autobsc-config-container">ثبت پیش‌بینی <input type="checkbox" id="autobsc-predict"></div>

  <div class="autobsc-config-container">نحوه‌ی انتخاب پیش‌بینی <select style="width: 3.825rem;" id="autobsc-predict-strat">
  <option value="1">فقط تیم با رنگ آبی</option>
  <option value="2">فقط تیم با رنگ قرمز</option>
  <option value="rand">تصادفی</option>
  <option value="maj">هر تیمی که رأی بیشتری داشت</option>
</select></div>

  <div class="autobsc-config-container">نمایش رویداد‌ها <input type="checkbox" id="autobsc-feedlogging"></div>
  <div class="autobsc-config-container">حالت جزئیات کم <input type="checkbox" id="autobsc-lowdetail"></div>

  <button style="background-color: red; border: none; color: white;" onclick='if (confirm("آیا مطمئن هستید؟ شما فقط با رفرش کردن صفحه می‌توانید به این منو دوباره دسترسی داشته باشید")) document.getElementById("autobsc-overlay").remove()'>مخفی کردن منو</button>

</div>
</div>
</details></div>
    `)
    dragElement(document.getElementById("autobsc-overlay"))

    const elems = {
      cheer: document.getElementById("autobsc-cheer"),
      poll: document.getElementById("autobsc-poll"),
      quiz: document.getElementById("autobsc-quiz"),
	  slider: document.getElementById("autobsc-slider"),
      lootdrop: document.getElementById("autobsc-lootdrop"),
      predict: document.getElementById("autobsc-predict"),
      predictstrat: document.getElementById("autobsc-predict-strat"),
      feedlogging: document.getElementById("autobsc-feedlogging"),
      lowdetail: document.getElementById("autobsc-lowdetail")
    }

    elems.cheer.checked = cheerEnabled
    elems.poll.checked = pollEnabled
    elems.quiz.checked = quizEnabled
	elems.slider.checked = sliderEnabled
    elems.predict.checked = matchPredictionEnabled
    elems.lootdrop.checked = dropEnabled
    elems.feedlogging.checked = feedLoggingEnabled

    elems.predictstrat.value = matchPredictionStrategy
    elems.lowdetail.checked = lowDetail

    elems.cheer.onchange = function(e) {
      cheerEnabled = e.target.checked
	  store("cheer", cheerEnabled)
    }
    elems.poll.onchange = function(e) {
      pollEnabled = e.target.checked
	  store("poll", pollEnabled)
    }
    elems.quiz.onchange = function(e) {
      quizEnabled = e.target.checked
	  store("quiz", quizEnabled)
    }
    elems.slider.onchange = function(e) {
      sliderEnabled = e.target.checked
      store("slider", sliderEnabled)
    }
    elems.predict.onchange = function(e) {
      matchPredictionEnabled = e.target.checked
	  store("matchPrediction", matchPredictionEnabled)
    }
    elems.lootdrop.onchange = function(e) {
      dropEnabled = e.target.checked
	  store("drop", dropEnabled)
    }
    elems.feedlogging.onchange = function(e) {
      feedLoggingEnabled = e.target.checked
	  store("feedLogging", feedLoggingEnabled)
    }

    elems.predictstrat.onchange = function(e) {
      matchPredictionStrategy = e.target.value
	  store("predictionStrategy", matchPredictionStrategy)
    }

    elems.lowdetail.onchange = function(e) {
        lowDetail = e.target.checked
		store("lowDetail", lowDetail)
        if (!lowDetail) {
            return
        }
        purge(document.getElementsByClassName("Cheer__gradient"))
        purge(document.getElementsByClassName("Cheer__canvas"))
    }

    conn = document.getElementById("autobsc-connected")
    matchpredblue = document.getElementById("autobsc-pick-blue")
    matchpredred = document.getElementById("autobsc-pick-red")
  }

  const loadedMessageHtml = `<div data-v-d6e82d06="" data-v-e516d47b="" class="contentCardContainer" with-extra-top-margin="" style="translate: none; rotate: none; scale: none; transform: translate(0px); opacity: 1; --d480f784: #1743CA;">
    <div data-v-ff43890a="" data-v-d6e82d06="" class="baseCard baseCard--paper" radius="medium">
        <div data-v-ff43890a="" class="baseCard__cardBackground baseCard__cardBackground--paper-1"></div>
        <div data-v-d6e82d06="" class="contentCard contentCard--paper contentCard--isFullWidth contentCard--enabled"><!---->
            <div data-v-d6e82d06="" class="contentCard__gameBackground"></div><!---->
            <div data-v-d6e82d06="" class="contentCard__slot">
                <div data-v-e516d47b="" class="rewardCard">
                    <div data-v-e516d47b="" class="rewardCard__rewardContainer">
                        <div data-v-e516d47b="" class="rewardCard__reward" style="translate: none; rotate: none; scale: none; transform: translate(0px);">
                            <picture data-v-5c78b667="" data-v-e516d47b="" class="cms-image cms-image--fullWidth cms-image--loaded cms-image--fullWidth">
                                <source data-v-5c78b667="" type="image/avif" srcset="https://event.supercell.com/brawlstars/assets/proPass/7b4PejzuA1AbEMP3AhYF4g.avif">
                                <source data-v-5c78b667="" type="image/webp" srcset="https://event.supercell.com/brawlstars/assets/proPass/7b4PejzuA1AbEMP3AhYF4g.webp"><img data-v-5c78b667="" src="https://event.supercell.com/brawlstars/assets/proPass/7b4PejzuA1AbEMP3AhYF4g.png" class="cms-image cms-image--fullWidth cms-image--loaded cms-image--fullWidth" loading="lazy">
                            </picture>
                        </div>
                        <div data-v-e516d47b="" class="rewardCard__infoContainer">
                            <div data-v-e516d47b="" class="rewardCard__textContainer" style="opacity: 1;">
                                <div data-v-e516d47b="" class="rewardCard__textContainer__title">AutoBSC++ بارگزاری شد</div>
                                <div data-v-e516d47b="" class="rewardCard__textContainer__subTitle">made by laptopcat (translated by 123SONIC321)</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div><!---->
        </div>
        <figure data-v-ff43890a="" class="baseCard__corner baseCard__corner--top-left"></figure><!----><!---->
        <figure data-v-ff43890a="" class="baseCard__corner baseCard__corner--bottom-right"></figure>
    </div><!---->
</div>`;
})();

function dragElement(elmnt) {
  var pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;

  let dragger = document.getElementById(elmnt.id + "header") ?? elmnt
  dragger.onmousedown = dragMouseDown

  function dragMouseDown(e) {
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    dragger.setAttribute("drag", "")
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    setTimeout(() => dragger.removeAttribute("drag"), 100)
    document.onmouseup = null
    document.onmousemove = null
  }
}
