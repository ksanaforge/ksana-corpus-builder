const Parsexml=require("./parsexml");
const Ksanacount=require("./ksanacount");
const Ksanapos=require("./ksanapos");
const Romable=require("./romable");
const Kdbw=require("./kdbw");
const createCorpus=function(name,opts){
	opts=opts||{};
	const bigrams=opts.bigrams||null;

	var LineKStart=-1, //current line starting kpos
	LineKCount=0, //character count of line line 
	LineTPos=0, //tPos of begining of current line
	tPos=1,     //current tPos, start from 1
	started=false, //text will be processed when true
	pTk=null;
	var totalPosting=0;
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
		romable.putBookPos.call(this,bookcount,tPos);
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
		romable.putLinePos.call(this,kpos,tpos);

		LineKStart=kpos;
		LineTPos=tpos;
		LineKCount=0;
		prevlinekpos=kpos;
	}
	const putToken=function(tk,type){
		var j,bi;
		if (type===TokenTypes.PUNC && opts.removePunc) {
			return;
		}
		var tk=onToken?onToken(tk):tk;
		if (type!==TokenTypes.SPACE){
			if (type!==TokenTypes.PUNC && type!==TokenTypes.NUMBER) {
				if (typeof tk==="string") {
					if (bigrams[pTk+tk]) {
						romable.putToken.call(this,pTk+tk,tPos-1);
						totalPosting++;
					}
					romable.putToken.call(this,tk,tPos);
					totalPosting++;
				} else {
					for (j=0;j<tk.length;j++){ //onToken return an array
						if (bigrams[pTk+tk[j]]){
							totalPosting++;
							romable.putToken.call(this,pTk+tk[j],tPos-1);
						}
						romable.putToken.call(this,tk[j],tPos);	
						totalPosting++;
					}
				}
				tPos++;
			}
			pTk=tk;
		} else {
			pTk=null;
		}
	}
	//call putLine on end of </lb>
	const putLine=function(str){
		if (LineKStart<0) return;//first call to putLine has no effect
		romable.putLine.call(this,str,LineKStart);	
		var token=null,i;
		var tokenized=tokenize(str);
		for (i=0;i<tokenized.length;i++) {
			var type=tokenized[i][3];
			putToken(tokenized[i][0],type);
		};
	}

	const start=function(){
		started=true;
	}

	const stop=function(){
		started=false;
		bookcount&&onBookEnd&&onBookEnd.call(this);
	}

	const write=function(fn,finishcb){
		var kdbw=Kdbw("yinshun.kdb");
		started&&stop();
		const json=romable.buildROM({date:(new Date()).toString()});

		kdbw.save(json,null,{autodelete:true});

		kdbw.writeFile(fn,function(total,written) {
			var progress=written/total;
			console.log(progress);
			if (finishcb && total==written) finishcb(total);
		});
	}

	const instance={addFile, addBook, putField, putEmptyField,
									 makeKPos, makeKRange,	start, romable, stop, write};

	Object.defineProperty(instance,"tPos",{ get:()=>tPos});
	Object.defineProperty(instance,"kPos",{ get:()=>LineKStart+LineKCount});
	Object.defineProperty(instance,"fileCount",{ get:()=>filecount});
	Object.defineProperty(instance,"bookCount",{ get:()=>bookcount});
	Object.defineProperty(instance,"addressPattern",{ get:()=>addressPattern});
	Object.defineProperty(instance,"totalPosting",{ get:()=>totalPosting});

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
const {tokenize,TokenTypes}=require("./tokenizer");
module.exports={createCorpus,tokenize,TokenTypes};