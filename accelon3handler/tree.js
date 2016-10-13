var treetag=[];
var knowntag={"檔":true};
var ignoretags={頁:true,段:true,註:true,
	釋:true,RM:true,RN:true,P:true,PB:true,圖:true,IMAGE:true,IMG:true,
	圖文字:true,
};
const prolog=function(tag,parser){
	if (ignoretags[tag.name])return treetag;
	var t=tag.attributes.t,l=tag.attributes.l;
	var stoping=false;
	var tags=[];
	if (t) { //tree tag
		//console.log("tree",t);
		if (t[t.length-1]==".") {
			t=t.substr(0,t.length-1);
			stoping=true;
		}
		tags=t.split(",");
		const at=treetag.indexOf(tag.name);
		if (at>-1) {
			treetag.length=at+1;
		} else treetag=[tag.name];
		if (tags.length) treetag=treetag.concat(tags);
	}
	if (l) { //leaf tag
		//console.log("leaf",l);
		tags=tags.concat(l.split(","));
	}

	if (tags){
		for (var i=0;i<tags.length;i++) knowntag[tags[i]]=true;		
	}

	const depth=treetag.indexOf(tag.name);
	if (depth==-1 &&!knowntag[tag.name]) {
		console.warn("unknown tag",tag.name,"at line",parser.line);
	}
	return treetag;
}


module.exports=prolog;