const loadsvg=require("./loadsvg");
const svg=function(tag,isclosing,kpos){
	if (!isclosing)return
	const url=tag.attributes.url||tag.attributes.src||tag.attributes.n;
	var svgcontent=loadsvg.call(this,url);
	if (svgcontent){
		this.putArticleField("svg", svgcontent , this.makeRange(kpos,this.kPos));		
	} else {
		this.log("error","cannot load "+url);
	}
}

module.exports=svg;