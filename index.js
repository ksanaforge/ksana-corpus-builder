const Ksanapos=require("ksana-corpus/ksanapos");
const Textutil=require("ksana-corpus/textutil");
const Romable=require("./romable");
const Tokenizer=require("ksana-corpus/tokenizer");

const knownPatterns=require("ksana-corpus").knownPatterns;
const genBigram=require("./genbigram");
//const builderVersion=20161121;
const builderVersion=20170316; //remove textstack, rename subtoc to toc
const createInverted=require("./inverted").createInverted;
const importExternalMarkup=require("./externalmarkup").importExternalMarkup;
const createTokenizer=Tokenizer.createTokenizer;


const parsers={
	xml:require("./parsexml"),
	htll:require("./parsehtll"),
	accelon3:require("./parseaccelon3"),
	pre:require("./parsepre")
}

const createCorpus=function(opts){
	opts=opts||{};
	opts.bits=opts.bits||[7,10,5,8];//default bits
	const bigrams=opts.bigrams||null;
	const addressPattern=opts.bitPat?knownPatterns[opts.bitPat]:
			Ksanapos.buildAddressPattern(opts.bits,opts.column);

	//start from vol=1, to make range always bigger than pos
	var LineKStart=Ksanapos.makeKPos([1,0,0,0],addressPattern);

	var LineKCount=0; //character count of current line 
	var started=false; //text will be processed when true
	var totalTextSize= 0;
	var prevlinekpos=-1;
	var filecount=0, bookcount=0;
	//var textstack=[""];
	var linetokens=[];
	var tokenizerVersion=opts.tokenizerVersion||2;
	var tokenizer=createTokenizer(opts.tokenizerVersion);
	const PUNC=tokenizer.TokenTypes.PUNC;

	var concreteToken=Tokenizer.concreteToken;

	var romable=Romable({invertAField:opts.invertAField});
	const inverted=opts.textOnly?null:
		createInverted({tokenizer:tokenizer, tokenizerVersion:tokenizerVersion
			,addressPattern:addressPattern
			,bigrams:bigrams,removePunc:opts.removePunc});

	var finalized=false;
	//opts.maxTextStackDepth=opts.maxTextStackDepth||3;
	
	//var onBookStart,onBookEnd,onToken, onFileStart, onFileEnd, onFinalize;

	var disorderPages=[];
	var longLines=[];


	var prevArticlePos=0;

	const addFile=function(fn){
		if (finalized) {
			throw "cannot add file "+fn+" after finalized";
		}
		if (!require("fs").existsSync(fn)) {
			if (fn.indexOf("#")==-1) log("error","file not found",fn);
			return;
		}
		this.onFileStart&&this.onFileStart.call(this,fn,filecount);
		this.parser.addFile.call(this,fn,opts);
		this.emitLine();

		this.onFileEnd&&this.onFileEnd.call(this,fn,filecount);
		filecount++;
	}

	const setHandlers=function(openhandlers,closehandlers,otherhandlers){
		otherhandlers=otherhandlers||{};
		this.parser.setHandlers(this,openhandlers,closehandlers,otherhandlers);
		this.onBookStart=otherhandlers.bookStart;
		this.onBookEnd=otherhandlers.bookEnd;
		this.onFileStart=otherhandlers.fileStart;
		this.onFileEnd=otherhandlers.fileEnd;
		this.onToken=otherhandlers.onToken;
		this.onFinalize=otherhandlers.finalize;
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
		kpos=kpos||this.kPos;
		tpos=tpos||this.tPos;
		romable.putField("group",groupname,kpos);
		inverted&&inverted.putGroup(tpos);	
	}

	const addToken=function(token){
		if (concreteToken[token[2]]) LineKCount++;
		linetokens.push(token);
	}

	const addTokens=function(tokens){
		if (!tokens || !tokens.length ||!started)return;
		for (var i=0;i<tokens.length;i++) addToken(tokens[i]);
	}
	const addText=function(t){
		const tokens=tokenizer.tokenize(t);
		this.addTokens(tokens);
	}

	const addBook=function(){
		if (bookcount){
			this.emitLine();
			this.onBookEnd &&this.onBookEnd.call(this,bookcount);
		}

		inverted&&inverted.putBookPos.call(this,bookcount);
		bookcount++;
		this.onBookStart&&this.onBookStart.call(this,bookcount);
	}
	const makeKPos=function(book,page,line,character,pat){
		pat=pat||addressPattern;
		return Ksanapos.makeKPos([book,page,line,character],pat);
	}

	const makeRange=function(startkpos,endkpos,pat){
		pat=pat||addressPattern;
		return Ksanapos.makeRange(startkpos,endkpos,pat);
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
	const makeLine=function(tokens){
		var s=tokens.map(function(item){return item[0]}).join("");
		while (s[0]=="\n") s=s.substr(1);
		while (s[s.length-1]=="\n") s=s.substr(0,s.length-1);
		return s;
	}
	const emitLine=function(){
		if (!linetokens.length)return;
		const str=makeLine(linetokens);
		
		if (LineKCount>addressPattern.maxchar) {
			var human=Ksanapos.stringify(this.kPos,addressPattern);
			longLines.push([this.kPos,human,str]);
			lineKCount=addressPattern.maxchar;
		}

		romable.putLine.call(this,str,LineKStart);
		totalTextSize+=str.length;

		inverted&&inverted.putTokens(linetokens);
		linetokens=[];
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
				this.log("error",this.parser.line());
				throw "line kpos must be larger the previous one. kpos:"+
				human+"prev "+prevh;
			}
		}else {
			this.emitLine();
			inverted&&inverted.putLinePos.call(this,kpos);
		}
		setPos(kpos);
	}
	const nextLineStart=function(kpos) {//return kpos of beginning of next line
		const arr=Ksanapos.unpack(kpos,this.addressPattern);
		arr[2]++;
		arr[3]=0;
		return Ksanapos.makeKPos(arr,this.addressPattern);
	}

	const start=function(){
		started=true;
	}

	const stop=function(){
		this.emitLine();
		started=false;
		this.bookcount&&this.onBookEnd&&this.onBookEnd.call(this);
	}

	const buildMeta=function(){
		var meta={date:(new Date()).toString()};
		meta.versions={tokenizer:tokenizerVersion,builder:builderVersion};
		meta.bits=addressPattern.bits;
		meta.name=opts.name||"unknown";
		if (opts.article) meta.article=opts.article;
		if (addressPattern.column) meta.column=addressPattern.column;
		if (opts.language) meta.language=opts.language;
		if (opts.invertAField) meta.invertAField=opts.invertAField;
		if (opts.articleFields) meta.articleFields=opts.articleFields;
		if (opts.removePunc) meta.removePunc=opts.removePunc;
		if (opts.title) meta.title=opts.title;
		if (opts.groupPrefix) meta.groupPrefix=opts.groupPrefix;
		if (opts.groupColumn) meta.groupColumn=opts.groupColumn;
		if (opts.displayOptions) meta.displayOptions=opts.displayOptions;
		if (opts.linkTo) meta.linkTo=opts.linkTo;
		meta.endpos=LineKStart+LineKCount;
		if (inverted) meta.endtpos=inverted.tPos();
		return meta;
	}

	const writeKDB=function(fn,cb){
		started&&stop.call(this);
		this.onFinalize&&this.onFinalize.call(this);
		instance.parser.finalize&&	instance.parser.finalize(instance,opts);

		finalized=true;
		//var okdb="./outputkdb";
		const meta=buildMeta();
		var rom=null;
		try {
			rom=romable.buildROM(meta,inverted);	
		} catch(e) {
			this.log("ERROR",e);
		}
		

		if (typeof window!=="undefined") console.log(rom);

		//opts.extrasize&&console.log("extra size",opts.extrasize)
		var size=totalTextSize*5 + (opts.extrasize||0) ;
		if (size<1000000) size=1000000;
		if (!fn && typeof Window!=="undefined") {
			return {rom:rom,url:require("./outputkdb").writeToBlob(rom,size,cb)};
		} else {
			require("./outputkdb").write(fn,rom,size,cb);
			return {rom:rom, filename:fn};
		}
	}
	const stringify=function(kpos) {
		return Ksanapos.stringify(kpos,addressPattern);
	}
	const parseRange=function(s){
		return Textutil.parseRange(s,addressPattern);
	}
	const handlers=require("./handlers");
	var log=function(){
		var args = Array.prototype.slice.call(arguments);
		if (args[0]=="error") {
			args.shift();
			console.error.apply(null,args);
		} else if (args[0]=="warn") {
			console.warn.apply(null,args);
		} else {
			console.log.apply(null,args);
		}
	}

	const setLog=function(_log){
		this.log=_log;
		this.parser.setLog&&this.parser.setLog(_log);
		Ksanapos.setLog&&		Ksanapos.setLog(_log);
	}

	const substring=function(s,e){
		return this.content.substring(s,e);
	}

	const instance={
		//textstack:textstack,popText:popText,
		//peekText:peekText,popBaseText:popBaseText,
		tokenizer:tokenizer,substring:substring,emitLine:emitLine,
		setHandlers:setHandlers, nextLine:nextLine,
		addFile:addFile, 
		addText:addText,addToken:addToken,addTokens:addTokens,addBook:addBook, 
		addBrowserFiles:addBrowserFiles,
		putField:putField, putEmptyField:putEmptyField,
		putArticle:putArticle,putArticleField:putArticleField,putEmptyArticleField:putEmptyArticleField,
		putGroup:putGroup,parseRange:parseRange,
		putBookField:putBookField,putEmptyBookField:putEmptyBookField,handlers:handlers,
		setPos:setPos, newLine:newLine,  nextLineStart:nextLineStart, stringify:stringify,
		findArticle:romable.findArticle,log:log,setLog:setLog,
		importExternalMarkup:importExternalMarkup,
		makeKPos:makeKPos, makeRange:makeRange,	start:start, 
		romable:romable, stop:stop, writeKDB:writeKDB,
		openhandlers:{},closehandlers:{},otherhandlers:{}};

	Object.defineProperty(instance,"kPos",{ get:function(){return LineKStart+LineKCount}});
	Object.defineProperty(instance,"lineTokenCount",{ get:function(){return LineKCount}});
	Object.defineProperty(instance,"kPosH",{ get:function(){return Ksanapos.stringify(LineKStart+LineKCount,addressPattern)}});
	Object.defineProperty(instance,"articleCount",{ get:function(){return romable.articleCount()}});
	Object.defineProperty(instance,"fileCount",{ get:function(){return filecount}});
	Object.defineProperty(instance,"bookCount",{ get:function(){return bookcount}});
	Object.defineProperty(instance,"addressPattern",{ get:function(){return addressPattern}});
	Object.defineProperty(instance,"started",{ get:function(){return started}});
	Object.defineProperty(instance,"disorderPages",{ get:function(){return disorderPages}});
	Object.defineProperty(instance,"longLines",{ get:function(){return longLines}});
	Object.defineProperty(instance,"id",{ get:function(){return opts.name}});
	Object.defineProperty(instance,"opts",{ get:function(){return opts}});


	inverted&&Object.defineProperty(instance,"tPos",{ get:inverted.tPos});
	inverted&&Object.defineProperty(instance,"totalPosting",{ get:inverted.totalPosting});

	opts.inputFormat=opts.inputFormat||"pre";
	instance.parser=parsers[opts.inputFormat];

	if (!instance.parser) {
		throw "unsupported input format "+opts.inputFormat;
	}

	instance.parser.initialize&&instance.parser.initialize(instance,opts);

	instance._pb=0;
	instance._pbline=0;

	if (typeof opts.autoStart!=="undefined") {
		started=opts.autoStart;
	} else {
		started=true; //default start 
	}

	return instance;
}

