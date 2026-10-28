/*
	ANGE UNITE Deck Builder
	based on WIXOSS_deckeditor

	デッキ構築ルール (公式ルール / atwiki「ゲームの流れ」より)
	- スタートカード 3枚 (同じ【名称】は不可、アドバンススタートカードは1枚まで)
	- デッキ 40枚 = フレームカード ちょうど12枚 + プログレス／アクション ちょうど28枚
	- プログレス／アクションはスタートカードと同じ色のみ (無色は可)
	- 同名カードは3枚まで (サポーターは合計3枚まで、「天音への想い」は1枚まで)
	- 禁止・制限・コンビネーション制限 (card_info.js の BAN_LIST / LIMIT_LIST / COMBINATION_LIST)
*/

const START_MAX = 3;
const FRAME_MAX = 12;
const MAIN_MAX = 28;
const SAME_NAME_MAX = 3;
const SUPPORTER_MAX = 3;
const PAGE_SIZE = 10;

const DECK_LIST_KEY = "AUDeckNameList";
const DECK_KEY_PREFIX = "AU_deck_";
const COMMENT_SUFFIX = "_AUcomment";

const COLOR_ORDER = ["青", "黒", "赤", "白", "緑", "無"];
const COLOR_HEX = { "青": "#3f8fe0", "黒": "#7a3fc0", "赤": "#e04848", "白": "#d9d9d9", "緑": "#3daa55", "無": "#b0b0b0", "": "#999999" };
const COLOR_CHECK = { "青": "c_blue", "黒": "c_black", "赤": "c_red", "白": "c_white", "緑": "c_green", "無": "c_none" };
const TYPE_CHECK = { "プログレス": "t_progress", "アクション": "t_action", "スタート": "t_start", "フレーム": "t_frame" };
const LEVEL_OPTIONS = ["0", "1", "2", "3", "4", "5", "6", "7", "8+"];

var cardById = {};
var rdeckArr = [];
var page = 0;

var startArr = [];
var frameArr = [];
var mainArr = [];

var deckNamelist = [];

var levelobj = null, colorobj = null, typeobj = null, frameobj = null;

/* ========================================================= */
/*  Init                                                      */
/* ========================================================= */

// function.js is loaded before jQuery, so wait for DOMContentLoaded instead of $(document).ready
window.addEventListener('DOMContentLoaded', function() {
	var i;
	for(i = 0; i < cardData.length; i++)
	{
		cardById[cardData[i][ID]] = cardData[i];
	}

	buildFilterControls();
	buildDeckSlots();
	buildResultSlots();
	buildCharts();
	showInfotable(null);

	document.getElementById('fileinput').addEventListener('change', readSingleFile, false);
	document.getElementById('commentFileinput').addEventListener('change', readSingleCommentFile, false);

	$("#textsearch").keydown(function(event) {
		if(event.keyCode == 13) search();
	});

	onloaddeck();
	search();
	showAlldeck();
	updateDarkModeButton();
	applyDarkModeImages();
});

function hideInfo()
{
	$('#cardinformation').css('visibility', 'hidden');
}

