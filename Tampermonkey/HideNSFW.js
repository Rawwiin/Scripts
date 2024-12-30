// ==UserScript==
// @name         隐藏NSFW
// @namespace    http://tampermonkey.net/
// @version      24.12.26
// @description  避免网站NSFW图片直接展示到电脑屏幕
// @author       Rawwiin
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lens.google

// @require      https://cdn.jsdelivr.net/npm/jquery@3.4.1/dist/jquery.slim.min.js

// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand

// ==/UserScript==

(function () {
    'use strict';


    Array.prototype.indexOf = function (val) {
        for (var i = 0; i < this.length; i++) if (this[i] == val) return i;
        return -1;
    }
    Array.prototype.remove = function (val) {
        while (true) {
            var index = this.indexOf(val);
            if (index > -1) {
                this.splice(index, 1);
            } else {
                break;
            }
        }
    }

    var hpop_config_custom;
    var hpop_config_default = {
        "version": "24.12.30",
        "globalHide": true
    }

    const STYLE_RAW = `
        .transparent-image {
            opacity: 0.02; 
        }
        .transparent-image:hover {
            opacity: 1; 
        }
    `;

    function init() {
        GM_addStyle(STYLE_RAW);
        // 取出本地缓存配置
        hpop_config_custom = GM_getValue("hpop_config");
        if (!hpop_config_custom) {
            hpop_config_custom = hpop_config_default;
        }
        // 将数据结构的变更保存到本地缓存配置
        var updFlag = false;
        for (var _key in hpop_config_default) {
            if (!hpop_config_custom.hasOwnProperty(_key)) {
                hpop_config_custom._key = hpop_config_default._key;
                updFlag = true;
            }
        }
        if (updFlag) {
            // 保存当前配置到本地缓存
            GM_setValue("hpop_config", hpop_config_custom);
        }

        menu_Func_regist();

        // 根据记忆状态（显示/隐藏）初始化该网站
        if (hpop_config_custom.globalHide) {
            $(document).ready(function () {
                imgHide();
            });
        }
    }

    function menu_Func_regist() {
        return GM_registerMenuCommand(
            `${hpop_config_custom.globalHide ? '✅' : '❌'}` + '全局隐藏',
            function (event) {
                console.log(event)
                if (hpop_config_custom.globalHide) {
                    imgShow();
                    hpop_config_custom.globalHide = false;
                } else {
                    imgHide();
                    hpop_config_custom.globalHide = true;
                }
                // 保存当前配置到本地缓存
                GM_setValue("hpop_config", hpop_config_custom);
                menu_Func_regist();
            },
            {
                id: "1",
                accessKey: "s",
                autoClose: true
            }
        );
    };

    function imgHide() {
        $("img").addClass("transparent-image");
    }

    function imgShow() {
        $("img").removeClass("transparent-image");
    }

    init();
})();