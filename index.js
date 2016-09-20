const Parsexml=require("./parsexml");
const Ksanacount=require("ksana-corpus/ksanacount");
const Ksanapos=require("ksana-corpus/ksanapos");
const Romable=require("./romable");
const Tokenizer=require("ksana-corpus/tokenizer");

const createCorpus=function(name,opts){
	opts=opts||{};
	const bigrams=opts.bigrams||null;

	var LineKStart=0, //current line starting kpos
	LineKCount=0, //character count of line line 
	LineTPos=0, //tPos of begining of current line
	tPos=1,     //current tPos, start from 1
	started=false, //text will be processed when true
	pTk=null;
	var totalPosting=0;
	var totalTextSize=0;
	var prevlinekpos=-1;
	var filecount=0, bookcount=0;
	var textstack=[""];
	var romable=Romable({inverted:!opts.textOnly});
	opts.tokenizerVersion=opts.tokenizerVersion||1;
	const addressPattern=Ksanapos.buildAddressPattern(opts.bits,opts.column);
	var onBookStart,onBookEnd,onToken, onFileStart, onFileEnd;

	const tokenizer=Tokenizer.createTokenizer(opts.tokenizerVersion);
	const TT=tokenizer.TokenTypes;
	var disorderPages=[];
	var longLines=[];

	const addFile=function(fn){
		if (!require("fs").existsSync(fn)) {
			if (fn.indexOf("#")==-1) console.log("file not found",fn);
			return;
		}
		onFileStart&&onFileStart.call(this,fn,filecount);
		Parsexml.addFile.call(this,fn);
		filecount&&onFileEnd&&onFileEnd.call(this,fn,filecount);
		filecount++;
	}
	const setHandlers=function(openhandlers,closehandlers,otherhandlers){
		otherhandlers=otherhandlers||{};
		Parsexml.setHandlers.call(this,openhandlers,closehandlers,otherhandlers);
		onBookStart=otherhandlers.bookStart;
		onBookEnd=otherhandlers.bookEnd;
		onFileStart=otherhandlers.fileStart;
		onFileEnd=otherhandlers.fileEnd;
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
				var human=Ksanapos.stringify(this.kpos,this.addressPattern);
				longLines.push([this.kPos,human,t]);
				lineKCount=this.addressPattern.maxchar;
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
		bookcount&&onBookEnd&&onBookEnd.call(this,bookcount);
		romable.putBookPos.call(this,bookcount,tPos);
		bookcount++;
		onBookStart&&onBookStart.call(this,bookcount);
	}
	const makeKPos=function(book,page,line,character,pat){
		pat=pat||addressPattern;
		return Ksanapos.makeKPos([book,page,line,character],pat);
	}

	const makeKRange=function(startkpos,endkpos,pat){
		pat=pat||addressPattern;
		return Ksanapos.makeKRange(startkpos,endkpos,pat);
	}

	//call newLine on begining of <lb>
	const newLine=function(kpos,tpos){ //reset Line to a new kpos
		if (isNaN(kpos)||kpos<0) return;
		if (prevlinekpos>=kpos ) {
			var human=Ksanapos.stringify(kpos,this.addressPattern);
			var prevh=Ksanapos.stringify(prevlinekpos,this.addressPattern);
			if (opts.randomPage) {
				disorderPages.push([kpos,human,prevlinekpos,prevh]);
			} else {
				throw "line kpos must be larger the previous one. kpos:"+
				human+"prev "+prevh;
			}
		}
		romable.putLinePos.call(this,kpos,tpos);

		LineKStart=kpos;
		LineTPos=tpos;
		LineKCount=0;
		prevlinekpos=kpos;
	}
	const putToken=function(tk,type){
		var j,bi;
		if (type===TT.PUNC && opts.removePunc) {
			return;
		}
		var tk=onToken?onToken(tk):tk;
		if (type!==TT.SPACE){
			if (type!==TT.PUNC && type!==TT.NUMBER) {
				if (typeof tk==="string") {
					if (bigrams&&bigrams[pTk+tk]) {
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
	const putLine=function(s){
		if (LineKStart<0) return;//first call to putLine has no effect
		//trim tailing crlf
		while (s.length && s[s.length-1]==="\n"||s[s.length-1]==="\r") {
			s=s.substr(0,s.length-1);
		}

		romable.putLine.call(this,s,LineKStart);
		totalTextSize+=s.length;
		var token=null,i;
		var tokenized=tokenizer.tokenize(s);
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

	const buildMeta=function(){
		var meta={date:(new Date()).toString()};
		meta.versions={tokenizer:tokenizer.version};
		meta.bits=opts.bits;
		meta.column=opts.column;
		return meta;
	}

	const writeKDB=function(fn,cb){
		started&&stop();
		var okdb="./outputkdb";
		const meta=buildMeta();
		const rom=romable.buildROM(meta);
		console.log(rom);

		const size=totalTextSize*5;
		require(okdb).write(fn,rom,size,cb);
	}

	const instance={addFile, addBook, putField, putEmptyField,
									 makeKPos, makeKRange,	start, romable, stop, writeKDB};

	Object.defineProperty(instance,"tPos",{ get:()=>tPos});
	Object.defineProperty(instance,"kPos",{ get:()=>LineKStart+LineKCount});
	Object.defineProperty(instance,"kPosH",{ get:()=>Ksanapos.stringify(LineKStart+LineKCount,addressPattern)});
	Object.defineProperty(instance,"fileCount",{ get:()=>filecount});
	Object.defineProperty(instance,"bookCount",{ get:()=>bookcount});
	Object.defineProperty(instance,"addressPattern",{ get:()=>addressPattern});
	Object.defineProperty(instance,"totalPosting",{ get:()=>totalPosting});
	Object.defineProperty(instance,"started",{ get:()=>started});
	Object.defineProperty(instance,"disorderPages",{ get:()=>disorderPages});
	Object.defineProperty(instance,"longLines",{ get:()=>longLines});

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