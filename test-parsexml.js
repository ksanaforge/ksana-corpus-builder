const fs=require("fs");
const {createCorpus}=require("./index");
const assert=require("assert");
const rendClass=["q"];
const note=function(tag,closing,kpos,tpos,start,end){
	if (closing) {
		const s=this.substring(start,end);
		this.putArticleField("note",s);
	} else {
		return true;
	}
}
const opts={topDIVAsArticle:true,inputFormat:"xml",rendClass}
const corpus=createCorpus(opts);
corpus.setHandlers({note},{note});

corpus.addFile("testcontent/tei1.xml");
const {rom}=corpus.writeKDB(null);

console.log(rom.texts[0])
