// ==UserScript==
// @name         Steam赛博父子鉴定 (游戏库蓝绿)
// @license      MIT
// @namespace    http://tampermonkey.net/
// @version      0.2.0
// @description  帮助大家找到心仪的赛博义父
// @author       Rawwiin
// @match        https://steamcommunity.com/id/*/games/*
// @match        https://steamcommunity.com/id/*/games?*
// @match        https://steamcommunity.com/profiles/*/games/*
// @match        https://steamcommunity.com/profiles/*/games?*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_notification
// @grant        GM_info
// @run-at       document-end
// ==/UserScript==
// TODO
// BUG

const url_my_wishlist = "https://steamcommunity.com/my/wishlist/";
// const wishlistUrl = "https://store.steampowered.com/wishlist"
const url_my_games = "https://steamcommunity.com/my/games?tab=all";
const url_vac_games =
    "https://store.steampowered.com/search/?sort_by=Released_DESC&category1=998&category2=8&ndl=1";
const url_appdetails = "https://store.steampowered.com/api/appdetails/?appids=";
const color_own = "#54662f";
const color_own_sub = color_own; //"#30655f";
const color_wish = "#4c90b6";
const vacAppidList = [
    655740, 505460, 346330, 559650, 393380, 445220, 629760, 690790, 299740, 221100, 327090, 707010,
    252490, 700330, 476600, 730, 346110, 304930, 436520, 232090, 292730, 324810, 363680, 88801,
    394690, 372000, 451130, 225840, 360940, 394510, 376210, 311210, 290340, 260430, 299360, 321260,
    239140, 90948, 290790, 274940, 209650, 282800, 209160, 222880, 224260, 243800, 570, 222480,
    223710, 104900, 221040, 227100, 212480, 202970, 4920, 215470, 219640, 61730, 214360, 204300,
    212410, 209610, 14770, 201070, 58610, 115300, 65800, 17710, 35450, 63950, 55110, 70000, 63000,
    201270, 55100, 63200, 63500, 42700, 300, 39000, 17570, 550, 10180, 1250, 500, 17500, 469, 440,
    6510, 4000, 2100, 2400, 360, 1200, 320, 240, 80, 30, 40, 10, 60, 50, 20, 70,
];

var isMarkOwn = true;
var isMarkWish = true;
var isHideOwn = false;
var shownCount = 0;

var myAppidList;
var mySubAppidList;
var myWishAppidList;
var hisAppidList;
// var hisGameDivMap = new Map();
var hisStrProfileName;

var gameListObserver;
var mySubProfileShowText = "";

// var loadHisGameDivMaping = false;

var interval = 2000;
var retry = 200;

var domParser = new DOMParser();
var ico_vac = "https://store.akamai.steamstatic.com/public/images/v6/ico/ico_vac.png";
(function () {
    "use strict";
    console.log("开始鉴定...");
    // GM_xmlhttpRequest({
    //     method: "POST",
    //     url: "https://api.steampowered.com/IAccountPrivateAppsService/ToggleAppPrivacy/v1?access_token=655ca0ce4295bfaf5c40c4c9260a896d&spoof_steamid=",
    //     data: "input_protobuf_encoded=CLz/HxAB",
    //     onload: function (xhr) {
    //         console.log(xhr);
    //     },
    // });
    getAppDetails(730);

    init();
})();

