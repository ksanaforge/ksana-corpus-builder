var prevpage=0,prevline=0;
const lb_page_line=function(tag){
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
	var s=this.popBaseText();
	this.putLine(s);

	if (prevpage!==str_page && page===1) {
		this.addBook();
	} else {
		if (line!=1 && line-prevline>1) {
			console.log("Gap at page ",page,"line ",line,",previous line",prevline);
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
		this.newLine(kpos, this.tPos);
	}
	prevpage=str_page;
	prevline=line;
}
var subtreeitems=[];
var subtreekpos;
const head_subtree_finalize=function(){
	this.putField("subtoc",subtreeitems,subtreekpos);
	this.putField("subtoc_range",this.kPos,subtreekpos);
}

const encodeSubtreeItem=require("./subtree").encodeSubtreeItem;

const head_subtree=function(tag,closing,depth){
	if (closing){
		const text=this.popText();

		if (depth==1) { //new subtoc
			if (subtreeitems.length) {
				this.putField("subtoc",subtreeitems,subtreekpos);
				this.putField("subtoc_range",this.kPos,subtreekpos);
				subtreeitems=[];
			}
			subtreekpos=this.kPos;
		}
		const tocobj={depth,text,kpos:this.kPos};
		subtreeitems.push(encodeSubtreeItem(tocobj));

		this.addText(text);
	} else {
		return true;
	}
}
module.exports={lb_page_line,head_subtree,head_subtree_finalize};
