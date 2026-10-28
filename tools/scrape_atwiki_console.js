/*
	ANGE UNITE カードデータ更新用スクリプト
	使い方:
	  1. ブラウザで https://w.atwiki.jp/angeunite/ を開く
	  2. F12 → Console にこのファイルの内容を貼り付けて実行
	  3. 終わると cardData の行 (card_info.js の "var cardData = [" ～ "];" の中身) が
	     card_rows.txt としてダウンロードされる → js/card_info.js の中身と差し替える
	  ※新弾が出たら SET_PAGES に wiki のページ番号を追加すること
	  ※PRODUCT_LIST (card_info.js) にも商品を追加すること
*/
(async () => {
	const SET_PAGES = { '1':'10','B1':'11','2':'105','B2':'106','3':'175','B3':'176','4':'245','B4':'246','5':'314','B5':'315','6':'317','B6':'318','PR':'56','PRN':'457' };
	const parse = t => new DOMParser().parseFromString(t, 'text/html');
	const links = [];
	for (const [k, p] of Object.entries(SET_PAGES)) {
		const d = parse(await (await fetch('/angeunite/pages/' + p + '.html')).text());
		d.querySelectorAll('#wikibody a').forEach(a => {
			if (/《/.test(a.textContent)) links.push([k, a.textContent.trim(), a.getAttribute('href'), (a.previousSibling?.textContent || '').trim().slice(-12)]);
		});
	}
	const byUrl = {};
	for (const [k, name, u, num] of links) {
		const m = num.match(/(PR-\d+(?:\/\d-\d+)?|\d-\d{3}F?P?)$/);
		(byUrl[u] = byUrl[u] || []).push({ k, num: m ? m[1] : '', lt: name.replace(/^《/, '').replace(/》/, '') });
	}
	const rows = [];
	for (const [u, arr] of Object.entries(byUrl)) {
		const d = parse(await (await fetch(u)).text());
		const b = d.querySelector('#wikibody');
		const bq = b.querySelector('blockquote');
		if (!bq) continue;
		const tags = [...b.querySelectorAll('.atwiki-tags-wrap a.atwiki-tag-frame')].map(a => a.textContent.trim());
		const h2 = (b.querySelector('h2')?.textContent || '').trim();
		let e = arr.find(x => /^\d$/.test(x.k) && /^\d-\d{3}$/.test(x.num)), id, prod;
		if (e) { id = e.num; prod = e.k; }
		else if ((e = arr.find(x => /F$/.test(x.num)))) { id = e.num; prod = 'B' + id[0]; if (h2.includes('sigma') && /-066F$/.test(id)) id = id.replace('066F', '067F'); }
		else if ((e = arr.find(x => /^PR-\d+$/.test(x.num)))) { id = e.num; prod = 'PR'; }
		else if (h2.includes('omega')) { id = 'omega'; prod = '1'; e = arr[0]; }
		else if (h2.includes('sigma')) { id = 'sigma'; prod = '1'; e = arr[0]; }
		else continue;
		const ls = bq.innerText.split('\n').map(s => s.trim()).filter(Boolean);
		const type = ls[0].replace('カード', '');
		let color = '', level = '', atk = '', def = '', stk = '', frame = '', i = 1;
		const m = (ls[1] || '').match(/^レベル(\d+)\/(.)\/(?:ATK(\d+)\/DEF(\d+)\/STK(\d+))?/);
		if (m) { [, level, color, atk, def, stk] = m.map(x => x || ''); i = 2; }
		if (ls[i] && ls[i].startsWith('リンクフレーム')) { frame = ls[i].split(/[:：]/)[1]; i++; }
		let text = '';
		for (const s of ls.slice(i)) text += (text && s.startsWith('【') ? '<br>' : '') + s;
		const name = e.lt || h2.replace(/^《|》/g, '');
		const chara = (type === 'プログレス' || type === 'スタート') ? name.split(/[ 　]/).pop() : '';
		const tag = tags.filter(t => !/^(プログレスカード|アクションカード|スタートカード|フレームカード|レベル\d+|ATK\d+|DEF\d+|STK\d+|[青黒赤白緑無]|Ω|Σ|∀|LINK\(\d+\))$/.test(t)).join(' ');
		rows.push([id, name, type, color, level, atk, def, stk, frame, chara, prod, text, tag]);
	}
	const key = r => r[0] === 'omega' ? '0a' : r[0] === 'sigma' ? '0b' : r[0].startsWith('PR') ? '9' + r[0] : r[0];
	const pi = r => r[10] === 'PR' ? 99 : +r[10].replace('B', '');
	rows.sort((a, b) => pi(a) - pi(b) || (key(a) < key(b) ? -1 : 1));
	const out = rows.map(r => '\t' + JSON.stringify(r) + ',').join('\n');
	const a = document.createElement('a');
	a.href = URL.createObjectURL(new Blob([out], { type: 'text/plain' }));
	a.download = 'card_rows.txt';
	a.click();
	console.log(rows.length + ' cards');
})();
