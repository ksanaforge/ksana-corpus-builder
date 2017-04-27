const loadsvg=require("./loadsvg");
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

		ndef.replace(/\{svg\|(.+?),([\s\S]+?)\|svg\}/g,function(m,fn,t){
			const svgcontent=loadsvg.call(this,fn+".svg");
			if (svgcontent) {
				this.putArticleField("footnotesvg", svgcontent);
			} else {
				this.log("error","cannot load "+fn);
			}
		}.bind(this))
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
		//const defrange=this.makeRange(kpos,this.kPos);
		const def=this.substring(start,end);
		ptrpos=noteid[n];
		if (!ptrpos) {
			throw "no such ptr "+n;
		}
		this.putArticleField("note",n+"\t"+def, ptrpos);
	}
}

const rubynote=function(tag,closing,kpos,tpos,start,end){
	if (closing)return;
	if (!tag.attributes.t){
		this.log("warning","missing attribute t at"+this.stringify(kpos));
		return;
	}
	this.putArticleField("rubynote",tag.attributes.t,kpos);
}
module.exports={ptr:ptr,def:def,footnote:footnote,setFootnotes:setFootnotes,
	getFootnotes:getFootnotes,rubynote:rubynote};