function init() {
    clear();

    let persona_name_text_content = document.getElementsByClassName(
        "whiteLink persona_name_text_content"
    );
    if (persona_name_text_content && persona_name_text_content.length) {
        hisStrProfileName = persona_name_text_content[0].textContent
            ? persona_name_text_content[0].textContent.trim()
            : "";
    }

    let account_pulldown = document.getElementById("account_pulldown");
    let myStrProfileName =
        account_pulldown && account_pulldown.textContent ? account_pulldown.textContent.trim() : "";

    if (myStrProfileName && myStrProfileName == hisStrProfileName) {
        loadHisGameList().then(() => {
            addStatusBar(true);
        });
        return;
    } else if (!myStrProfileName || myStrProfileName != GM_getValue("myStrProfileName")) {
        // 切换账号
        GM_deleteValue("myStrProfileName");
        GM_deleteValue("myAppidList");
        GM_deleteValue("myWishAppidList");
    }
    addSectionTabListener();
    const myGamesPromise = loadMyGameList();
    myGamesPromise.then(() => {
        if (myStrProfileName) {
            GM_setValue("myStrProfileName", myStrProfileName);
        }
    });
    const myWishPromise = loadMyWishlist();
    const hisGameListPromise = loadHisGameList();
    const mySubGamesPromise = loadMySubGameList();
    Promise.all([myGamesPromise, myWishPromise, hisGameListPromise, mySubGamesPromise])
        .then(() => {
            // loadHisGameDivMap();
            refreshGameDivList();
            addStatusBar();
            addGameListObserver(500);
        })
        .catch((error) => {
            console.error(error);
        });
}

function refresh() {
    refreshGameDivList();
    refreshStatusBar();
}

function clear() {
    hisAppidList = null;
    // hisGameDivMap.clear();
    removeStatusBar();
    // if (gameListObserver) {
    //     gameListObserver.disconnect();
    //     gameListObserver = null;
    // }
}

function loadMyGameList() {
    return new Promise((resolve, reject) => {
        if ((myAppidList = GM_getValue("myAppidList")) && myAppidList.length) {
            console.log("缓存加载我的游戏", myAppidList.length);
            resolve();
            return;
        }
        getAppidListFromGamePage(url_my_games).then((appidList) => {
            myAppidList = appidList;
            // 缓存
            GM_setValue("myAppidList", myAppidList);
            console.log("加载我的游戏", myAppidList && myAppidList.length);
            resolve();
        });
    });
}

function getAppidListFromGamePage(url) {
    return new Promise((resolve, reject) => {
        if (!url) {
            resolve([]);
        }
        load(url, (res) => {
            let doc = domParser.parseFromString(res, "text/html");
            let dataProfileGameslist = getDataProfileGameslist(doc);
            let rgGames = getRgGames(dataProfileGameslist);
            let appidList = rgGames ? rgGames.map((game) => game.appid) : [];
            resolve(appidList);
        });
    });
}

function loadMySubGameList(subProfileListStr) {
    return new Promise((resolve, reject) => {
        mySubAppidList = [];
        let mySubProfile = GM_getValue("mySubProfile");
        if (!mySubProfile) {
            mySubProfile = {};
        }
        if (subProfileListStr) {
            let promises = [];
            const id64Rgx = /^\d{17}$/;
            subProfileListStr.split(",").forEach((subProfile) => {
                if (!subProfile) {
                    return;
                }
                let promise = getAppidListFromGamePage(
                    "https://steamcommunity.com/" +
                        (id64Rgx.test(subProfile) ? "profiles" : "id") +
                        "/" +
                        subProfile +
                        "/games/?tab=all"
                );
                promise.then((appidList) => {
                    mySubProfile[subProfile] = appidList;
                });
                promises.push(promise);
            });
            Promise.all(promises).then(() => {
                loadMySubAppidList(mySubProfile);
                resolve();
            });
        } else {
            loadMySubAppidList(mySubProfile);
            resolve();
        }
    });
}

function loadMySubAppidList(mySubProfile) {
    mySubProfileShowText = "";
    mySubAppidList = [];
    for (let subProfile in mySubProfile) {
        let appidList = mySubProfile[subProfile];
        appidList.forEach((appid) => {
            if ((!myAppidList || !myAppidList.includes(appid)) && !mySubAppidList.includes(appid)) {
                mySubAppidList.push(appid);
            }
        });
        if (mySubProfileShowText) {
            mySubProfileShowText += " | ";
        } else {
            mySubProfileShowText = "小号(游戏数)：";
        }
        mySubProfileShowText += subProfile + "(" + appidList.length + ")";
    }
    console.log("加载小号的游戏", mySubAppidList && mySubAppidList.length);
    GM_setValue("mySubProfile", mySubProfile);
}

