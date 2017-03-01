var prevpage=0;
const pb=function(tag,closing){
	const n=tag.attributes.id || tag.attributes.n;
	if (!n){
		return;
	}


	var pbn=n.split(/[\.p]/);
	var page=parseInt(pbn.length==2?pbn[1]:pbn[0],10);

	if (page===1) {
		this.addBook();
	} else if (page!==prevpage+1) {//newpage

		console.error("wrong page number "+page+", prev:"+prevpage);
	}
	this._pb=page;
	this._pbline=0;
	const kpos=this.makeKPos(this.bookCount,page-1,0,0);
	this.setPos(kpos,this.tPos);
	prevpage=page;
}
var maxarticlelen=0,prevtpos=0;
const article=function(tag,closing,kpos,tpos){
	if (closing) {
		const caption=this.popText();
		this.addText(caption);
		this.putArticle(caption,kpos,tpos);
	} else {
		const tree=tag.attributes.t;
		if (this.tPos-prevtpos>maxarticlelen) maxarticlelen=this.tPos-prevtpos;
		prevtpos=this.tPos;
		return true;
	}
}
const p=function(tag,closing){
	if (closing) return;
	this.putEmptyArticleField("p");
}
const origin=function(tag){
	const from=tag.attributes.from;
	if (from) {
		this.putAritcleField("origin",from);
	} else {
		console.error("origin missing from attribute");
	}
}
module.exports={p:p,pb:pb,article:article,maxArticle:function(){return maxarticlelen}};