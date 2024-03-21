// ==UserScript==
// @name         Steam赛博父子鉴定 (游戏库筛选)
// @license      MIT
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  帮助大家找到心仪的赛博义父
// @author       Rawwiin
// @match        https://steamcommunity.com/id/*/games/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_xmlhttpRequest
// ==/UserScript==

const url_my_wishlist = "https://steamcommunity.com/my/wishlist/";
// const wishlistUrl = "https://store.steampowered.com/wishlist"
const url_my_games = "https://steamcommunity.com/my/games?tab=all";
const color_own = "#54662f";
const color_wish = "#4c90b6";

var isMarkOwn = true;
var isMarkWish = true;
var isHideOwn = false;
var shownCount = 0;

var myAppidList;
var myWishAppidList;
var hisAppidList;
var hisGameMap = new Map();

var gameListObserver;
let curUrl;

(function () {
    "use strict";
    console.log("开始鉴定...");
    init();
})();

function init() {
    clear();
    const myGamesPromise = new Promise((resolve, reject) => {
        if (myAppidList) {
            resolve();
            return;
        }
        load(url_my_games, (res) => {
            myAppidList = getAppids(res);
            console.log("加载我的游戏", myAppidList.length);
            resolve();
        });
    });

    const myWishPromise = new Promise((resolve, reject) => {
        if (myWishAppidList) {
            resolve();
            return;
        }
        load(url_my_wishlist, (res) => {
            myWishAppidList = getAppids(res);
            console.log("加载我的愿望单", myWishAppidList.length);
            resolve();
        });
    });
    const hisGameListPromise = loadHisGameList(1000);

    Promise.all([myGamesPromise, myWishPromise, hisGameListPromise])
        .then(() => {
            initHisAppidMap();

            markGameList();

            if (!curUrl) {
                addSectionTabListener();
            }
            initialStatusBar();
        })
        .catch((error) => {
            // console.error("至少一个请求失败:", error);
        });
}

function clear() {
    hisAppidList = null;
    hisGameMap.clear();
    removeStatusBar();
    if (gameListObserver) {
        gameListObserver.disconnect();
        gameListObserver = null;
    }
}

function loadHisGameList(interval) {
    return new Promise((resolve) => {
        let count = 0;
        const intervalId = setInterval(() => {
            if (++count > 10 || hisAppidList) {
                // 结束定时器
                clearInterval(intervalId);
                resolve();
                return;
            }

            let gameslist_config = document.getElementById("gameslist_config");
            if (gameslist_config) {
                addGameListObserver(interval);

                let data_profile_gameslist = gameslist_config.getAttribute(
                    "data-profile-gameslist"
                );
                hisAppidList = getAppids(data_profile_gameslist);

                console.log("加载TA的游戏", hisAppidList.length);
                clearInterval(intervalId);
                resolve();
            }
        }, interval);
    });
}

function initHisAppidMap() {
    var gameListElement = document.getElementsByClassName(
        "_29H3o3m-GUmx6UfXhQaDAm"
    );
    if (gameListElement) {
        for (var i = 0; i < gameListElement.length; ++i) {
            let appid = getAppidFromElement(gameListElement[i]);
            if (!hisGameMap.has(appid)) {
                hisGameMap.set(appid, gameListElement[i]);
            }
        }
        hideGameList();
    }
}

