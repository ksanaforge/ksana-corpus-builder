const tags=require("./tags");

const longPB=/\d+\.(\d+)([abcd]?)/
const shortPB=/(\d+)([abcd]?)/
const encodeTreeItem=require("../tree").encodeTreeItem;

var tocobj={}, treekpos=0 ,treeitems=[];
const closeTree=function(){
	if (treeitems.length){
		this.putField("toc",treeitems,treekpos);
		this.putField("tocrange",tocobj.kpos,treekpos);
		treeitems=[];	
	}
}

const addLineTag=function(tag){
	const tt=tags.tagType(tag[0]);
 	if (tt==tags.TT_HEAD) {
		const head=tag.substr(1);
		const depth=parseInt(head);
 		tag=tag.substr(1);
		const text=isNaN(depth)?head:tag.substr(depth.toString().length).trim();
		tocobj={depth:depth,text:text,kpos:this.kPos};
		treeitems.push(encodeTreeItem(tocobj));
	} else if (tt==tags.TT_ARTICLE) {
		var group=false;
		tag=tag.substr(1);
		if (tags.tagType(tag[0])==tags.TT_ARTICLE){
			group=true;
			tag=tag.substr(1);
		}
		group?addGroup.call(this,tag):addArticle.call(this,tag);
	}
}
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
		return true;//remove crlf
	} else if (tt==tags.TT_P){
		this.putEmptyArticleField("p");
	}
}
const addArticle=function(article){
	this.putArticle(article);
}
const addGroup=function(group){
	closeTree.call(this);
	treekpos=this.kPos;
	this.putGroup(group);
}
const finalize=function(){
	closeTree.call(this);
}
module.exports={addTag:addTag,addLineTag:addLineTag,
	addArticle:addArticle,addGroup:addGroup,
closeTree:closeTree,finalize:finalize};