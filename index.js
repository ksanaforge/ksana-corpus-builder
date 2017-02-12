const Ksanacount=require("ksana-corpus/ksanacount");
const Ksanapos=require("ksana-corpus/ksanapos");
const Textutil=require("ksana-corpus/textutil");
const Romable=require("./romable");
const Tokenizer=require("ksana-corpus/tokenizer");
const knownPatterns=require("./knownpatterns");
const genBigram=require("./genbigram");
const builderVersion=20161121;
const createInverted=require("./inverted").createInverted;
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
	started=false; //text will be processed when true
	var totalTextSize= 0;
	var prevlinekpos=-1;
	var filecount=0, bookcount=0;
	var textstack=[""];
	const tokenizerVersion=opts.tokenizerVersion||1;

	var romable=Romable({invertAField:opts.invertAField});
	const inverted=opts.textOnly?null:
		createInverted({tokenizerVersion:tokenizerVersion,addressPattern:addressPattern
			,bigrams:bigrams,removePunc:opts.removePunc});

	var finalized=false;
	opts.maxTextStackDepth=opts.maxTextStackDepth||2;
	
	var onBookStart,onBookEnd,onToken, onFileStart, onFileEnd, onFinalize;

	var disorderPages=[];
	var longLines=[];

	var prevArticlePos=0;

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
		if (name=="article") throw "use putArticle";
		romable.putField(name,value,kpos);
	}
	const putBookField=function(name,value,kpos){
		kpos=kpos||this.kPos;
		const p=Ksanapos.unpack(kpos,this.addressPattern);
		romable.putField(name,value,kpos,p[0]);
	}

	const putEmptyField=function(name,kpos){
		kpos=kpos||this.kPos;
		romable.putField(name,null,kpos);	
	}
	const putEmptyBookField=function(name,kpos){
		kpos=kpos||this.kPos;
		const p=Ksanapos.unpack(kpos,this.addressPattern);
		romable.putField(name,null,kpos,p[0]);	
	}

	const putArticleField=function(name,value,kpos,article){
		kpos=kpos||this.kPos;
		romable.putAField(name,value,kpos,article);
	}

	const putEmptyArticleField=function(name,kpos,article){
		kpos=kpos||this.kPos;
		romable.putAField(name,null,kpos,article);
	}

	const putArticle=function(articlename,kpos,tpos){
		kpos=kpos||this.kPos;
		const book=Textutil.bookOf.call(this,kpos,this.addressPattern);
		const prevbook=Textutil.bookOf.call(this,prevArticlePos);
		if (book>prevbook) {
			kpos=Ksanapos.bookStartPos(kpos,this.addressPattern);
		}
		romable.putArticle(articlename,kpos);
		inverted&&inverted.putArticle(tpos);
		prevArticlePos=kpos;
	}
	const putGroup=function(groupname,kpos,tpos){
		kpos=this.kPos||kpos;
		tpos=this.tPos||tpos;
		romable.putField("group",groupname,kpos);
		inverted&&inverted.putGroup(tpos);	
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
	const peekText=function(){
		return textstack[textstack.length-1]||"";
	}
	const addBook=function(){
		if (bookcount){
			//store last line
			var s=this.popBaseText();
			if (s[s.length-1]=="\n") s=s.substr(0,s.length-1);//dirty
			if (s) this.putLine(s);
			onBookEnd &&onBookEnd.call(this,bookcount);
		}

		inverted&&inverted.putBookPos.call(this,bookcount);
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
	const setPos=function(kpos){
		LineKStart=kpos;
		LineKCount=0;
		prevlinekpos=kpos;		
	}

	//call newLine on begining of <lb>
	const newLine=function(kpos){ //reset Line to a new kpos
		if (isNaN(kpos)||kpos<1) return;
		if (prevlinekpos>kpos ) {
			var human=Ksanapos.stringify(kpos,addressPattern);
			var prevh=Ksanapos.stringify(prevlinekpos,addressPattern);
			if (opts.randomPage) {
				disorderPages.push([kpos,human,prevlinekpos,prevh]);
			} else {
				debugger;
				console.error("line",this.parser.line());
				throw "line kpos must be larger the previous one. kpos:"+
				human+"prev "+prevh;
			}
		}
		inverted&&inverted.putLinePos.call(this,kpos);
		setPos(kpos);
	}
	const nextLineStart=function(kpos) {//return kpos of beginning of next line
		const arr=Ksanapos.unpack(kpos,this.addressPattern);
		arr[2]++;
		arr[3]=0;
		return Ksanapos.makeKPos(arr,this.addressPattern);
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
		s=s.replace(/\r?\n/g," ");//replace internal crlf with space

		romable.putLine.call(this,s,LineKStart);
		totalTextSize+=s.length;
		var token=null,i;
		inverted&&inverted.putLine(s);
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
		meta.versions={tokenizer:tokenizerVersion,builder:builderVersion};
		meta.bits=addressPattern.bits;
		meta.name=opts.name;
		if (opts.article) meta.article=opts.article;
		if (addressPattern.column) meta.column=addressPattern.column;
		if (opts.language) meta.language=opts.language;
		if (opts.invertAField) meta.invertAField=opts.invertAField;
		if (opts.articleFields) meta.articleFields=opts.articleFields;
		if (opts.removePunc) meta.removePunc=opts.removePunc;
		if (opts.title) meta.title=opts.title;
		if (opts.groupPrefix) meta.groupPrefix=opts.groupPrefix;
		if (opts.linkTo) meta.linkTo=opts.linkTo;
		meta.endpos=LineKStart+LineKCount;
		if (inverted) meta.endtpos=inverted.tPos();
		return meta;
	}

	const writeKDB=function(fn,cb){
		started&&stop();
		onFinalize&&onFinalize.call(this);
		finalized=true;
		//var okdb="./outputkdb";
		const meta=buildMeta();
		const rom=romable.buildROM(meta,inverted);

		if (typeof window!=="undefined") console.log(rom);
		console.log(opts.extrasize)
		var size=totalTextSize*5 + (opts.extrasize||0) ;
		if (size<1000000) size=1000000;
		require("./outputkdb").write(fn,rom,size,cb);
	}
	const stringify=function(kpos) {
		return Ksanapos.stringify(kpos,addressPattern);
	}
	const parseRange=function(s){
		return Textutil.parseRange(s,addressPattern);
	}
	const handlers=require("./handlers");
	const instance={textstack:textstack,popText:popText,
		peekText:peekText,popBaseText:popBaseText,setHandlers:setHandlers, nextLine:nextLine,
		addFile:addFile, addText:addText,addBook:addBook, 
		putField:putField, putEmptyField:putEmptyField,
		putArticle:putArticle,putArticleField:putArticleField,putEmptyArticleField:putEmptyArticleField,
		putGroup:putGroup,parseRange,
		putBookField:putBookField,putEmptyBookField:putEmptyBookField,handlers:handlers,
		setPos:setPos, newLine:newLine, putLine:putLine, nextLineStart:nextLineStart, stringify:stringify,
		findArticle:romable.findArticle,
		makeKPos:makeKPos, makeKRange:makeKRange,	start:start, romable:romable, stop:stop, writeKDB:writeKDB};

	Object.defineProperty(instance,"kPos",{ get:function(){return LineKStart+LineKCount}});
	Object.defineProperty(instance,"kPosH",{ get:function(){return Ksanapos.stringify(LineKStart+LineKCount,addressPattern)}});
	Object.defineProperty(instance,"fileCount",{ get:function(){return filecount}});
	Object.defineProperty(instance,"bookCount",{ get:function(){return bookcount}});
	Object.defineProperty(instance,"addressPattern",{ get:function(){return addressPattern}});
	Object.defineProperty(instance,"started",{ get:function(){return started}});
	Object.defineProperty(instance,"disorderPages",{ get:function(){return disorderPages}});
	Object.defineProperty(instance,"longLines",{ get:function(){return longLines}});
	inverted&&Object.defineProperty(instance,"tPos",{ get:inverted.tPos});
	inverted&&Object.defineProperty(instance,"totalPosting",{ get:inverted.totalPosting});

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

module.exports={createCorpus:createCorpus,makeKPos:makeKPos,knownPatterns:knownPatterns
,genBigram:genBigram};