/*
	given a string , return count
*/
var {parseIDS}=require("./tokenizer");
const classical_chinese=function(t){
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
			var c=parseIDS(t.substr(i));
			r++;
			i+=c;
		} else if (code>32 && code!==0x3000 && code>=0x2e80) {
			r++;
		}
		i++;
	}
	return r;
}

const getRawToken=function(obj){
	var i=0,r=0;
	var t=obj.str;
	code=t.charCodeAt(i);
	if ((code>=0x3400 && code<=0x9fff)
			||(code>=0x3040 && code<=0x30FF) //kana
			||(code>=0xE000 && code<=0xFAFF) //pua && supplement
			||(code>=0x2e80 && code<=0x2fff) //radicals
			||(code>=0x3100 && code<=0x31BF) //bopomofo
			|| (code>=0xd800&&code<=0xdfff)) {
		i++;
		if (code>=0xd800&&code<=0xdfff) i++;
	} else if (code>=0x2ff0&&code<=0x2fff) {
		var c=parseIDS(t.substr(i));
		i+=c;
	} else if (code>0x20 && code<1024 ) {
		i++;
		while (i<t.length && t.charCodeAt(i)<1024) {
			i++;
		}
	} else {
		i++;
	}

	//tailing blank
	while (i<t.length && (t.charCodeAt(i)<=32 || t[i]==="　"))i++;

	obj.str=t.substr(i);
	return t.substr(0,i);
}
module.exports={cjk,classical_chinese,getRawToken,parseIDS};