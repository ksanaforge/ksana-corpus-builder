const article=function(tag,closing,kpos,tpos,start,end){
	if (closing) {
		const name=this.substring(start,end).replace(/<.+?>/g,"");
		this.putArticle(name,kpos,tpos);
		const range=this.makeRange(kpos,this.kPos);
		this.putArticleField("rend","article",range);		
	}
}
const articlegroup=function(tag,closing,kpos,tpos,start,end){
	if (closing){
		const name=this.substring(start,end).replace(/<.+?>/g,"");
		this.putGroup(name,kpos);		
	}
}

const lb=function(tag){
	const n=tag.attributes.n;
	if (!n || n.indexOf(".")==-1){
		//a lb without n in y01 a19.11
		//or lb n has no .  y13.xml page 132~137,not seen by engine.
		return;
	}
	var pbn=n.split(".");
	const str_page=pbn[0],	str_line=pbn[1];

	var page=parseInt(str_page,10), line=parseInt(str_line,10);
	if (isNaN(page)) page=parseInt(str_page.substr(1),10);
	if (page<1) {
		console.log("negative page number, ",tag.name,"n=",tag.attributes.n);
		throw "negative page number";
		return;
	}

	this.emitLine();

	if (this._pb!==str_page && page===1) {
		this.addBook();
	} else {
		if (line!=1 && line-this._pbline>1) {
			console.log("Gap at page ",page,"line ",line,",previous line",this._pbline);
		}
	}

	if (isNaN(page)) {
		throw "error page number "+str_page;
	}
	if (this.bookCount){
		const kpos=this.makeKPos(this.bookCount,page-1,line-1,0);
		if (kpos==-1) {
			throw "error lb "+tag.attributes.n;
		}
		this.newLine(kpos);
	}
	this._pb=str_page;
	this._pbline=line;	
}

var treeitems=[];
var treekpos;
const head_finalize=function(){
	this.putField("toc",treeitems,treekpos);
	this.putField("tocrange",this.kPos,treekpos);
}
const div=function(tag,closing,kpos,tpos,start,end){
	if (closing) {
		this._divdepth--;
	} else {
		this._divdepth++;
	}
}
const head=function(tag,closing,kpos,tpos,start,end){
	if (closing){
		const depth=this._divdepth;
		if (depth==1) { //new subtoc
			if (treeitems.length) {
				this.putField("toc",treeitems,treekpos);
				this.putField("tocrange",this.kPos,treekpos);
				treeitems=[];
			}
			treekpos=this.kPos;
			if (this.opts.topDIVAsArticle){
				article.call(this,tag,closing,kpos,tpos,start,end);
			}
		}
		const text=this.substring(start,end).replace(/<.+?>/g,"");
		//console.log(depth,text);
		const tocobj={depth:depth,text:text,kpos:this.kPos};
		treeitems.push(encodeTreeItem(tocobj));
	}
}
const encodeTreeItem=require("./tree").encodeTreeItem;

module.exports={lb:lb,article:article,
	articlegroup:articlegroup,
	div:div,head:head,head_finalize:head_finalize};