function escapeHtml(s)
{
	return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function buildFilterControls()
{
	var i, str = "";

	// Level checkboxes
	for(i = 0; i < LEVEL_OPTIONS.length; i++)
	{
		str += "<input type=\"checkbox\" id=\"lv_" + i + "\" checked><span onclick=\"clickSpan(this)\">Lv" + LEVEL_OPTIONS[i] + " </span>&ensp;";
	}
	$("#levelChecks").html(str);

	// 名称 (character) select — ordered by first appearance
	var charas = [];
	for(i = 0; i < cardData.length; i++)
	{
		var list = splitChara(cardData[i]);
		for(var j = 0; j < list.length; j++)
		{
			if(charas.indexOf(list[j]) == -1) charas.push(list[j]);
		}
	}
	str = "<option value=\"0\">--All 名称--</option>";
	for(i = 0; i < charas.length; i++)
	{
		str += "<option value=\"" + escapeHtml(charas[i]) + "\">" + escapeHtml(charas[i]) + "</option>";
	}
	$("#selectChara").html(str);

	// LINK select (required frames pattern)
	var links = [];
	for(i = 0; i < cardData.length; i++)
	{
		var ls = getLinks(cardData[i]);
		for(var k = 0; k < ls.length; k++)
		{
			if(links.indexOf(ls[k]) == -1) links.push(ls[k]);
		}
	}
	links.sort(function(a, b) {
		var na = parseInt(a), nb = parseInt(b);
		if(na != nb) return na - nb;
		return a < b ? -1 : (a > b ? 1 : 0);
	});
	str = "<option value=\"0\">--All LINK--</option><option value=\"none\">LINKなし</option>";
	for(i = 0; i < links.length; i++)
	{
		str += "<option value=\"" + escapeHtml(links[i]) + "\">LINK(" + links[i].replace("-", ")-") + "</option>";
	}
	$("#selectLink").html(str);

	// Product select
	str = "<option value=\"0\">--All Product--</option>";
	for(i = 0; i < PRODUCT_LIST.length; i++)
	{
		str += "<option value=\"" + PRODUCT_LIST[i][0] + "\">" + escapeHtml(productLabel(PRODUCT_LIST[i][0])) + "</option>";
	}
	$("#selectProduct").html(str);
}

function productLabel(code)
{
	for(var i = 0; i < PRODUCT_LIST.length; i++)
	{
		if(PRODUCT_LIST[i][0] == code)
		{
			var p = PRODUCT_LIST[i];
			var tag = /^\d$/.test(code) ? "[" + code + "]" : (code == "PR" ? "[PR]" : "[" + code.replace("B", "BP") + "]");
			return tag + " " + p[1] + (p[2] ? " (" + p[2] + ")" : "");
		}
	}
	return code;
}

function splitChara(card)
{
	if(!card[CHARA]) return [];
	return card[CHARA].split("＆");
}

function getLinks(card)
{
	var res = [];
	var re = /【LINK\((\d+)\)-([^】]*)】/g, m;
	while((m = re.exec(card[TEXT])) !== null)
	{
		res.push(m[1] + "-" + m[2]);
	}
	return res;
}

/* ========================================================= */
/*  Slots                                                     */
/* ========================================================= */

function slotImg(zone, idx, w, h)
{
	return "<img id=\"" + zone + "_" + idx + "\" class=\"deck-slot\" width=\"" + w + "px\" height=\"" + h + "px\" src=\"img/empty.jpg\" alt=\"\"" +
		" onmouseover=\"onmouseShow(this, 'deck');\"" +
		" onclick=\"delDeck('" + zone + "', " + idx + ");\"" +
		" oncontextmenu=\"addDeck(this); return false;\">";
}

function buildDeckSlots()
{
	var i, str;

	str = "";
	for(i = 0; i < START_MAX; i++) str += slotImg("start", i, 100, 140);
	$("#startZone").html(str);

	str = "";
	for(i = 0; i < FRAME_MAX; i++) str += slotImg("frame", i, 72, 101);
	$("#frameZone").html(str);

	str = "";
	for(i = 0; i < MAIN_MAX; i++)
	{
		str += slotImg("main", i, 86, 120);
		if(i == 9 || i == 19) str += "<br>";
	}
	$("#mainZone").html(str);
}

function buildResultSlots()
{
	var i, s0 = "", s1 = "";
	for(i = 0; i < PAGE_SIZE; i++)
	{
		var tag = "<img id=\"rdeck_" + i + "\" onmouseover=\"onmouseShow(this, 'search');\" onclick=\"addDeck(this)\" alt=\"\" height=\"172px\" width=\"124px\" src=\"img/empty.jpg\" style=\"cursor: pointer;\"> ";
		if(i < PAGE_SIZE / 2) s0 += tag; else s1 += tag;
	}
	$("#resultRow0").html(s0);
	$("#resultRow1").html(s1);
}

/* ========================================================= */
/*  Card image (with placeholder for cards without image)     */
/* ========================================================= */

var placeholderCache = {};

function cardImgSrc(card)
{
	if(!card) return "img/empty.jpg";
	if(card[SRC]) return card[SRC];
	return makePlaceholder(card);
}

// 官網圖片讀取失敗時 (離線 / 被擋) 改用文字版卡圖
document.addEventListener('error', function(e) {
	var img = e.target;
	if(!img || img.tagName !== 'IMG') return;
	var src = img.getAttribute('src') || "";
	if(src.indexOf("https://ange-unite.com/") != 0) return;
	var id = img.getAttribute('alt') || "";
	var c = cardById[id];
	if(!c)
	{
		for(var i = 0; i < cardData.length; i++) if(cardData[i][SRC] == src) { c = cardData[i]; break; }
	}
	if(c) img.setAttribute('src', makePlaceholder(c));
}, true);

function makePlaceholder(card)
{
	if(placeholderCache[card[ID]]) return placeholderCache[card[ID]];

	var bg = COLOR_HEX[card[COLOR]] || "#999";
	var name = card[NAME];
	var lines = [];
	var parts = name.split(" ");
	if(parts.length > 1)
	{
		lines.push(parts.slice(0, parts.length - 1).join(" "));
		lines.push(parts[parts.length - 1]);
	}
	else
	{
		lines.push(name);
	}
	var stat = card[TYPE] + (card[LEVEL] !== "" ? "  Lv" + card[LEVEL] : "");
	var stat2 = card[ATK] ? ("ATK " + card[ATK] + " / DEF " + card[DEF] + " / STK " + card[STK]) : "";
	var esc = function(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
	var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='573' height='800' viewBox='0 0 573 800'>" +
		"<rect width='573' height='800' rx='30' fill='#1e1e28'/>" +
		"<rect x='18' y='18' width='537' height='764' rx='22' fill='" + bg + "' opacity='0.85'/>" +
		"<rect x='40' y='150' width='493' height='420' rx='14' fill='#ffffff' opacity='0.85'/>" +
		"<text x='286' y='80' font-size='44' font-family='sans-serif' font-weight='bold' text-anchor='middle' fill='#fff'>" + esc(card[ID]) + "</text>" +
		"<text x='286' y='300' font-size='" + Math.min(44, Math.floor(480 / Math.max(lines[0].length, 1))) + "' font-family='sans-serif' font-weight='bold' text-anchor='middle' fill='#222'>" + esc(lines[0]) + "</text>" +
		(lines[1] ? "<text x='286' y='370' font-size='" + Math.min(50, Math.floor(480 / Math.max(lines[1].length, 1))) + "' font-family='sans-serif' font-weight='bold' text-anchor='middle' fill='#222'>" + esc(lines[1]) + "</text>" : "") +
		"<text x='286' y='470' font-size='30' font-family='sans-serif' text-anchor='middle' fill='#444'>" + (card[SRC] ? "IMAGE NOT LOADED" : "NO IMAGE") + "</text>" +
		"<text x='286' y='650' font-size='36' font-family='sans-serif' text-anchor='middle' fill='#fff'>" + esc(stat) + "</text>" +
		"<text x='286' y='705' font-size='30' font-family='sans-serif' text-anchor='middle' fill='#fff'>" + esc(stat2) + "</text>" +
		"</svg>";
	var uri = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
	placeholderCache[card[ID]] = uri;
	return uri;
}

/* ========================================================= */
/*  Search                                                    */
/* ========================================================= */

function levelBucket(card)
{
	if(card[LEVEL] === "") return -1;
	var lv = parseInt(card[LEVEL], 10);
	if(lv >= 8) return 8;
	return lv;
}

function startColors()
{
	var res = [];
	for(var i = 0; i < startArr.length; i++)
	{
		if(res.indexOf(startArr[i][COLOR]) == -1) res.push(startArr[i][COLOR]);
	}
	return res;
}

function search()
{
	var i;
	var keywords = $("#textsearch").val().replace(/　/g, " ").trim().toLowerCase().split(/\s+/).filter(function(s){ return s != ""; });
	var chara = $("#selectChara").val();
	var link = $("#selectLink").val();
	var stk = $("#selectStk").val();
	var product = $("#selectProduct").val();
	var onlyStart = $("#onlyStartColor").prop("checked");
	var hasEX = $("#hasEX").prop("checked");
	var isPlain = $("#isPlain").prop("checked");
	var isFree = $("#isFree").prop("checked");
	var sc = startColors();

	rdeckArr = [];

	for(i = 0; i < cardData.length; i++)
	{
		var c = cardData[i];

		if(!$("#" + TYPE_CHECK[c[TYPE]]).prop("checked")) continue;

		if(c[TYPE] != "フレーム")
		{
			if(!$("#" + COLOR_CHECK[c[COLOR]]).prop("checked")) continue;
			var lb = levelBucket(c);
			if(lb >= 0 && !$("#lv_" + lb).prop("checked")) continue;
		}

		if(onlyStart && sc.length > 0 && (c[TYPE] == "プログレス" || c[TYPE] == "アクション"))
		{
			if(c[COLOR] != "無" && sc.indexOf(c[COLOR]) == -1) continue;
		}

		if(chara != "0" && splitChara(c).indexOf(chara) == -1) continue;

		if(link != "0")
		{
			var ls = getLinks(c);
			if(link == "none") { if(ls.length > 0 || c[TYPE] != "プログレス") continue; }
			else if(ls.indexOf(link) == -1) continue;
		}

		if(stk != "0" && c[STK] !== stk.replace("s", "")) continue;

		if(product != "0" && c[PRODUCT] != product) continue;

		if(hasEX && c[TEXT].indexOf("【EX:") == -1) continue;
		if(isPlain && (" " + c[TAG] + " ").indexOf(" プレーン ") == -1) continue;
		if(isFree && !/【LINK\(\d+\)-\d+】/.test(c[TEXT])) continue;

		if(keywords.length > 0)
		{
			var hay = (c[ID] + " " + c[NAME] + " " + c[TEXT].replace(/<br>/g, " ") + " " + c[TAG] + " " + c[CHARA] + " " + c[TYPE] + " " + c[FRAME]).toLowerCase();
			var ok = true;
			for(var k = 0; k < keywords.length; k++)
			{
				if(hay.indexOf(keywords[k]) == -1) { ok = false; break; }
			}
			if(!ok) continue;
		}

		rdeckArr.push(c);
	}

	var sortMode = $("#selectSort").val();
	if(sortMode == "1")
	{
		rdeckArr.sort(function(a, b) { return colorIdx(a) - colorIdx(b) || typeIdx(a) - typeIdx(b) || lvNum(a) - lvNum(b) || cmpId(a, b); });
	}
	else if(sortMode == "2")
	{
		rdeckArr.sort(function(a, b) { return typeIdx(a) - typeIdx(b) || lvNum(a) - lvNum(b) || colorIdx(a) - colorIdx(b) || cmpId(a, b); });
	}

	page = 0;
	showrdeck();
}

function checkall()
{
	$("input[type=checkbox]").prop("checked", true);
	$("#onlyStartColor, #hasEX, #isPlain, #isFree").prop("checked", false);
}

function uncheckall()
{
	$("input[type=checkbox]").prop("checked", false);
}

function clickSpan(x)
{
	var cb = $(x).prev("input[type=checkbox]");
	cb.prop("checked", !cb.prop("checked"));
}

function showrdeck()
{
	var i;
	for(i = 0; i < PAGE_SIZE; i++)
	{
		var idx = page * PAGE_SIZE + i;
		if(idx < rdeckArr.length)
		{
			$("#rdeck_" + i).attr("src", cardImgSrc(rdeckArr[idx])).attr("alt", rdeckArr[idx][ID]).css("visibility", "visible");
		}
		else
		{
			$("#rdeck_" + i).attr("src", "img/empty.jpg").attr("alt", "");
		}
	}
	applyDarkModeImages();

	$("#totalCard").html(rdeckArr.length);
	if(rdeckArr.length == 0)
	{
		$("#page").html("0 / 0");
	}
	else
	{
		$("#page").html((page + 1) + " / " + Math.ceil(rdeckArr.length / PAGE_SIZE));
	}
}

function changePage(x)
{
	var maxPage = Math.max(0, Math.ceil(rdeckArr.length / PAGE_SIZE) - 1);
	if(x == "back") page = (page > 0) ? page - 1 : maxPage;
	else page = (page < maxPage) ? page + 1 : 0;
	showrdeck();
}

/* ========================================================= */
/*  Sort helpers                                              */
/* ========================================================= */

function colorIdx(c) { var i = COLOR_ORDER.indexOf(c[COLOR]); return i == -1 ? 9 : i; }
function typeIdx(c) { return ["スタート", "プログレス", "アクション", "フレーム"].indexOf(c[TYPE]); }
function lvNum(c) { return c[LEVEL] === "" ? 99 : parseInt(c[LEVEL], 10); }
function idKey(c)
{
	var id = c[ID];
	if(id == "omega") return "0-000a";
	if(id == "sigma") return "0-000b";
	if(id.indexOf("PR-") == 0) return "9-" + id.substr(3);
	return id;
}
function cmpId(a, b) { var x = idKey(a), y = idKey(b); return x < y ? -1 : (x > y ? 1 : 0); }

function sortStart() { startArr.sort(function(a, b) { return colorIdx(a) - colorIdx(b) || cmpId(a, b); }); }
function sortFrame() { frameArr.sort(function(a, b) { return (a[FRAME] == "Ω" ? 0 : 1) - (b[FRAME] == "Ω" ? 0 : 1) || cmpId(a, b); }); }
function sortMain() { mainArr.sort(function(a, b) { return typeIdx(a) - typeIdx(b) || colorIdx(a) - colorIdx(b) || lvNum(a) - lvNum(b) || cmpId(a, b); }); }

/* ========================================================= */
/*  Add / Delete                                              */
/* ========================================================= */

function isSupporter(c) { return c[TEXT].indexOf("【常】サポーター") != -1; }
function isAdvanceStart(c) { return c[TYPE] == "スタート" && c[TEXT].indexOf("アドバンススタートカード") != -1; }
function isSingleton(c) { return c[TEXT].indexOf("デッキに1枚だけ入れられる") != -1 && c[TYPE] != "スタート"; }

function nameLimit(c)
{
	if(BAN_LIST.indexOf(c[ID]) != -1) return 0;
	if(LIMIT_LIST.indexOf(c[ID]) != -1) return 1;
	if(isSingleton(c)) return 1;
	return SAME_NAME_MAX;
}

function countByName(arr, name)
{
	var n = 0;
	for(var i = 0; i < arr.length; i++) if(arr[i][NAME] == name) n++;
	return n;
}

var toastTimer = null;
function toast(msg)
{
	var el = document.getElementById("auToast");
	if(!el)
	{
		el = document.createElement("div");
		el.id = "auToast";
		el.style.cssText = "position:fixed;left:50%;top:18px;transform:translateX(-50%);background:rgba(40,40,40,0.92);color:#fff;padding:8px 16px;border-radius:8px;z-index:3000;font-size:14px;pointer-events:none;transition:opacity .2s;";
		document.body.appendChild(el);
	}
	el.textContent = msg;
	el.style.opacity = "1";
	clearTimeout(toastTimer);
	toastTimer = setTimeout(function(){ el.style.opacity = "0"; }, 2200);
}

function addDeck(x)
{
	var id = x.alt;
	if(!id) return;
	var c = cardById[id];
	if(!c) return;

	if(c[TYPE] == "スタート")
	{
		if(startArr.length >= START_MAX) { toast("スタートカードは3枚までです"); return; }
		for(var i = 0; i < startArr.length; i++)
		{
			if(startArr[i][CHARA] == c[CHARA]) { toast("同じ【名称】のスタートカードは入れられません"); return; }
		}
		if(isAdvanceStart(c))
		{
			for(i = 0; i < startArr.length; i++)
			{
				if(isAdvanceStart(startArr[i])) { toast("アドバンススタートカードは1枚までです"); return; }
			}
		}
		startArr.push(c);
		sortStart();
	}
	else if(c[TYPE] == "フレーム")
	{
		if(frameArr.length >= FRAME_MAX) { toast("フレームカードはちょうど12枚です"); return; }
		frameArr.push(c);
		sortFrame();
	}
	else
	{
		if(mainArr.length >= MAIN_MAX) { toast("プログレス／アクションはちょうど28枚です"); return; }
		var limit = nameLimit(c);
		if(limit == 0) { toast("禁止カードです"); return; }
		if(countByName(mainArr, c[NAME]) >= limit) { toast("同名カードは" + limit + "枚までです"); return; }
		if(isSupporter(c))
		{
			var sup = 0;
			for(var j = 0; j < mainArr.length; j++) if(isSupporter(mainArr[j])) sup++;
			if(sup >= SUPPORTER_MAX) { toast("サポーターは合計3枚までです"); return; }
		}
		mainArr.push(c);
		sortMain();
	}

	showAlldeck();
}

function delDeck(zone, idx)
{
	var arr = zone == "start" ? startArr : (zone == "frame" ? frameArr : mainArr);
	if(idx >= arr.length) return;
	arr.splice(idx, 1);
	showAlldeck();

	// keep preview in sync with what is now under the cursor
	var img = document.getElementById(zone + "_" + idx);
	if(img) onmouseShow(img, 'deck');
}

function cleardeck()
{
	if(!confirm("It will clear current deck. Are you sure?")) return;
	dataInit();
}

function dataInit()
{
	startArr = [];
	frameArr = [];
	mainArr = [];
	showAlldeck();
}

/* ========================================================= */
/*  Render deck                                               */
/* ========================================================= */

function renderZone(zone, arr, max)
{
	for(var i = 0; i < max; i++)
	{
		var img = $("#" + zone + "_" + i);
		if(i < arr.length) img.attr("src", cardImgSrc(arr[i])).attr("alt", arr[i][ID]);
		else img.attr("src", "img/empty.jpg").attr("alt", "");
	}
}

function setCount(sel, n, max)
{
	$(sel).text(n + " / " + max).removeClass("ok ng").addClass(n == max ? "ok" : (n > max ? "ng" : ""));
}

function showAlldeck()
{
	renderZone("start", startArr, START_MAX);
	renderZone("frame", frameArr, FRAME_MAX);
	renderZone("main", mainArr, MAIN_MAX);

	setCount("#startCount", startArr.length, START_MAX);
	setCount("#frameCount", frameArr.length, FRAME_MAX);
	setCount("#mainCount", mainArr.length, MAIN_MAX);

	var om = 0, sg = 0;
	for(var i = 0; i < frameArr.length; i++) { if(frameArr[i][FRAME] == "Ω") om++; else sg++; }
	$("#frameDetail").text(frameArr.length ? ("(Ω " + om + " / Σ " + sg + ")") : "");

	applyDarkModeImages();
	updatechart();

	if($("#onlyStartColor").prop("checked")) search();
}

/* ========================================================= */
/*  Deck check                                                */
/* ========================================================= */

function checkDeck()
{
	var msgs = [];
	var i, j;
	var sc = startColors();

	if(startArr.length != START_MAX) msgs.push("スタートカードが" + startArr.length + "枚です (3枚必要)");
	if(frameArr.length != FRAME_MAX) msgs.push("フレームカードが" + frameArr.length + "枚です (ちょうど12枚)");
	if(mainArr.length != MAIN_MAX) msgs.push("プログレス／アクションが" + mainArr.length + "枚です (ちょうど28枚)");

	// color restriction
	if(startArr.length > 0)
	{
		var bad = [];
		for(i = 0; i < mainArr.length; i++)
		{
			var c = mainArr[i];
			if(c[COLOR] != "無" && sc.indexOf(c[COLOR]) == -1 && bad.indexOf(c[NAME]) == -1) bad.push(c[NAME]);
		}
		if(bad.length) msgs.push("スタートカードに無い色のカード: " + bad.join("、"));
	}

	// same name / supporter / ban / limit
	var names = {};
	var sup = 0;
	for(i = 0; i < mainArr.length; i++)
	{
		names[mainArr[i][NAME]] = (names[mainArr[i][NAME]] || 0) + 1;
		if(isSupporter(mainArr[i])) sup++;
	}
	for(var n in names)
	{
		for(j = 0; j < mainArr.length; j++) if(mainArr[j][NAME] == n) break;
		var lim = nameLimit(mainArr[j]);
		if(names[n] > lim) msgs.push("「" + n + "」が" + names[n] + "枚です (" + lim + "枚まで)");
	}
	if(sup > SUPPORTER_MAX) msgs.push("サポーターが" + sup + "枚です (合計3枚まで)");

	// start card name / advance
	var adv = [];
	for(i = 0; i < startArr.length; i++) if(isAdvanceStart(startArr[i])) adv.push(startArr[i]);
	if(adv.length > 1) msgs.push("アドバンススタートカードは1枚までです");

	// advance start construction restriction
	for(i = 0; i < adv.length; i++)
	{
		var a = adv[i];
		var m = a[TEXT].match(/\[構築制限\]-([^。]*)。/);
		var violate = false;
		var progress = mainArr.filter(function(c) { return c[TYPE] == "プログレス"; });
		if(a[TEXT].indexOf("スタートカードの色が2つ以内") != -1) violate = sc.length > 2;
		else if(a[TEXT].indexOf("レベルが奇数のみ") != -1) violate = progress.some(function(c) { return parseInt(c[LEVEL], 10) % 2 == 0; });
		else if(a[TEXT].indexOf("レベルが偶数のみ") != -1) violate = progress.some(function(c) { return parseInt(c[LEVEL], 10) % 2 == 1; });
		else if(a[TEXT].indexOf("レベルが4以上のみ") != -1) violate = progress.some(function(c) { return parseInt(c[LEVEL], 10) < 4; });
		else if(a[TEXT].indexOf("レベルが5以下のみ") != -1) violate = progress.some(function(c) { return parseInt(c[LEVEL], 10) > 5; });
		if(violate) msgs.push("「" + a[NAME] + "」の構築制限違反: " + (m ? m[1] : ""));
	}

	// combination restriction
	var ids = {};
	for(i = 0; i < mainArr.length; i++) ids[mainArr[i][ID]] = true;
	for(i = 0; i < startArr.length; i++) ids[startArr[i][ID]] = true;
	for(i = 0; i < COMBINATION_LIST.length; i++)
	{
		var combo = COMBINATION_LIST[i];
		var hit = combo.filter(function(x) { return ids[x]; });
		if(hit.length >= 2)
		{
			msgs.push("コンビネーション制限: " + hit.map(function(x) { return x + "《" + cardById[x][NAME] + "》"; }).join(" と "));
		}
	}

	return msgs;
}

/* ========================================================= */
/*  Charts                                                    */
/* ========================================================= */

function getLegendColor()
{
	return document.body.classList.contains('dark-mode') ? '#e6e6e6' : 'rgb(0, 0, 0)';
}

function makeDoughnut(id, labels, colors)
{
	return new Chart(document.getElementById(id), {
		type: 'doughnut',
		data: {
			labels: labels,
			datasets: [{ data: labels.map(function(){ return 0; }), backgroundColor: colors, hoverOffset: 4 }]
		},
		options: {
			plugins: {
				legend: { display: true, labels: { color: getLegendColor(), font: { size: 11 } } }
			}
		}
	});
}

function buildCharts()
{
	levelobj = makeDoughnut('levelChart', ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8+'],
		['#e0e0e0', '#c8c8c8', '#b0b0b0', '#989898', '#808080', '#686868', '#505050', '#383838']);
	colorobj = makeDoughnut('colorChart', COLOR_ORDER,
		COLOR_ORDER.map(function(c) { return COLOR_HEX[c]; }));
	typeobj = makeDoughnut('typeChart', ['プログレス', 'アクション', 'フレーム'],
		['rgb(255, 159, 64)', 'rgb(255, 99, 132)', 'rgb(201, 203, 207)']);
	frameobj = makeDoughnut('frameChart', ['Ω', 'Σ'],
		['rgb(54, 162, 235)', 'rgb(255, 205, 86)']);
}

function updatechart()
{
	if(!levelobj) return;
	var lv = [0, 0, 0, 0, 0, 0, 0, 0];
	var col = COLOR_ORDER.map(function(){ return 0; });
	var type = [0, 0, frameArr.length];
	var fr = [0, 0];
	var i;

	for(i = 0; i < mainArr.length; i++)
	{
		var c = mainArr[i];
		if(c[TYPE] == "プログレス")
		{
			type[0]++;
			var l = parseInt(c[LEVEL], 10);
			lv[Math.min(Math.max(l, 1), 8) - 1]++;
		}
		else type[1]++;
		var ci = COLOR_ORDER.indexOf(c[COLOR]);
		if(ci >= 0) col[ci]++;
	}
	for(i = 0; i < frameArr.length; i++)
	{
		if(frameArr[i][FRAME] == "Ω") fr[0]++; else fr[1]++;
	}

	levelobj.data.datasets[0].data = lv; levelobj.update();
	colorobj.data.datasets[0].data = col; colorobj.update();
	typeobj.data.datasets[0].data = type; typeobj.update();
	frameobj.data.datasets[0].data = fr; frameobj.update();
}

function updateChartsTheme()
{
	var color = getLegendColor();
	[levelobj, colorobj, typeobj, frameobj].forEach(function(obj) {
		if(obj) { obj.options.plugins.legend.labels.color = color; obj.update(); }
	});
}

/* ========================================================= */
/*  Card preview                                              */
/* ========================================================= */

var bigPicLocked = false;
(function setupBigPicAltLock(){
	function setLocked(v) {
		if(v === bigPicLocked) return;
		bigPicLocked = v;
		window.bigPicLocked = v;
		document.body.classList.toggle('bigpic-locked', v);
	}
	function sync(e) { setLocked(!!e.altKey); }
	window.addEventListener('keydown', function(e) {
		if((e.key === 'Alt' || e.keyCode === 18) && !e.ctrlKey && !e.shiftKey && !e.metaKey) e.preventDefault();
		sync(e);
	}, true);
	window.addEventListener('keyup', sync, true);
	window.addEventListener('mousemove', sync, true);
	window.addEventListener('mouseover', sync, true);
	window.addEventListener('mousedown', sync, true);
	window.addEventListener('blur', function() { setLocked(false); });
})();

function onmouseShow(x, source)
{
	if(bigPicLocked) return;

	if(source == 'search') $('#cardinformation').css('margin', '150px 0px 0px 40px');
	else $('#cardinformation').css('margin', '150px 0px 0px 960px');

	var c = x.alt ? cardById[x.alt] : null;
	if(!c)
	{
		$("#cardinformation").css("visibility", "hidden");
		return;
	}

	$("#cardinformation").css("visibility", "visible");
	$("#big_pic").attr("src", cardImgSrc(c)).attr("alt", c[ID]);
	showInfotable(c);
}

function infoRow(label, value)
{
	return "<tr><td class='label'>" + label + "</td><td>" + value + "</td></tr>";
}

function showInfotable(c)
{
	var str = "";
	if(!c)
	{
		str += infoRow("カード番号", "");
		str += infoRow("カード名", "");
		str += infoRow("種類", "");
		$("#infoTable").html(str);
		return;
	}

	str += infoRow("カード番号", escapeHtml(c[ID]));
	str += infoRow("カード名", escapeHtml(c[NAME]));
	str += infoRow("種類", escapeHtml(c[TYPE]) + "カード");

	if(c[TYPE] != "フレーム")
	{
		str += infoRow("色", "<i class='color-chip' style='background:" + COLOR_HEX[c[COLOR]] + "'></i>" + escapeHtml(c[COLOR]));
		str += infoRow("レベル", escapeHtml(c[LEVEL]));
	}
	if(c[ATK] !== "")
	{
		str += infoRow("ATK / DEF", escapeHtml(c[ATK]) + " / " + escapeHtml(c[DEF]));
		str += infoRow("STK", escapeHtml(c[STK]));
	}
	if(c[FRAME]) str += infoRow("リンクフレーム", escapeHtml(c[FRAME]));
	if(c[CHARA]) str += infoRow("名称", escapeHtml(c[CHARA]));
	str += infoRow("収録", escapeHtml(productLabel(c[PRODUCT])));

	var limitNote = [];
	if(BAN_LIST.indexOf(c[ID]) != -1) limitNote.push("禁止カード");
	if(LIMIT_LIST.indexOf(c[ID]) != -1) limitNote.push("制限カード (1枚)");
	for(var i = 0; i < COMBINATION_LIST.length; i++)
	{
		if(COMBINATION_LIST[i].indexOf(c[ID]) != -1)
		{
			var others = COMBINATION_LIST[i].filter(function(x){ return x != c[ID]; });
			limitNote.push("コンビネーション制限 (" + others.map(function(x){ return x + "《" + cardById[x][NAME] + "》"; }).join("、") + ")");
		}
	}
	if(limitNote.length) str += infoRow("<span style='color:#c62828;margin-top:0px;'>制限</span>", escapeHtml(limitNote.join(" / ")));

	if(c[TEXT]) str += "<tr><td colspan='2'>" + formatText(c[TEXT]) + "</td></tr>";

	var comment = "";
	try { comment = localStorage.getItem(c[ID] + COMMENT_SUFFIX) || ""; } catch(e) {}
	str += "<tr><td colspan='2'><textarea id='comment' placeholder='Comment' style='width: 96%; height: 40px; resize: vertical;' onchange=\"setComment('" + c[ID] + "')\">" + escapeHtml(comment) + "</textarea></td></tr>";

	$("#infoTable").html(str);
}

function formatText(t)
{
	// t already uses <br>; escape everything else
	return t.split("<br>").map(function(line) {
		var s = escapeHtml(line);
		s = s.replace(/(【LINK\(\d+\)-[^】]*】)/g, "<b style='color:#c2185b'>$1</b>");
		s = s.replace(/(【EX:[^】]*】)/g, "<b style='color:#1565c0'>$1</b>");
		s = s.replace(/(【(?:自|常|起|条件)[^】]*】)/g, "<b>$1</b>");
		return s;
	}).join("<br>");
}

function setComment(id)
{
	try {
		var v = $("#comment").val();
		if(v != "") localStorage.setItem(id + COMMENT_SUFFIX, v);
		else localStorage.removeItem(id + COMMENT_SUFFIX);
	} catch(e) {}
}

/* ========================================================= */
/*  Popup windows                                             */
/* ========================================================= */

function showPopup(containerId)
{
	var el = document.getElementById(containerId);
	el.style.display = "block";
	window.onmousedown = function(e) {
		if(e.target == el) el.style.display = "none";
	};
}

function openWindow(x)
{
	if(x == "view")
	{
		showDeckView();
		showPopup("window-container");
	}
	else
	{
		showList();
		showPopup("window-container-list");
	}
}

function viewRow(title, arr, w, h)
{
	var s = "<div class='view-row'><span class='view-title'>" + title + " (" + arr.length + ")</span>";
	for(var i = 0; i < arr.length; i++)
	{
		s += "<img width='" + w + "px' height='" + h + "px' src='" + cardImgSrc(arr[i]) + "' alt='' title='" + escapeHtml(arr[i][ID] + " " + arr[i][NAME]) + "'>";
	}
	return s + "</div>";
}

function showDeckView()
{
	var str = "";
	var title = $("#selectDeck").val() || "";
	if(title) str += "<div style='font-size:20px;font-weight:bold;margin-bottom:8px;'>" + escapeHtml(title) + "</div>";
	str += viewRow("スタートカード", startArr, 172, 240);
	str += viewRow("フレームカード", frameArr, 120, 168);
	str += viewRow("プログレス／アクション", mainArr, 120, 168);
	$("#deckView").html(str);
}

function groupList(arr)
{
	var list = [];
	for(var i = 0; i < arr.length; i++)
	{
		var found = false;
		for(var j = 0; j < list.length; j++)
		{
			if(list[j][0][ID] == arr[i][ID]) { list[j][1]++; found = true; break; }
		}
		if(!found) list.push([arr[i], 1]);
	}
	return list;
}

function listTable(title, arr)
{
	var g = groupList(arr);
	var s = "<br><b>" + title + " (" + arr.length + ")</b><br><br><table>";
	for(var i = 0; i < g.length; i++)
	{
		var c = g[i][0];
		var info = c[TYPE] == "フレーム" ? c[FRAME] : (c[COLOR] + " Lv" + c[LEVEL]);
		s += "<tr><td style='width: 30px;'>" + g[i][1] + "</td><td style='width: 90px;'>" + escapeHtml(c[ID]) + "</td><td style='width: 90px;'>" + escapeHtml(info) + "</td><td>" + escapeHtml(c[NAME]) + "</td></tr>";
	}
	return s + "</table>";
}

function showList()
{
	var str = "<table><tr><td style='vertical-align: top;'>";
	str += listTable("スタートカード", startArr);
	str += listTable("フレームカード", frameArr);
	str += listTable("プログレス／アクション", mainArr);
	str += "</td><td style='vertical-align: top; padding-left: 60px;'>";

	// chara breakdown
	var charas = {};
	for(var i = 0; i < mainArr.length; i++)
	{
		var cs = splitChara(mainArr[i]);
		if(mainArr[i][TYPE] == "アクション") cs = ["(アクション)"];
		for(var j = 0; j < cs.length; j++) charas[cs[j]] = (charas[cs[j]] || 0) + 1;
	}
	str += "<br><b>名称別</b><br><br><table>";
	for(var k in charas) str += "<tr><td style='width: 30px;'>" + charas[k] + "</td><td>" + escapeHtml(k) + "</td></tr>";
	str += "</table></td></tr></table>";
	$("#decklist").html(str);
}

/* ========================================================= */
/*  Deck code / save / load                                   */
/* ========================================================= */

function buildCode()
{
	var ids = function(arr) { return arr.map(function(c) { return c[ID]; }); };
	return ["start"].concat(ids(startArr)).join(",") + "\n" +
		["frame"].concat(ids(frameArr)).join(",") + "\n" +
		["main"].concat(ids(mainArr)).join(",");
}

function parseCode(text)
{
	var s = [], f = [], m = [], unknown = [];
	var lines = String(text || "").replace(/\r/g, "").split("\n");
	for(var i = 0; i < lines.length; i++)
	{
		var parts = lines[i].split(",").map(function(x) { return x.trim(); }).filter(function(x) { return x != ""; });
		if(parts.length == 0) continue;
		var head = parts.shift().toLowerCase();
		for(var j = 0; j < parts.length; j++)
		{
			var c = cardById[parts[j]];
			if(!c) { unknown.push(parts[j]); continue; }
			if(c[TYPE] == "スタート") s.push(c);
			else if(c[TYPE] == "フレーム") f.push(c);
			else m.push(c);
		}
	}
	return { start: s, frame: f, main: m, unknown: unknown };
}

function applyCode(text)
{
	var r = parseCode(text);
	startArr = r.start.slice(0, START_MAX);
	frameArr = r.frame.slice(0, FRAME_MAX);
	mainArr = r.main.slice(0, MAIN_MAX);
	sortStart(); sortFrame(); sortMain();
	showAlldeck();
	if(r.unknown.length) toast("不明なカード番号: " + r.unknown.join(", "));
}

function openCodeWindow()
{
	$("#textCode").val(buildCode());
	$("#deckTitle").val($("#selectDeck").val() || $("#deckTitle").val() || "Simple Deck");
	$("#deckStr").html("&emsp;");
	showPopup("window-container-code");
}

function loadFromCode()
{
	applyCode($("#textCode").val());
	$("#deckStr").html("Deck code loaded.");
}

function downloadDeck()
{
	var content = buildCode();
	$("#textCode").val(content);
	var blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
	var a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.setAttribute('download', ($("#deckTitle").val() || "deck") + ".csv");
	a.click();
}

function readSingleFile(evt)
{
	var f = evt.target.files[0];
	if(!f) { alert("Failed to load file"); return; }
	$("#deckTitle").val(f.name.replace(/\.(csv|txt)$/i, ""));
	var r = new FileReader();
	r.onload = function(e) {
		$("#textCode").val(e.target.result);
		applyCode(e.target.result);
		$("#deckStr").html("Deck file loaded.");
	};
	r.readAsText(f);
	$("#fileinput").val("");
}

function copyClipboard()
{
	var t = document.querySelector('#textCode');
	t.select();
	try {
		if(navigator.clipboard) navigator.clipboard.writeText(t.value);
		else document.execCommand('copy');
	} catch(e) { document.execCommand('copy'); }
	$("#deckStr").html("Deck code copied!");
}

function saveDeckNameList()
{
	try { localStorage.setItem(DECK_LIST_KEY, JSON.stringify(deckNamelist)); } catch(e) {}
}

function onloaddeck()
{
	try {
		deckNamelist = JSON.parse(localStorage.getItem(DECK_LIST_KEY)) || [];
	} catch(e) {
		deckNamelist = [];
	}
	updateDecklist("");
}

function updateDecklist(select)
{
	var str = "<option value=''>--Select Deck--</option>";
	for(var i = 0; i < deckNamelist.length; i++)
	{
		var n = escapeHtml(deckNamelist[i]);
		str += "<option value='" + n + "'" + (select == deckNamelist[i] ? " selected" : "") + ">" + n + "</option>";
	}
	$("#selectDeck").html(str);
}

function selectDeck()
{
	var deck = $("#selectDeck").val();
	if(!deck) { dataInit(); return; }
	var code = "";
	try { code = localStorage.getItem(DECK_KEY_PREFIX + deck) || ""; } catch(e) {}
	applyCode(code);
}

function addDecklist()
{
	var title = $.trim($("#deckTitle").val());
	if(title == "") { alert("Do not set empty string as title."); return; }

	var exists = deckNamelist.indexOf(title) != -1;
	if(exists && !confirm("Deck exist. Do you want to overwrite it?")) return;

	applyCode($("#textCode").val());
	try { localStorage.setItem(DECK_KEY_PREFIX + title, buildCode()); } catch(e) { alert("Failed to save deck."); return; }
	if(!exists) deckNamelist.push(title);
	saveDeckNameList();
	updateDecklist(title);
	$("#deckStr").html("Deck has been added.");
}

function deletedecklist()
{
	var deck = $("#selectDeck").val();
	if(!deck) return;
	if(!confirm("It will delete this deck. Are you sure?")) return;
	try { localStorage.removeItem(DECK_KEY_PREFIX + deck); } catch(e) {}
	var idx = deckNamelist.indexOf(deck);
	if(idx != -1) deckNamelist.splice(idx, 1);
	saveDeckNameList();
	updateDecklist("");
	dataInit();
}

function resetAllDecks()
{
	if(!confirm("Delete ALL saved decks? This cannot be undone.")) return;
	for(var i = 0; i < deckNamelist.length; i++)
	{
		try { localStorage.removeItem(DECK_KEY_PREFIX + deckNamelist[i]); } catch(e) {}
	}
	deckNamelist = [];
	saveDeckNameList();
	updateDecklist("");
	$("#deckStr").html("All saved decks were deleted.");
}

/* ========================================================= */
/*  Comment manager                                           */
/* ========================================================= */

function collectCurrentComments()
{
	var obj = {};
	try {
		for(var i = 0; i < localStorage.length; i++)
		{
			var k = localStorage.key(i);
			if(k && k.length > COMMENT_SUFFIX.length && k.slice(-COMMENT_SUFFIX.length) == COMMENT_SUFFIX)
			{
				obj[k.slice(0, -COMMENT_SUFFIX.length)] = localStorage.getItem(k);
			}
		}
	} catch(e) {}
	return obj;
}

function openCommentManager()
{
	$("#textCommentCode").val(JSON.stringify(collectCurrentComments(), null, 2));
	$("#commentStr").html("&emsp;");
	showPopup("window-container-comment");
}

function applyCommentText()
{
	var obj;
	try { obj = JSON.parse($("#textCommentCode").val()); } catch(e) { $("#commentStr").html("Invalid JSON."); return; }
	var n = 0;
	for(var k in obj)
	{
		if(!cardById[k]) continue;
		try {
			if(obj[k]) localStorage.setItem(k + COMMENT_SUFFIX, String(obj[k]));
			else localStorage.removeItem(k + COMMENT_SUFFIX);
			n++;
		} catch(e) {}
	}
	$("#commentStr").html(n + " comment(s) applied.");
}

function downloadCommentBlob()
{
	var content = JSON.stringify(collectCurrentComments(), null, 2);
	var blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
	var a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.setAttribute('download', "ange_unite_comment.json");
	a.click();
}

function copyCommentClipboard()
{
	var t = document.querySelector('#textCommentCode');
	t.select();
	try {
		if(navigator.clipboard) navigator.clipboard.writeText(t.value);
		else document.execCommand('copy');
	} catch(e) { document.execCommand('copy'); }
	$("#commentStr").html("Comment copied!");
}

function readSingleCommentFile(evt)
{
	var f = evt.target.files[0];
	if(!f) return;
	var r = new FileReader();
	r.onload = function(e) {
		$("#textCommentCode").val(e.target.result);
		applyCommentText();
	};
	r.readAsText(f);
	$("#commentFileinput").val("");
}

function resetAllComments()
{
	if(!confirm("Delete ALL comments? This cannot be undone.")) return;
	var obj = collectCurrentComments();
	for(var k in obj)
	{
		try { localStorage.removeItem(k + COMMENT_SUFFIX); } catch(e) {}
	}
	$("#textCommentCode").val("{}");
	$("#commentStr").html("All comments were deleted.");
}

/* ========================================================= */
/*  Dark mode                                                 */
/* ========================================================= */

function updateDarkModeButton()
{
	var btn = document.getElementById('darkModeToggle');
	if(btn) btn.textContent = document.body.classList.contains('dark-mode') ? '☀ Light' : '🌙 Dark';
}

function swapImageForDarkMode(img, isDark)
{
	var src = img.getAttribute('src');
	if(!src || src.indexOf("img/") != 0) return;
	var pairs = [["empty.jpg", "empty_black.jpg"], ["cancel_icon.png", "cancel_icon_black.png"], ["larrow.png", "larrow_black.png"], ["rarrow.png", "rarrow_black.png"]];
	for(var i = 0; i < pairs.length; i++)
	{
		if(isDark && src == "img/" + pairs[i][0]) { img.setAttribute('src', "img/" + pairs[i][1]); return; }
		if(!isDark && src == "img/" + pairs[i][1]) { img.setAttribute('src', "img/" + pairs[i][0]); return; }
	}
}

function applyDarkModeImages()
{
	var isDark = document.body.classList.contains('dark-mode');
	var imgs = document.getElementsByTagName('img');
	for(var i = 0; i < imgs.length; i++) swapImageForDarkMode(imgs[i], isDark);
}

function toggleDarkMode()
{
	document.body.classList.toggle('dark-mode');
	var isDark = document.body.classList.contains('dark-mode');
	try { localStorage.setItem('au_dark_mode', isDark ? '1' : '0'); } catch(e) {}
	updateDarkModeButton();
	updateChartsTheme();
	applyDarkModeImages();
}

/* ========================================================= */
/*  About                                                     */
/* ========================================================= */

function showVersion()
{
	var str = "";
	str += "ANGE UNITE Deck Builder\n";
	str += "(based on WIXOSS_deckeditor by ZZZ)\n";
	str += "\n";
	str += "20261028 v1.00\n";
	str += "1.First release.\n";
	str += "2.收錄固定セット第1～6弾、ブリリアントパック Vol.1～6 (フレーム異圖)、プロモ新規カード (PR-029～PR-048)\n";
	str += "3.構築チェック：スタート3／フレーム12／プログレス・アクション28、色、同名3枚、サポーター、アドバンススタート、コンビネーション制限\n";
	str += "\n";
	str += "資料來源: アンジュ・ユナイト -Ange Unite- Wiki\n";
	str += "卡圖來源: アンジュ・ユナイト OFFICIAL SITE (プロモ新規カードは官網無圖)\n";

	alert(str);
}