function loadMyWishlist() {
    return new Promise((resolve, reject) => {
        if ((myWishAppidList = GM_getValue("myWishAppidList")) && myWishAppidList.length) {
            console.log("缓存加载我的愿望单", myWishAppidList.length);
            resolve();
            return;
        }
        load(url_my_wishlist, (res) => {
            let doc = domParser.parseFromString(res, "text/html");
            let myRgWishlistData = rgWishlistData(doc);
            myWishAppidList = myRgWishlistData ? myRgWishlistData.map((game) => game.appid) : [];
            GM_setValue("myWishAppidList", myWishAppidList);
            console.log("加载我的愿望单", myWishAppidList && myWishAppidList.length);
            // myWishAppidList = getAppids(res);
            // console.log("加载我的愿望单", myWishAppidList.length);
            resolve();
        });
    });
}

function loadHisGameList() {
    return new Promise((resolve) => {
        let count = 0;
        const intervalId = setInterval(() => {
            if (count++ > retry) {
                // 结束定时器
                clearInterval(intervalId);
                resolve();
                return;
            }
            let hisDataProfileGameslist = getDataProfileGameslist(document);
            if (hisDataProfileGameslist) {
                let hisRgGames = getRgGames(hisDataProfileGameslist);
                hisAppidList = hisRgGames ? hisRgGames.map((game) => game.appid) : [];
                console.log("加载TA的游戏", hisAppidList && hisAppidList.length);
                clearInterval(intervalId);
                resolve();
            }
        }, interval);
    });
}

function loadHisGameDivMap(force) {
    if (!force && loadHisGameDivMaping) {
        return;
    }
    loadHisGameDivMaping = true;
    let count = 0;
    const intervalId = setInterval(() => {
        if (count++ > retry) {
            loadHisGameDivMaping = false;
            clearInterval(intervalId);
            return;
        }
        var gameListElement = document.getElementsByClassName("_29H3o3m-GUmx6UfXhQaDAm");
        if (gameListElement && gameListElement.length) {
            for (var i = 0; i < gameListElement.length; ++i) {
                let appid = getAppidFromGameDiv(gameListElement[i]);
                if (appid && !hisGameDivMap.has(appid)) {
                    hisGameDivMap.set(appid, gameListElement[i]);
                }
            }
            refreshGameDivList();

            loadHisGameDivMaping = false;
            clearInterval(intervalId);
        }
    }, interval);
}

