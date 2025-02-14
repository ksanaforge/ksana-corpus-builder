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
		this.log("error","wrong page number "+page+", prev:"+prevpage+",line:"+(this.parser.line()+1)
			+",file:"+this.filename);
	}
	this._pb=page;
	this._pbline=0;
	const kpos=this.makeKPos(this.bookCount,page-1,0,0);
	this.setPos(kpos,this.tPos);
	prevpage=page;
}
var maxarticlelen=0,prevtpos=0;
const article=function(tag,closing,kpos,tpos, start,end){
	if (closing) {
		var caption=this.substring(start,end);
		if (!caption && tag.attributes.t) {
			caption=caption;
		}
		this.putArticle(caption,kpos,tpos);
		const range=this.makeRange(kpos,this.kPos);
		if (this.kPos>kpos) {
			this.putArticleField("rend","article",range);
		}
	}
}
const p=function(tag,closing){
	if (closing) return;
	this.putEmptyArticleField("p");
}
const origin=function(tag){
	const from=tag.attributes.from;
	if (from) {
		this.putArticleField("origin",from);
	} else {
		console.error("origin missing from attribute");
	}
}
const group=function(tag,closing,kpos,tpos,start,end){
	if (closing) {
		var name=this.content.substring(start,end);
		if (!name && tag.attributes.t) {
			name=name;
		}
		this.putGroup(name,kpos,tpos);	
	}
}
const tag=function(tag,closing,kpos,tpos){
	if (closing) {

		const range=this.makeRange(kpos,this.kPos);
		this.putArticleField("rend","tag",range);
	}
}
const category=function(tag,closing,kpos,tpos){

}

module.exports={p:p,pb:pb,article:article,
group:group,category:category,origin:origin,tag:tag,
	maxArticle:function(){return maxarticlelen}};