const addBrowserFiles=require("./browserfile").addBrowserFiles;
const prepareHTMLFile=require("./browserfile").prepareHTMLFile;

const createWebCorpus=function(osfiles,log,cb){
	prepareHTMLFile(osfiles,function(err,files,json){
		if (err) {
			cb(err);
			return;
		}
		const corpus=createCorpus(json);
		log&&corpus.setLog(log);
		corpus.setHandlers();
		addBrowserFiles.call(corpus,files,cb);
	});
}
const createCorpusFromJSON=function(jsonfn,cb){
	const fs=require("fs");
	if (!fs.existsSync|(jsonfn)) {
		cb(jsonfn+" not found");
		return;
	}
	const content=fs.readFileSync(jsonfn);

	var json=null;
	try{
		json=JSON.parse(content);	
	} catch(e){
		cb(e.message||e);
		return;
	}
	const m=jsonfn.match(/([^/\\ ]+)-corpus\.json/);
	if (!m) {
		cb("invalid corpus json name:",jsonfn);
		return;
	}
	corpusid=m[1];
	const jsonpath=require('path').dirname(jsonfn)+'/';
	json.path=jsonpath;
	const corpus=createCorpus(json);

	if (!json.id)json.id=corpusid;
	var files=[];
	if (json.files) {
		files=json.files;
	} else {
		files=fs.readdirSync(pathname);
		files=files.filter(function(fn){return fn.substr(fn.length-4)==".xml"});
	}
	
	files.forEach(function(fn){corpus.addFile(jsonpath+fn)});

	corpus.writeKDB(corpusid+".cor",function(byteswritten){
		cb(0,byteswritten+" bytes written");
	});

}
const makeKPos=function(book,page,line,character,pat){
	if (typeof pat==="string") pat=knownPatterns[pat];
	return Ksanapos.makeKPos([book,page,line,character],pat);
}

module.exports={createCorpus:createCorpus, 
	createCorpusFromJSON:createCorpusFromJSON,
	createWebCorpus:createWebCorpus,
	makeKPos:makeKPos,genBigram:genBigram};