function addStatusBar(isSelfPage) {
    let count = 0;
    const intervalId = setInterval(() => {
        if (count++ > retry) {
            clearInterval(intervalId);
            return;
        }

        // let element = document.getElementsByClassName("_2_BHLBIwWKIyKmoabfDFH-");
        let element = document.getElementsByClassName("_3tY9vKLCmyG2H2Q4rUJpkr ");
        if (element && element.length) {
            removeStatusBar();
            // style='display: flex;flex-wrap: wrap;justify-content:space-between;align-items:center;'
            //  style='display: grid;grid-template-columns: auto auto auto 1fr;justify-items: start;'
            if (isSelfPage) {
                let html =
                    "<div class='cyberFatherStatusBar'>" +
                    "<div style='display: grid;grid-template-columns: auto auto auto 1fr;justify-items: start;'>" +
                    '<button id="privateMPGames" class="privateGames" style="margin-left: 10px;background:transparent;color:#199FFF;border:none;cursor: pointer;">私密多人游戏</button>' +
                    '<button id="privateVacGames" class="privateGames" style="margin-left: 10px;background:transparent;color:#199FFF;border:none;cursor: pointer;">私密VAC游戏</button>' +
                    '<button id="privateAllGames" class="privateGames" style="margin-left: 10px;background:transparent;color:#199FFF;border:none;cursor: pointer;">私密所有游戏</button>' +
                    '<button id="unprivateAllGames" class="privateGames" style="margin-left: 10px;background:transparent;color:#199FFF;border:none;cursor: pointer;">取消所有私密</button>' +
                    "</div>" +
                    // '<div id="cfOverlay" style="display: none; position: fixed; width: 100%; height: 100%; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); z-index: 2; cursor: pointer;">' +
                    // "</div>" +
                    "</div>";
                element[0].insertAdjacentHTML("beforebegin", html);
                let privateGamesEles = document.getElementsByClassName("privateGames");
                if (privateGamesEles && privateGamesEles.length) {
                    for (let i = 0; i < privateGamesEles.length; i++) {
                        const ele = privateGamesEles[i];
                        let eleId = ele.getAttribute("id");
                        ele.addEventListener("click", function () {
                            switch (eleId) {
                                case "privateMPGames":
                                    privateGames(true, null, [1, 8, 36]);
                                    break;
                                case "privateVacGames":
                                    // getVacAppidList().then((vacAppidList) => {
                                    //     privateGames(true, vacAppidList);
                                    // });
                                    privateGames(true, vacAppidList);
                                    break;
                                case "privateAllGames":
                                    privateGames(true);
                                    break;
                                case "unprivateAllGames":
                                    privateGames(false);
                                    break;

                                default:
                                    break;
                            }
                        });
                    }
                }
            } else {
                if (!hisAppidList) {
                    clearInterval(intervalId);
                    return;
                }
                let html =
                    "<div class='cyberFatherStatusBar'>" +
                    "<div style='display: grid;grid-template-columns: auto auto auto 1fr;justify-items: start;'>" +
                    "<label style='margin-left: 0;'>TA拥有我库存外的游戏:" +
                    "<span id='notHave'></span>" +
                    "</label>" +
                    "<label style='margin-left: 15px;'>TA拥有我愿望单中的游戏:" +
                    "<span id='inWish'></span>" +
                    "</label>" +
                    "<label style='margin-left: 15px;'>鉴定结果：" +
                    "<span id='identify'></span>" +
                    "</label>" +
                    "<label style='margin-left: 15px; justify-self: end;'>隐藏已拥有的游戏" +
                    '<input type="checkbox" name="myCheckbox" value="1" id="checkbox_hideMine" style="margin: 3px">' +
                    "</label>" +
                    "</div>" +
                    "<div style='display: grid;grid-template-columns: auto auto 1fr;justify-items: start;'>" +
                    '<button id="addSubProfile" style="background:transparent;color:#199FFF;border:none;cursor: pointer;">添加小号</button>' +
                    '<button id="removeSubProfileBtn" style="margin-left: 10px;background:transparent;color:#199FFF;display:none;border:none;cursor: pointer;">清空小号</button>' +
                    "<span id='subProfileListDiv' style='margin-left: 10px;'></span>" +
                    "</div>" +
                    "</div>";
                element[0].insertAdjacentHTML("beforebegin", html);
                refreshStatusBar();
                let checkbox = document.getElementById("checkbox_hideMine");
                if (checkbox) {
                    checkbox.addEventListener("change", function () {
                        isHideOwn = checkbox.checked;
                        refreshGameDivList();
                    });
                }

                let addSubProfile = document.getElementById("addSubProfile");
                if (addSubProfile) {
                    addSubProfile.addEventListener("click", function () {
                        let addSubProfileListStr = prompt("请输入小号ID或64位ID");
                        if (addSubProfileListStr) {
                            loadMySubGameList(addSubProfileListStr).then(() => {
                                refresh();
                            });
                        }
                    });
                }
                let removeSubProfileBtn = document.getElementById("removeSubProfileBtn");
                if (removeSubProfileBtn) {
                    removeSubProfileBtn.addEventListener("click", function () {
                        GM_deleteValue("mySubProfile");
                        loadMySubGameList().then(() => {
                            refresh();
                        });
                    });
                }
            }
            clearInterval(intervalId);
        }
    }, interval);
}

