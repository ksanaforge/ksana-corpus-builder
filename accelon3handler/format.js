var page,prevpage=0,pageKPos=0;
const pb=function(tag,closing){
	const s=this.popBaseText();
	if (s) {
		const lines=s.trim().split("\n");

		for (var i=0;i<lines.length;i++) {
			const kpos=this.makeKPos(this.bookCount-1,prevpage-1,i,0);
			if (kpos==-1) {
				console.log("error kpos",this.bookCount-1,prevpage-1,i);
			}
			try{
				this.newLine(kpos, this.tPos);	
			} catch(e) {
				debugger;
				console.log(e)
			}
			
			this.putLine(lines[i]);
		}
	}


	const n=tag.attributes.id;
	if (!n || n.indexOf("p")==-1){
		return;
	}
	var pbn=n.split(/[\.p]/);
	page=parseInt(pbn.length==2?pbn[1]:pbn[0],10);

	if (page===1) {
		this.addBook();
	} else if (page!==prevpage+1) {//newpage
		debugger;
		throw "wrong page number "+page+", prev:"+prevpage;		
	}
	prevpage=page;
	pageKPos=this.makeKPos(this.bookCount-1,page,0,0);
}
var maxarticlelen=0, prevtpos=0;
const article=function(tag,closing){
	if (closing) {
		const caption=this.popText();
		this.putField("article",caption,this.wenPos);
	} else {
		const tree=tag.attributes.t;
		this.wenPos=this.kPos;
		if (this.tPos-prevtpos>maxarticlelen) maxarticlelen=this.tPos-prevtpos;
		prevtpos=this.tPos;
		return true;
	}
}
const p=function(tag,closing){
	if (closing) return;
	this.putEmptyBookField("p");
}
module.exports={p,pb,article,maxArticle:()=>maxarticlelen};