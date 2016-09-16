const Parsexml=require("./parsexml");
const Ksanacount=require("./ksanacount");
const Ksanapos=require("./ksanapos");
const Romable=require("./romable");

const createCorpus=function(name,opts){
	opts=opts||{};
	var LineKStart=0, LineKCount=0, tPos=0, started=false;
	var prevlinekpos=-1;
	var filecount=0, bookcount=0;
	var textstack=[""];
	var vars={};
	var romable=Romable();
	const addressPattern=Ksanapos.parseAddress(opts.addrbits);
	var onBookStart,onBookEnd;

	const addFile=function(fn){
		Parsexml.addFile.call(this,fn);
		filecount++;
	}
	const setHandlers=function(openhandlers,closehandlers,otherhandlers){
		otherhandlers=otherhandlers||{};
		Parsexml.setHandlers.call(this,openhandlers,closehandlers,otherhandlers);
		onBookStart=otherhandlers.bookStart;
		onBookEnd=otherhandlers.bookEnd;
	}
	const onToken=function(){

	}
	const putField=function(name,value,kpos){
		kpos=kpos||this.kPos; //default to current kpos
		romable.putField(name,value,kpos);
	}
	const putEmptyField=function(name,kpos){
		kpos=kpos||this.kPos; //default to current kpos
		romable.putField(name,null,kpos);	
	}
	const addXMLTextNode=function(t){
		if (!started)return;
		if (textstack.length==1) {
			LineKCount+=this.kcount(t);
			if (LineKCount>addressPattern.maxchar) {
				console.error("line too long",t);
			}
		}
		textstack[textstack.length-1]+=t;
	}
	const popText=function(){
		const s=textstack.pop();
		if (textstack.length==0) textstack.push("");//make sure text stack has at least one entry
		return s;
	}
	const addBook=function(){
		bookcount&&onBookEnd&&onBookEnd.call(this);
		bookcount++;
		onBookStart&&onBookStart.call(this);
	}
	const makeKPos=function(book,page,column,line,character,pat){
		pat=pat||addressPattern;
		return Ksanapos.makeKPos([book,page,column,line,character],addressPattern);
	}
	const makeKRange=function(startkpos,endkpos){
		if (isNaN(startkpos)||isNaN(endkpos)) {
			console.error("invalie kpos");
			return 0;
		}
		var r=endkpos-startkpos;
		if (r>addressPattern.maxrange) {
			console.log("range too far",r);
			r=addressPattern.maxrange;
		}
		return startkpos*Math.pow(2,addressPattern.rangebits)+r;
	}

	const putLine=function(text,kpos){
		if (isNaN(kpos)||kpos<0) return;
		if (prevlinekpos>=kpos) {
			throw "line kpos must be larger "+kpos+" prev"+prevlinekpos;
		}
		LineKStart=kpos;
		LineKCount=0;
		prevlinepos=kpos;
		romable.putLine.call(this,text,kpos);	
	}
	var start=function(){
		started=true;
	}

	var stop=function(){
		bookcount&&onBookEnd&&onBookEnd.call(this);
	}

	const instance={addFile, addBook, putField, putEmptyField,onToken, vars, 
									makeKPos, makeKRange,	start, romable, stop };

	Object.defineProperty(instance,"kPos",{ get:()=>LineKStart+LineKCount});
	Object.defineProperty(instance,"fileCount",{ get:()=>filecount});
	Object.defineProperty(instance,"bookCount",{ get:()=>bookcount});
	Object.defineProperty(instance,"addressPattern",{ get:()=>addressPattern});

	if (opts.inputformat==="xml") {
		instance.setHandlers=setHandlers;
		instance.textstack=textstack;
		instance.popText=popText;
		instance.addText=addXMLTextNode;
		instance.putLine=putLine;
	}

	instance.kcount=Ksanacount.cjk;
	if (opts.language==="classical_chinese") {
		instance.kcount=Ksanacount.cjk_nopunc;
	}

	if(opts.autostart){
		started=true;
	}
	
	return instance;

}
module.exports={createCorpus};