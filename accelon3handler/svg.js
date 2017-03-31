const svg=function(tag,isclosing,kpos){
	if (!isclosing)return
	const url=tag.attributes.url||tag.attributes.src||tag.attributes.n;
	const fn="svg/"+url;
	const inline=tag.attributes.inline;
	var svgcontent;
	if (this.opts.images && this.opts.images[n]) {
		svgcontent=this.opts.images[n];
		const m=svgcontent.match&&svgcontent.indexOf(/data.+,/)==0;//is Data URL?
		if (!m) {
			svgcontent=new Buffer(svgcontent).toString('utf8');
		} else {
			svgcontent=svgcontent.substr(m[0].length);
		}
	} else {
		const fs=require("fs");
		if (fs.existsSync(fn)){
			svgcontent=fs.readFileSync(fn,"utf8");
		}
	}
	if (svgcontent){
		this.putArticleField("svg", svgcontent , this.makeRange(kpos,this.kPos));		
	}
}

module.exports=svg;