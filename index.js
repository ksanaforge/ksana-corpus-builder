const Parsexml=require("./parsexml");
const Ksanacount=require("./ksanacount");
const Ksanapos=require("./ksanapos");
const Romable=require("./romable");
const Inverted=require("./inverted");
const createCorpus=function(name,opts){
	opts=opts||{};
	var LineKStart=-1, //current line starting kpos
	LineKCount=0, //character count of line line 
	LineTPos=0, //tPos of begining of current line
	tPos=1,     //current tPos, start from 1
	started=false, //text will be processed when true
	prevToken=null;
	var prevlinekpos=-1;
	var filecount=0, bookcount=0;
	var textstack=[""];
	var romable=Romable();
	const addressPattern=Ksanapos.parseAddress(opts.bits);
	var onBookStart,onBookEnd,onToken;

	const addFile=function(fn){
		Parsexml.addFile.call(this,fn);
		filecount++;
	}
	const setHandlers=function(openhandlers,closehandlers,otherhandlers){
		otherhandlers=otherhandlers||{};
		Parsexml.setHandlers.call(this,openhandlers,closehandlers,otherhandlers);
		onBookStart=otherhandlers.bookStart;
		onBookEnd=otherhandlers.bookEnd;
		onToken=otherhandlers.onToken;
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
				throw "line too long "+LineKCount+" "+t;
			}
		}
		textstack[textstack.length-1]+=t;
	}
	const popBaseText=function(){
		const s=textstack.shift();
		textstack.unshift("");
		return s;
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
			return 0;
		}
		var r=endkpos-startkpos;
		if (r>addressPattern.maxrange) {
			//throw "range too far "+ r;
			r=addressPattern.maxrange-1;
		}
		return startkpos*Math.pow(2,addressPattern.rangebits)+r;
	}

	//call newLine on begining of <lb>
	const newLine=function(kpos,tpos){ //reset Line to a new kpos
		if (isNaN(kpos)||kpos<0) return;
		if (prevlinekpos>=kpos) {
			var human=Ksanapos.stringify(kpos,this.addressPattern);
			throw "line kpos must be larger the previous one. kpos:"+human+this.popText();
		}
		romable.putLineTPos.call(this,kpos,tpos);

		LineKStart=kpos;
		LineTPos=tpos;
		LineKCount=0;
		prevlinekpos=kpos;
	}

	//call putLine on end of </lb>
	const putLine=function(str){
		if (LineKStart<0) return;//first call to putLine has no effect
		romable.putLine.call(this,str,LineKStart);	
		var token=null,i;
		var obj={str};
		while (token=this.getRawToken(obj)) {
			token=onToken?onToken(token):token;
			if (token) {
				if (typeof token==="string") {
					token=token.trim();
					token.length&&Inverted.putToken.call(this,token,tPos);	
				} else {
					for (i=0;i<token.length;i++){
						var tk=token[i].trim();
						tk.length&&Inverted.putToken.call(this,tk,tPos);
					}
				}
				tPos++;
			}
			//bigram 
			prevToken=token;
		};
	}

	const start=function(){
		started=true;
	}

	const stop=function(){
		started=false;
		bookcount&&onBookEnd&&onBookEnd.call(this);
	}

	const instance={addFile, addBook, putField, putEmptyField,
									 makeKPos, makeKRange,	start, romable, stop , getRawToken:Ksanacount.getRawToken};

	Object.defineProperty(instance,"tPos",{ get:()=>tPos});
	Object.defineProperty(instance,"kPos",{ get:()=>LineKStart+LineKCount});
	Object.defineProperty(instance,"fileCount",{ get:()=>filecount});
	Object.defineProperty(instance,"bookCount",{ get:()=>bookcount});
	Object.defineProperty(instance,"addressPattern",{ get:()=>addressPattern});

	if (opts.inputformat==="xml") {
		instance.setHandlers=setHandlers;
		instance.textstack=textstack;
		instance.popText=popText;
		instance.popBaseText=popBaseText;
		instance.addText=addXMLTextNode;
		instance.newLine=newLine;
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