function initialStatusBar() {
    // let element = document.getElementsByClassName("_2_BHLBIwWKIyKmoabfDFH-");
    let element = document.getElementsByClassName("_3tY9vKLCmyG2H2Q4rUJpkr ");
    if (!element || !element.length) {
        return;
    }
    removeStatusBar();
    let notHave = 0;
    let inWish = 0;
    hisAppidList.forEach(function (appid) {
        if (!myAppidList.includes(appid)) {
            notHave++;
        }
        if (myWishAppidList.includes(appid)) {
            inWish++;
        }
    });
    let html =
        "<div class='cyberFatherStatusBar'>" +
        "<label >TA拥有我库存外的游戏:" +
        "<span id='notHave'>" +
        notHave +
        "</span>" +
        "</label>" +
        "<label style='padding-left: 15px;'>TA拥有我愿望单中的游戏:" +
        "<span id='inWish'>" +
        inWish +
        "</span>" +
        "</label>" +
        "<label style='padding-left: 15px;'>鉴定结果：" +
        "<span id='identify'>" +
        identify() +
        "</span>" +
        "</label>" +
        "<label style='padding-left: 15px; float: right;'>隐藏我已拥有的游戏" +
        '<input type="checkbox" name="myCheckbox" value="1" id="checkbox_hideMine" style="margin: 3px 3px 3px 4px;">' +
        "</label>" +
        "<div>";
    // element[0].innerHTML +=html;
    element[0].insertAdjacentHTML("beforebegin", html);

    var checkbox = document.getElementById("checkbox_hideMine");
    if (checkbox) {
        checkbox.addEventListener("change", function () {
            isHideOwn = checkbox.checked;
            hideGameList();
        });
    }

    // let span_notHave = document.getElementById("notHave");
    // if (span_notHave) span_notHave.textContent = notHave;
    // let span_inWish = document.getElementById("inWish");
    // if (span_inWish) span_inWish.textContent = inWish;
}

function removeStatusBar() {
    let statusBars = document.getElementsByClassName("cyberFatherStatusBar");
    if (statusBars && statusBars.length) {
        statusBars.forEach((statusBar) => {
            statusBar.remove();
        });
    }
}

function identify() {
    let identity = "";
    let my = myAppidList.length;
    let his = hisAppidList.length;
    if (my == 0 || his == 0) {
        return "无法鉴定";
    }
    let diff = his - my;
    let multi = his / my;
    if (diff == 0) {
        identity = "亲兄弟";
    } else if (my >= 1000) {
        if (multi >= 3) {
            identity = "义父";
        } else if (multi >= 1) {
            identity = "义兄";
        } else if (multi >= 0.5) {
            identity = "义弟";
        } else {
            identity = "义子";
        }
    } else if (my > 100) {
        if (diff >= 400) {
            identity = "义父";
        } else if (diff > 0) {
            identity = "义兄";
        } else if (diff >= -100 && multi > 0.6) {
            identity = "义弟";
        } else {
            identity = "义子";
        }
    } else {
        if (diff > 0) {
            identity = "义兄";
        } else {
            identity = "义弟";
        }
    }

    let describe;
    if (myAppidList.length >= 10 && hisAppidList.length >= 10) {
        let myTop100 = myAppidList.slice(0, 100);
        let hisTop100 = hisAppidList.slice(0, 100);
        let hisTop10 = hisTop100.slice(0, 10);
        // let intersection = new Set(
        //     [...myTop100].filter((x) => hisTop100.has(x))
        // );
        let intersection = 0;
        for (let i = 0; i < myTop100.length; i++) {
            if (hisTop100.includes(myTop100[i])) {
                if (i < 10 && hisTop10.includes(myTop100[i])) {
                    intersection += myTop100.length / 10 - i + 1;
                } else {
                    intersection += 1;
                }
            }
        }
        let fact = intersection / myTop100.length;
        if (intersection >= 90 || fact >= 0.9) {
            describe = "臭味相投";
        } else if (intersection >= 80 || fact >= 0.8) {
            describe = "心照神交";
        } else if (intersection >= 70 || fact >= 0.7) {
            describe = "相知恨晚";
        } else if (intersection >= 60 || fact >= 0.6) {
            describe = "志同道合";
        } else if (intersection >= 50 || fact >= 0.5) {
            describe = "同声相应";
        } else if (intersection >= 40 || fact >= 0.4) {
            describe = "不谋而合";
        } else if (intersection >= 30 || fact >= 0.3) {
            describe = "所见略同";
        } else if (intersection >= 20 || fact >= 0.2) {
            describe = "萍水相逢";
        } else if (intersection >= 10 || fact >= 0.1) {
            describe = "聊胜于无";
        } else if (intersection >= 1 || fact >= 0.01) {
            describe = "南辕北辙";
        } else {
            describe = "格格不入"; //断长续短
        }
    }
    return describe ? describe + "的" + identity : identity;
}

