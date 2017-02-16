var noteid={};
const ptr=function(tag,closing){
	if (closing)return;
	const n=tag.attributes.n;
	if (noteid[n]) {
		throw "note ptr exists"+n;
	}
	noteid[tag.attributes.n]=this.kPos;
}
var defstart;
const def=function(tag,closing){
	if (closing) {
		const s=this.popText();
		const n=tag.attributes.n;
		if (!n) {
			console.warn("釋 without n",this.stringify(this.kPos));
			return;
		}
		const defrange=this.makeKRange(defstart,this.kPos);
		ptrpos=noteid[n];
		if (!ptrpos) {
			throw "no such ptr "+n;
		}
		this.addText(s);
		this.putField("note",defrange, ptrpos);
	} else {
		defstart=this.kPos;
		return true;
	}
	
}
module.exports={ptr:ptr,def:def};