function refreshStatusBar() {
    let subProfileListDiv = document.getElementById("subProfileListDiv");
    if (subProfileListDiv) {
        subProfileListDiv.textContent = mySubProfileShowText ? mySubProfileShowText : "";
    }
    let removeSubProfileBtn = document.getElementById("removeSubProfileBtn");
    if (removeSubProfileBtn) {
        removeSubProfileBtn.style.display = mySubProfileShowText ? "block" : "none";
    }
    let notHave = 0;
    let inWish = 0;
    hisAppidList.forEach(function (appid) {
        if (
            (!myAppidList || !myAppidList.includes(appid)) &&
            (!mySubAppidList || !mySubAppidList.includes(appid))
        ) {
            notHave++;
        }
        if (myWishAppidList && myWishAppidList.includes(appid)) {
            inWish++;
        }
    });
    let notHaveEle = document.getElementById("notHave");
    if (notHaveEle) {
        notHaveEle.textContent = notHave;
    }
    let inWishEle = document.getElementById("inWish");
    if (inWishEle) {
        inWishEle.textContent = inWish;
    }
    let identifyEle = document.getElementById("identify");
    if (identifyEle) {
        identifyEle.textContent = identify();
    }
}

function removeStatusBar() {
    let statusBars = document.getElementsByClassName("cyberFatherStatusBar");
    if (statusBars && statusBars.length) {
        for (let i = 0; i < statusBars.length; i++) {
            statusBars[i].remove();
        }
    }
}

function identify() {
    let identity = "";
    let myGameNum = myAppidList ? myAppidList.length : 0;
    let hisGameNum = hisAppidList ? hisAppidList.length : 0;
    if (myGameNum == 0 || hisGameNum == 0) {
        return "无法鉴定";
    }
    let diff = hisGameNum - myGameNum;
    let multi = hisGameNum / myGameNum;
    if (diff == 0) {
        identity = "世另我";
    } else if (hisGameNum <= 10) {
        identity = "老六";
    } else if (myGameNum > 100) {
        if (diff >= 0) {
            if (multi >= 3) {
                identity = "义父";
            } else {
                identity = "义兄";
            }
        } else {
            if (multi >= 0.5) {
                identity = "义弟";
            } else {
                identity = "义子";
            }
        }
    } else {
        if (multi > 5) {
            identity = "义父";
        } else if (diff >= 0) {
            identity = "义兄";
        } else {
            identity = "义弟";
        }
    }

    let describe;
    // if (myAppidList.length >= 10 && hisAppidList.length >= 10) {
    //     let myTop100 = myAppidList.slice(0, 100);
    //     let hisTop100 = hisAppidList.slice(0, 100);
    //     let hisTop10 = hisTop100.slice(0, 10);
    //     // let intersection = new Set(
    //     //     [...myTop100].filter((x) => hisTop100.has(x))
    //     // );
    //     let intersection = 0;
    //     for (let i = 0; i < myTop100.length; i++) {
    //         if (hisTop100.includes(myTop100[i])) {
    //             if (i < 10 && hisTop10.includes(myTop100[i])) {
    //                 intersection += myTop100.length / 10 - i + 1;
    //             } else {
    //                 intersection += 1;
    //             }
    //         }
    //     }
    //     let fact = intersection / myTop100.length;
    //     if (intersection >= 90 || fact >= 0.9) {
    //         describe = "臭味相投";
    //     } else if (intersection >= 80 || fact >= 0.8) {
    //         describe = "心照神交";
    //     } else if (intersection >= 70 || fact >= 0.7) {
    //         describe = "相知恨晚";
    //     } else if (intersection >= 60 || fact >= 0.6) {
    //         describe = "志同道合";
    //     } else if (intersection >= 50 || fact >= 0.5) {
    //         describe = "同声相应";
    //     } else if (intersection >= 40 || fact >= 0.4) {
    //         describe = "不谋而合";
    //     } else if (intersection >= 30 || fact >= 0.3) {
    //         describe = "所见略同";
    //     } else if (intersection >= 20 || fact >= 0.2) {
    //         describe = "萍水相逢";
    //     } else if (intersection >= 10 || fact >= 0.1) {
    //         describe = "聊胜于无";
    //     } else if (intersection >= 1 || fact >= 0.01) {
    //         describe = "南辕北辙";
    //     } else {
    //         describe = "格格不入"; //断长续短
    //     }
    // }
    return describe ? describe + "的" + identity : identity;
}

