const Ksanacount=require("ksana-corpus/ksanacount");
const Ksanapos=require("ksana-corpus/ksanapos");
const Romable=require("./romable");
const Tokenizer=require("ksana-corpus/tokenizer");
const knownPatterns=require("./knownpatterns");

const parsers={
	xml:require("./parsexml"),
	htll:require("./parsehtll"),
	accelon3:require("./parseaccelon3")
}

const createCorpus=function(opts){
	opts=opts||{};

	const bigrams=opts.bigrams||null;
	const addressPattern=opts.bitPat?knownPatterns[opts.bitPat]:
			Ksanapos.buildAddressPattern(opts.bits,opts.column);

			//start from vol=1, to make range always bigger than pos
	var LineKStart=Ksanapos.makeKPos([1,0,0,0],addressPattern), 
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
	var finalized=false;
	opts.tokenizerVersion=opts.tokenizerVersion||1;
	opts.maxTextStackDepth=opts.maxTextStackDepth||2;
	

	var onBookStart,onBookEnd,onToken, onFileStart, onFileEnd, onFinalize;

	const tokenizer=Tokenizer.createTokenizer(opts.tokenizerVersion);
	const TT=tokenizer.TokenTypes;
	var disorderPages=[];
	var longLines=[];

	const addFile=function(fn){
		if (finalized) {
			throw "cannot add file "+fn+" after finalized";
		}
		if (!require("fs").existsSync(fn)) {
			if (fn.indexOf("#")==-1) console.log("file not found",fn);
			return;
		}
		onFileStart&&onFileStart.call(this,fn,filecount);
		this.parser.addFile.call(this,fn,opts);
		this.putLine(this.popBaseText());
		onFileEnd&&onFileEnd.call(this,fn,filecount);
		filecount++;
	}

	const setHandlers=function(openhandlers,closehandlers,otherhandlers){
		otherhandlers=otherhandlers||{};
		this.parser.setHandlers.call(this,openhandlers,closehandlers,otherhandlers);
		onBookStart=otherhandlers.bookStart;
		onBookEnd=otherhandlers.bookEnd;
		onFileStart=otherhandlers.fileStart;
		onFileEnd=otherhandlers.fileEnd;
		onToken=otherhandlers.onToken;
		onFinalize=otherhandlers.finalize;
	}

	const putField=function(name,value,kpos){
		kpos=kpos||this.kPos;
		romable.putField(name,value,kpos);
	}
	const putBookField=function(name,value,kpos){
		kpos=kpos||this.kPos;
		const p=Ksanapos.unpack(kpos,this.addressPattern);
		romable.putField(name,value,kpos,p[0]-1);
	}

	const putEmptyField=function(name,kpos){
		kpos=kpos||this.kPos;
		romable.putField(name,null,kpos);	
	}
	const putEmptyBookField=function(name,kpos){
		kpos=kpos||this.kPos;
		const p=Ksanapos.unpack(kpos,this.addressPattern);
		romable.putField(name,null,kpos,p[0]-1);	
	}

	const addText=function(t){
		if (!t)return;

		if (textstack.length==1 && started) {
			LineKCount+=this.kcount(t);
			if (LineKCount>addressPattern.maxchar) {
				var human=Ksanapos.stringify(this.kPos,addressPattern);
				longLines.push([this.kPos,human,t]);
				lineKCount=addressPattern.maxchar;
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
		if (bookcount){
			//store last line
			var s=this.popBaseText();
			if (s[s.length-1]=="\n") s=s.substr(0,s.length-1);//dirty
			if (s) this.putLine(s);
			onBookEnd &&onBookEnd.call(this,bookcount);
		}

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

	const nextLine=function(kpos) {//return kpos of nextline ch 0
		var u=Ksanapos.unpack(kpos,addressPattern);
		u[2]++;u[3]=0;
		return Ksanapos.makeKPos(u,addressPattern);
	}

	//for xml without lb, call setKPos to set kpos
	const setPos=function(kpos,tpos){
		LineKStart=kpos;
		LineTPos=tpos;
		LineKCount=0;
		prevlinekpos=kpos;		
	}

	//call newLine on begining of <lb>
	const newLine=function(kpos,tpos){ //reset Line to a new kpos
		if (isNaN(kpos)||kpos<1) return;
		if (prevlinekpos>kpos ) {
			var human=Ksanapos.stringify(kpos,addressPattern);
			var prevh=Ksanapos.stringify(prevlinekpos,addressPattern);
			if (opts.randomPage) {
				disorderPages.push([kpos,human,prevlinekpos,prevh]);
			} else {
				console.error("line",this.parser.line());
				throw "line kpos must be larger the previous one. kpos:"+
				human+"prev "+prevh;
			}
		}
		romable.putLinePos.call(this,kpos,tpos);
		setPos(kpos,tpos);
	}
	const nextLineStart=function(kpos) {//return kpos of beginning of next line
		const arr=Ksanapos.unpack(kpos,this.addressPattern);
		arr[2]++;
		arr[3]=0;
		return Ksanapos.makeKPos(arr,this.addressPattern);
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
		if (LineKStart<1) return;//first call to putLine has no effect
		//trim tailing crlf
		while (s.length && s[s.length-1]==="\n"||s[s.length-1]==="\r") {
			s=s.substr(0,s.length-1);
		}
		while (s[0]==="\n"||s[0]==="\r") {
			s=s.substr(1);
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
		return this.popText();
	}

	const stop=function(){
		started=false;
		bookcount&&onBookEnd&&onBookEnd.call(this);
	}

	const buildMeta=function(){
		var meta={date:(new Date()).toString()};
		meta.versions={tokenizer:tokenizer.version};
		meta.bits=addressPattern.bits;
		meta.name=opts.name;
		if (opts.article) meta.article=opts.article;
		if (addressPattern.column) meta.column=addressPattern.column;
		if (opts.language) meta.language.opts.language;
		meta.endpos=LineKStart+LineKCount;
		return meta;
	}

	const writeKDB=function(fn,cb){
		started&&stop();
		onFinalize&&onFinalize.call(this);
		finalized=true;
		var okdb="./outputkdb";
		const meta=buildMeta();
		const rom=romable.buildROM(meta);
		console.log(rom)

		var size=totalTextSize*5;
		if (size<1000000) size=1000000;
		require(okdb).write(fn,rom,size,cb);
	}
	const stringify=function(kpos) {
		return Ksanapos.stringify(kpos,addressPattern);
	}
	const lb=require("./handlers").lb;
	const handlers={lb};
	const instance={textstack,popText,popBaseText,setHandlers, nextLine,
		addFile, addText,addBook, putField, putEmptyField, 
		putBookField,putEmptyBookField,handlers,
		setPos, newLine, putLine, nextLineStart, stringify,
		makeKPos, makeKRange,	start, romable, stop, writeKDB};

	Object.defineProperty(instance,"tPos",{ get:function(){return tPos}});
	Object.defineProperty(instance,"kPos",{ get:function(){return LineKStart+LineKCount}});
	Object.defineProperty(instance,"kPosH",{ get:function(){return Ksanapos.stringify(LineKStart+LineKCount,addressPattern)}});
	Object.defineProperty(instance,"fileCount",{ get:function(){return filecount}});
	Object.defineProperty(instance,"bookCount",{ get:function(){return bookcount}});
	Object.defineProperty(instance,"addressPattern",{ get:function(){return addressPattern}});
	Object.defineProperty(instance,"totalPosting",{ get:function(){return totalPosting}});
	Object.defineProperty(instance,"started",{ get:function(){return started}});
	Object.defineProperty(instance,"disorderPages",{ get:function(){return disorderPages}});
	Object.defineProperty(instance,"longLines",{ get:function(){return longLines}});

	instance.parser=parsers[opts.inputFormat];
	if (!instance.parser) {
		throw "unsupported input format "+opts.inputFormat;
	}

	instance.kcount=Ksanacount.getCounter(opts.language);

	if(opts.autoStart) started=true;
	
	return instance;

}

const makeKPos=function(book,page,line,character,pat){
	if (typeof pat==="string") pat=knownPatterns[pat];
	return Ksanapos.makeKPos([book,page,line,character],pat);
}

module.exports={createCorpus,makeKPos,knownPatterns};