function hideGameList() {
    shownCount = 0;
    hisGameMap.forEach(function (gameDiv, appid) {
        hideGame(appid, gameDiv);
    });
}

function hideGame(appid, gameDiv) {
    if (isHideOwn && myAppidList && myAppidList.includes(appid)) {
        gameDiv.style.display = "none";
        gameDiv.style.top = "-150px";
    } else {
        gameDiv.style.display = "block";
        gameDiv.style.top = shownCount++ * 150 + "px";
    }
}

function addSectionTabListener() {
    let sectionTabs = document.getElementsByClassName(
        "_1sHACvEQL-LRtUYan0JxdB"
    );
    curUrl = window.location.href;
    let regex = /games\/\?(\w|=|&)*?tab=(all|perfect|recent)/g;
    sectionTabs[0].addEventListener("click", function (event) {
        let targetUrl = event.target.baseURI ? event.target.baseURI : "";
        if (curUrl == targetUrl) {
            return;
        }
        curUrl = targetUrl;
        // console.log("点击了：", targetUrl);
        if (regex.match(targetUrl)) {
            init();
        } else {
            clear();
        }
    });
}

function addGameListObserver(interval) {
    let count = 0;
    const intervalId = setInterval(() => {
        if (++count > 10 || hisAppidList) {
            // 结束定时器
            clearInterval(intervalId);
            return;
        }
        var targetNode = document.getElementsByClassName(
            "_3tY9vKLCmyG2H2Q4rUJpkr"
            // "gameslist-root"
        )[0];
        if (targetNode) {
            let down = true;
            // 创建一个观察者对象
            gameListObserver = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) {
                    if (mutation.type === "childList") {
                        if (down) {
                            down = false;
                            setTimeout(() => {
                                down = true;
                                console.log("处理变化");
                                initHisAppidMap();
                                markGameList();
                            }, 1500);
                        }
                    }
                });
            });
            // 传入目标节点和观察选项
            gameListObserver.observe(targetNode, {
                // attributes: true,
                childList: true,
                // subtree: true,
            });
            // gameListObserver.disconnect();
            clearInterval(intervalId);
        }
    }, interval);
}

function markGameList() {
    hisGameMap.forEach(function (gameDiv, appid) {
        markGame(appid, gameDiv);
    });
}

function markGame(appid, gameDiv) {
    let color = "";
    if (isMarkOwn && myAppidList && myAppidList.includes(appid)) {
        color = color_own;
    } else if (
        isMarkWish &&
        myWishAppidList &&
        myWishAppidList.includes(appid)
    ) {
        color = color_wish;
    }
    gameDiv.style.backgroundColor = color;
}

function load(url, resolve) {
    try {
        return GM_xmlhttpRequest({
            method: "GET",
            url: url,
            onload: function (xhr) {
                // console.log(xhr);
                resolve(xhr.responseText);
            },
        });
    } catch (e) {
        // location.href = 'https://keylol.com';
    }
}

function getAppids(res, sort) {
    let appidAndplaytimeRegex = /appid("|\\"|&quot;):(\d+).*?playtime_forever("|\\"|&quot;):(\d+)/g;
    if (sort) {
        let obj = {};
        while (appid = appidAndplaytimeRegex.exec(res)) {
            obj[appid[2]] = appid[4];
        }
        let sortedKeys = Object.keys(obj).sort((a, b) => obj[b] - obj[a]); 
        return sortedKeys;
    } else {
        let appidRegex = /appid("|\\"|&quot;):(\d+)/g;
        let appidList = [];
        while (appid = appidRegex.exec(res)) {
            appidList.push(appid[2]);
        }
        return appidList;
    }
}

function getAppidFromElement(element) {
    let appidRegex = /app\/(\d+)/;
    let href = element
        .getElementsByClassName("_22awlPiAoaZjQMqxJhp-KP")[0]
        .getAttribute("href");
    let appid = appidRegex.exec(href);
    return appid[1];
}