function refreshGameDivList() {
    // shownCount = 0;
    // hisGameDivMap.forEach(function (gameDiv, appid) {
    //     hideGameDiv(appid, gameDiv);
    //     markGameDiv(appid, gameDiv);
    // });
    let lastGameDivTop = -150;
    var gameListElement = document.getElementsByClassName("_29H3o3m-GUmx6UfXhQaDAm");
    if (gameListElement && gameListElement.length) {
        for (var i = 0; i < gameListElement.length; ++i) {
            let gameDiv = gameListElement[i];
            let appid = getAppidFromGameDiv(gameListElement[i]);
            lastGameDivTop = hideGameDiv(appid, gameDiv, lastGameDivTop);
            markGameDiv(appid, gameDiv);
        }
    }
}

function getVacAppidList() {
    return new Promise(function (resolve, reject) {
        load(url_vac_games, (res) => {
            let doc = domParser.parseFromString(res, "text/html");
            let searchResultRowEles = doc.getElementsByClassName("search_result_row");
            let vacAppidList = [];
            for (let i = 0; i < searchResultRowEles.length; i++) {
                let element = searchResultRowEles[i];
                let appid = getAppidFromGameDiv(element);
                if (appid && !vacAppidList.includes(appid)) {
                    vacAppidList.push(appid);
                }
            }
            resolve(vacAppidList);
        });
    });
}

async function privateGames(private, appidList, categorieIds) {
    let hisGameNum = hisAppidList ? hisAppidList.length : 0;
    let i = 0;
    let count = 0;
    let gameDiv = document.querySelector("._29H3o3m-GUmx6UfXhQaDAm");
    while (gameDiv && ++i <= hisGameNum) {
        gameDiv.scrollIntoView({ block: "end", inline: "nearest" });
        let btns = gameDiv.getElementsByClassName("_1pXbX5mBA7v__kVWHg0_Ja");
        let aEle = getAEleFromGameDiv(gameDiv);
        let appid = getAppidFromAEle(aEle);
        let appName = aEle.innerText;
        console.log(i + " " + appName);
        if (btns && btns.length > 0) {
            if (private && btns.length == 1) {
                if ((!appidList && !categorieIds) || (appidList && appidList.includes(appid))) {
                    await privateGame(true, gameDiv, btns, ++count * 2000);
                } else if (categorieIds && categorieIds.length) {
                    await getAppDetails(appid).then(async (res) => {
                        let data;
                        if (res && res[appid] && (data = res[appid].data) && data.categories) {
                            for (let i = 0; i < data.categories.length; i++) {
                                if (categorieIds.includes(data.categories[i].id)) {
                                    await privateGame(true, gameDiv, btns, ++count * 2000);
                                    break;
                                }
                            }
                        }
                    });
                }
            } else if (!private && btns.length >= 2) {
                await privateGame(false, gameDiv, btns, ++count * 1000);
            }
        }
        gameDiv = gameDiv.nextElementSibling;
    }
}

function getAppDetails(appid) {
    return new Promise(function (resolve, reject) {
        load(url_appdetails + appid, (res) => {
            if (!res) resolve({});
            let s = res.indexOf("{");
            let e = res.lastIndexOf("}");
            if (s >= 0 && e > s) res = res.substring(s, e + 1);
            resolve(JSON.parse(res));
        });
    });
}

