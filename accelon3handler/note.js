
/*external note*/
var footnotes={};
const footnote=function(tag,closing){
	if (closing)return;
	const n=tag.attributes.n;
	if (!footnotes[n]) {
		this.log("error","footnote "+n+" notfound");
	} else {
		const ndef=footnotes[n];
		this.putArticleField("footnote",n+"\t"+ndef);
		delete footnotes[n];
	}
}
const setFootnotes=function(_notes){
	footnotes=_notes;
}
const getFootnotes=function(){
	return footnotes;
}
/* internal note*/
const ptr=function(tag,closing){
	if (closing)return;
	const n=tag.attributes.n;
	if (noteid[n]) {
		throw "note ptr exists"+n;
	}
	noteid[tag.attributes.n]=this.kPos;
}

var noteid={};

const def=function(tag,closing,kpos,tpos,start,end){
	if (closing) {
		const s=this.substring(start,end);
		const n=tag.attributes.n;
		if (!n) {
			this.log("warn","釋 without n",this.stringify(this.kPos));
			return;
		}
		const defrange=this.makeRange(kpos,this.kPos);
		ptrpos=noteid[n];
		if (!ptrpos) {
			throw "no such ptr "+n;
		}
		this.putField("note",defrange, ptrpos);
	}
}


module.exports={ptr:ptr,def:def,footnote:footnote,setFootnotes:setFootnotes,getFootnotes:getFootnotes};