const tags=require("./tags");

const longPB=/\d+\.(\d+)([abcd]?)/
const shortPB=/(\d+)([abcd]?)/
const addTag=function(tag){
	const tt=tags.tagType(tag[0]);
	if (tt==tags.TT_PB) {
		const pb=tag.substr(1);
		var m=pb.match(longPB);
		if (!m) {
			m=pb.match(shortPB);
		} 
		if (!m) {
			this.log("error","wrong pb "+pb
				+" previous:"+this.stringify(this.kPos));
			return;
		}

		var pagenumber=parseInt(m[1],10)-1;

		if (this.addressPattern.column) {
			const col= (m[2]||"a")
			pagenumber=pagenumber*this.addressPattern.column+
			(parseInt(m[2],36)-10);
		}
		this._pbline=0;
		this._pb=pagenumber+1;
		if (pagenumber==0) {
			this.addBook();
		}
		const _kpos=this.makeKPos(this.bookCount,this._pb-1,this._pbline,0);
		this.newLine(_kpos);
	}
}
const addArticle=function(article){
	this.putArticle(article);
}
const addGroup=function(group){
	this.putGroup(group);
}
module.exports={addTag:addTag,addArticle:addArticle,addGroup:addGroup};