function getAppidFromGameDiv(gameDiv) {
    let aEle = gameDiv.getElementsByClassName("_29H3o3m-GUmx6UfXhQaDAm")[0];
    if (aEle) return getAppidFromAEle(aEle);
    return null;
}
function getAppidFromAEle(gameDiv) {
    return gameDiv.querySelector("._29H3o3m-GUmx6UfXhQaDAm");
}
function privateGame(private, gameDiv, btns, timeout) {
    return new Promise(function (resolve, reject) {
        if (private) {
            btns[btns.length - 1].click();
            setTimeout(() => {
                let contextMenuItems = document.getElementsByClassName(
                    "pFo3kQOzrl9qVLPXXGIMp contextMenuItem"
                );
                if (contextMenuItems && contextMenuItems.length >= 6) {
                    contextMenuItems[5].click();
                }
                resolve();
            }, 200);
        } else {
            btns[btns.length - 2].click();
            resolve();
        }
    });
}

// function privateGame(private, gameDiv, btns, timeout) {
//     return new Promise(function (resolve, reject) {
//         gameDiv.scrollIntoView({ block: "end", inline: "nearest" });
//         if (private) {
//             setTimeout(function () {
//                 btns[btns.length - 1].click();
//                 setTimeout(() => {
//                     let contextMenuItems = document.getElementsByClassName(
//                         "pFo3kQOzrl9qVLPXXGIMp contextMenuItem"
//                     );
//                     if (contextMenuItems && contextMenuItems.length >= 6) {
//                         contextMenuItems[5].click();
//                     }
//                     resolve();
//                 }, 500);
//             }, timeout);
//         } else {
//             setTimeout(function () {
//                 btns[btns.length - 2].click();
//                 resolve();
//             }, timeout);
//         }
//     });
// }

function hideGameDiv(appid, gameDiv, lastGameDivTop) {
    if (
        isHideOwn &&
        ((myAppidList && myAppidList.includes(appid)) ||
            (mySubAppidList && mySubAppidList.includes(appid)))
    ) {
        gameDiv.style.display = "none";
    } else {
        gameDiv.style.display = "block";
        lastGameDivTop += 150;
    }
    gameDiv.style.top = lastGameDivTop + "px";
    return lastGameDivTop;
}

function addSectionTabListener() {
    let count = 0;
    const intervalId = setInterval(() => {
        if (count++ > retry) {
            clearInterval(intervalId);
            return;
        }
        let sectionTabs = document.getElementsByClassName("_1sHACvEQL-LRtUYan0JxdB");
        if (sectionTabs && sectionTabs.length > 0) {
            let curUrl = window.location.href;
            let regex = /games\/\?(\w|=|&)*?tab=(all|perfect|recent)/g;
            sectionTabs[0].addEventListener("click", function (event) {
                let targetUrl = event.target.baseURI ? event.target.baseURI : "";
                if (curUrl == targetUrl) {
                    return;
                }
                curUrl = targetUrl;
                // console.log("点击了：", targetUrl);
                if (regex.match(targetUrl)) {
                    // loadHisGameDivMap(true);
                    refreshGameDivList();
                }
            });

            clearInterval(intervalId);
        }
    }, interval);
}

function addGameListObserver(interval) {
    // let count = 0;
    // const intervalId = setInterval(() => {
    //     if (++count > 10 || hisAppidList) {
    //         // 结束定时器
    //         clearInterval(intervalId);
    //         return;
    //     }
    //     var targetNode = document.getElementsByClassName(
    //         "_3tY9vKLCmyG2H2Q4rUJpkr"
    //         // "gameslist-root"
    //     )[0];
    //     if (targetNode) {
    //         let down = true;
    //         // 创建一个观察者对象
    //         gameListObserver = new MutationObserver(function (mutations) {
    //             mutations.forEach(function (mutation) {
    //                 if (mutation.type === "childList") {
    //                     if (down) {
    //                         down = false;
    //                         setTimeout(() => {
    //                             down = true;
    //                             loadHisGameDivMap();
    //                         }, interval);
    //                     }
    //                 }
    //             });
    //         });
    //         // 传入目标节点和观察选项
    //         gameListObserver.observe(targetNode, {
    //             // attributes: true,
    //             childList: true,
    //             // subtree: true,
    //         });
    //         // gameListObserver.disconnect();
    //         clearInterval(intervalId);
    //     }
    // }, interval);

    let timeout;
    window.addEventListener("scroll", () => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            // loadHisGameDivMap();
            refreshGameDivList();
        }, interval);
    });
}

