/*
	given a string , return count
*/
var classical_chinese=function(t){
	var i=0,r=0;
	while (i<t.length) {
		var code=t.charCodeAt(i);
		if ((code>=0x3400 && code<=0x9fff)
			||(code>=0x3040 && code<=0x30FF) //kana
			||(code>=0xE000 && code<=0xFAFF) //pua && supplement
			||(code>=0x2e80 && code<=0x2fff) //radicals
			||(code>=0x3100 && code<=0x31BF) //bopomofo
			) {
			r++;
		} else if (code>=0xd800&&code<=0xdfff) {
			r++;
			i++;
		} else if (code>=0x2ff0&&code<=0x2fff) {
			throw "ids not supported yet"
		}

		i++;
	}
	return r;
}
var cjk=function(t){
	var i=0,r=0;
	while (i<t.length){
		code=t.charCodeAt(i);
		if (code>=0xd800&&code<=0xdfff) {
			r++;
			i++;
		} else if (code>=0x2ff0&&code<=0x2fff) {
			throw "ids not supported yet"
		} else if (code>32 && code!==0x3000 && code>=0x2e80) {
			r++;
		}
		i++;
	}
	return r;
}

module.exports={cjk,classical_chinese};