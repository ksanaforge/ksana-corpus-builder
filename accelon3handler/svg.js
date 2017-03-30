const svg=function(tag,isclosing,kpos){
	const url=tag.attributes.url||tag.attributes.src||tag.attributes.n;
	const fn="svg/"+url.substr(0,3)+'/'+url;
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
	} 
	if (svgcontent){
		this.putArticleField("inlinesvg", svgcontent , this.makeRange(kpos,this.kPos));		
	}
}

module.exports=svg;