function markGameDiv(appid, gameDiv) {
    let color = "";
    if (isMarkOwn && myAppidList && myAppidList.includes(appid)) {
        color = color_own;
    } else if (isMarkOwn && mySubAppidList && mySubAppidList.includes(appid)) {
        color = color_own_sub;
    } else if (isMarkWish && myWishAppidList && myWishAppidList.includes(appid)) {
        color = color_wish;
    }
    gameDiv.style.backgroundColor = color;
}

function load(url, callback) {
    try {
        return GM_xmlhttpRequest({
            method: "GET",
            url: url,
            onload: function (xhr) {
                // console.log(xhr);
                callback(xhr.responseText ? xhr.responseText : xhr);
            },
        });
    } catch (e) {
        // location.href = 'https://keylol.com';
        console.log(e);
    }
}

function getAppids(res, sort) {
    let appid;
    if (sort) {
        let appidAndplaytimeRegex =
            /appid("|\\"|&quot;):(\d+).*?playtime_forever("|\\"|&quot;):(\d+)/g;
        let obj = {};
        while ((appid = appidAndplaytimeRegex.exec(res))) {
            obj[appid[2]] = appid[4];
        }
        let sortedKeys = Object.keys(obj).sort((a, b) => obj[b] - obj[a]);
        return sortedKeys;
    } else {
        let appidRegex = /appid("|\\"|&quot;):(\d+)/g;
        let appidSet = new Set();
        // let appidList = [];
        while ((appid = appidRegex.exec(res))) {
            // appidList.push(appid[2]);
            appidSet.add(appid[2]);
        }
        return Array.from(appidSet);
    }
}
const appidRegex = /app\/(\d+)/;
function getAEleFromGameDiv(gameDiv) {
    return gameDiv && gameDiv.querySelector("._22awlPiAoaZjQMqxJhp-KP");
}

function getAppidFromAEle(aEle) {
    let href = aEle && aEle.getAttribute("href");
    let appid = appidRegex.exec(href ? href : "");
    return appid && parseInt(appid[1]);
}

function getAppidFromGameDiv(gameDiv) {
    let aEle = getAEleFromGameDiv(gameDiv);
    return getAppidFromAEle(aEle);
}

/**
 * 游戏库页面所有游戏列表
 * @param {*} document
 */
function getRgGames(dataProfileGameslist) {
    let rgGames = dataProfileGameslist && dataProfileGameslist.rgGames;
    return rgGames ? rgGames : [];
}

function getDataProfileGameslist(document) {
    let gameslist_config = document.getElementById("gameslist_config");
    if (gameslist_config) {
        // addGameListObserver(interval);
        let data_profile_gameslist = gameslist_config.getAttribute("data-profile-gameslist");
        return JSON.parse(data_profile_gameslist);
        // let rgGames = JSON.parse(data_profile_gameslist).rgGames;
        // return rgGames == null ? [] : rgGames;
        // // hisAppidList = getAppids(data_profile_gameslist);
    }
    return null;
}

function rgWishlistData(document) {
    const scriptElements = document.getElementsByTagName("script");
    for (const script of scriptElements) {
        // const scriptElement = document.querySelector("script");
        const scriptContent = script.textContent; // 获取 <script> 标签的内容
        if (!scriptContent) {
            continue;
        }
        const match = scriptContent.match(/var\s+g_rgWishlistData\s*=\s*(\[.+\])\s*;/); // 使用正则表达式匹配变量值
        const rgWishlistData = match && match[1]; // 提取变量值
        if (rgWishlistData) {
            return JSON.parse(rgWishlistData);
        }
    }
    return null;
}
