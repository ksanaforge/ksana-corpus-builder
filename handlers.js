var prevpage=0;
const lb=function(str_page,str_line,tag){
	var page=parseInt(str_book,10), line=parseInt(str_page,10)-1;
	if (isNaN(page)) page=parseInt(str_book.substr(1),10);
	if (page<1) {
		console.log("negative page number, ",tag.name,"n=",tag.attributes.n);
		throw "negative page number";
		return;
	}

	var s=this.popBaseText();
	this.putLine(s);

	if (prevpage!==str_book && page===1) {
		this.addBook();
	}

	if (isNaN(page)) {
		throw "error page number "+str_book;
	}
	page--;
	if (this.bookCount){
		const kpos=this.makeKPos(this.bookCount-1,page,line,0);
		if (kpos==-1) {
			throw "error lb "+tag.attributes.n;
		}
		this.newLine(kpos, this.tPos);
	}
	prevpage=str_book;
}
module.exports={lb};
