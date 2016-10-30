var prevpage=0;
const lb=function(str_page,str_line,tag){
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
}
module.exports={lb};
