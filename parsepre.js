/*
	preformatted XML, default accelon 2017 format
*/
const sax="sax";
const format=require("./accelon3handler/format");
const note=require("./accelon3handler/note");
const anchor=require("./accelon3handler/anchor");
const img=require("./accelon3handler/img");
const svg=require("./accelon3handler/svg");
const ReverseLink=require("./reverselink");
const link=require("./handlers").link;
const onerror=require("./onerror");
var log=console.log;
const encodeTreeItem=require("./tree").encodeTreeItem;
var parser;

var defaultopenhandlers={p:format.p,article:format.article,origin:format.origin,
	tag:format.tag,a:anchor.a,anchor:anchor.a,group:format.group,rubynote:note.rubynote,
	pb:format.pb,ptr:note.ptr,def:note.def, fn:note.footnote,footnote:note.footnote, fn:note.footnote,
	link:link,img:img,svg:svg};
const defaultclosehandlers={def:note.def,article:format.article,
	group:format.group,tag:format.tag,link:link,img:img,svg:svg};
const setHandlers=function(corpus,openhandlers,closehandlers,otherhandlers){
	corpus.openhandlers=Object.assign(corpus.openhandlers,openhandlers);
	corpus.closehandlers=Object.assign(corpus.closehandlers,closehandlers);	
	corpus.otherhandlers=Object.assign(corpus.otherhandlers,otherhandlers);
}
var tocobj=null;
var treekpos=0;
var treeitems=[];

const addContent=function(content,name,opts){
	opts=opts||{};
	const Sax=require("sax");
	parser = Sax.parser(true);
	parser.tagstack=[];
	parser.log=log;
	var textbuf="", linebuf="";
	var captured=0;
	var corpus=this;
	corpus.content=content;
	parser.filename=corpus.filename;
	
	const emittext=function(){
		if (!textbuf)return;
		const tokenized=corpus.tokenizer.tokenize(textbuf);
		for (var i=0;i<tokenized.length;i++) {
			const token=tokenized[i]
			if (token[0]!=="\n") {
				this.addToken(token);
			}else if (this._pb) {
				if (this.lineTokenCount==0 && this._pbline==0) continue;
				const kpos=this.makeKPos(this.bookCount,this._pb-1,this._pbline+1,0);
				if (kpos) {
					this.newLine(kpos, this.tPos);
					this._pbline++;
				}
			}
		}
		tokens=[];
		textbuf="";
	}
	parser.ontext=function(t){
		if (t[0]=="<") return; //extranous tag
		textbuf+=t;
	}
	parser.oncdata=function(text){
		emittext.call(corpus);
		corpus.putArticleField("cdata",text);
	}
	parser.onopentag=function(tag){
		emittext.call(corpus);
		var capturing=false;
		const T={tag:tag,kpos:corpus.kPos,tpos:corpus.tPos,
			position:this.position,line:this.line}
		this.tagstack.push(T);
		const handler=corpus.openhandlers[tag.name];

		if (opts.customHead) {
			if (opts.onopentag) {
				opts.onopentag.call(this,tag);
			}
		} else {
			const headtag=tag.name.match(/^[Hh]\d+/);
			if (headtag) {
				const depth=parseInt(tag.name.substr(1),10);
				tocobj={tag:tag.name,kpos:corpus.kPos,text:"",depth:depth,position:this.position};
			}			
		}

		if (handler&&handler.call(corpus,tag)) {
			captured++;
			T.capturing=true;
		}
	}
	parser.onclosetag=function(tagname){
		emittext.call(corpus);
		const t=this.tagstack.pop();
	
		const tag=t.tag, kpos=t.kpos,tpos=t.tpos,position=t.position;

		const endposition=this.position-tagname.length-3;//assuming no space 
		const handler=corpus.closehandlers[tagname];
		//point to anchor

		if (corpus.kPos>kpos && t.tag.attributes.to) { //has range			
			ReverseLink.add(corpus,kpos,t.tag,"a");
		}
		//corpus.kPos;
		if (opts.rendClass) {
			var isrendclass=(opts.rendClass instanceof Array)?
			opts.rendClass.indexOf(tagname)>-1:(opts.rendClass[tagname]);
			var value=tagname;
			if (isrendclass) {
				if (t.tag.attributes && Object.keys(t.tag.attributes).length) {
					value+="|"+JSON.stringify(t.tag.attributes);
				}
				corpus.putArticleField( "rend", value, corpus.makeRange(kpos,corpus.kPos));
			}
		}
		if (handler) {
			handler.call(corpus,tag,true,kpos,tpos,position,endposition);
		} else if (corpus.otherhandlers.onclosetag) {
			corpus.otherhandlers.onclosetag.call(corpus,tag,true,kpos,tpos,position,endposition);
		}

		if (opts.keyField) {
			var isKey=false;
			if (typeof opts.keyField=="string") {
				isKey=opts.keyField==tag.name;
			} else isKey=opts.keyField.indexOf(tag.name)>-1;

			if (isKey) {
				const keytext=corpus.content.substring(position,endposition)
				var value="";
				const attrs=Object.keys(tag.attributes);
				if (attrs.length==1) {
					value=tag.attributes[attrs[0]];
				} else if (attrs.length>1) {
					value=JSON.stringify(tag.attributes);
				}
				corpus.putKeyField(tag.name,keytext,value);
			}
		}

		if (opts.customHead) {
			if (opts.onclosetag) {
				opts.onclosetag.call(this,t);
			}
		} else {
			if (opts.toc==tagname) {
				if (treeitems.length){
					corpus.putField("toc",treeitems,treekpos);
					corpus.putField("tocrange",tocobj.kpos,treekpos);
					treeitems=[];	
				}
				treekpos=corpus.kPos;
			}
			if (tocobj && tagname==tocobj.tag){ //closing the toc node
				var headvalue=tocobj.depth;
				tocobj.text=corpus.content.substring(tocobj.position,endposition)
				.replace(/<.+?>/g,"");

				const n=tag.attributes.n;
				if (n) headvalue+='\t'+n;

				const range=corpus.makeRange(tocobj.kpos,corpus.kPos);
				corpus.putArticleField("head",headvalue,range);
				treeitems.push(encodeTreeItem(tocobj));
			}
		}
	}
	parser.onprocessinginstruction=function(tag){
		anchor.addAnchor.call(corpus,tag.name);
	}
	parser.onerror=onerror;
	parser.write(content);
}
const addFile=function(fn,opts){
	//remove bom
	const fs=require("fs");
	const encoding=opts.encoding||"utf8";
	var content=fs.readFileSync(fn,encoding);
	content=content.replace(/\r?\n/g,"\n").trim();
	this.filename=fn;
	addContent.call(this,content,fn,opts);
}
const line=function(){
	return parser.line;
}
const loadExternals=function(corpus,externals){
	externals.footnotes&&note.setFootnotes(externals.footnotes);
}
const initialize=function(corpus,opts){
	var images={};
	var fs=null
	try  {
		const FS="fs";
		fs=require(FS);
	} catch(e){

	}

	if (opts.images&&fs&&fs.existsSync) {
		for (var i=0;i<opts.images.length;i++) {
			const fn=opts.path+opts.images[i];
			if (fs.existsSync(fn)){
				var at=opts.images[i].lastIndexOf("/");
				var fnonly=fn;
				if (at>1) fnonly=opts.images[i].substr(at+1);
				images[fnonly]=fs.readFileSync(fn);
			}
		}
		opts.images=images;
	}

	if (opts.external&&fs&&fs.existsSync) {
		try{
		for (var key in opts.external){
			const fn=opts.path+opts.external[key];
			if (fs.existsSync(fn)){
				opts.external[key]=JSON.parse(fs.readFileSync(fn,'utf8'));
			}
		}
		if (opts.external.footnotes){
			note.setFootnotes(opts.external.footnotes);
		}

		if (opts.external.bigrams) {
			if (typeof opts.external.bigrams=="string") { //string format, expand it
				const bi={};
				opts.external.bigrams.split(" ").forEach(function(b){bi[b]=true});
				opts.external.bigrams=bi;
			}
		} 
		}catch(e){
			log(e);
		}
	}
	if (!opts.toc) opts.toc="article";
	corpus.openhandlers=defaultopenhandlers;
	corpus.closehandlers=defaultclosehandlers;
	corpus._pbline=0;
	corpus._pb=0;
}
const finalize=function(corpus,opts){
	if (opts.external&&opts.external.footnotes){
		const footnotes=note.getFootnotes(opts.external.footnotes);
		const keys=Object.keys(footnotes);
		if (keys.length) {
			corpus.log("warn","unconsumed footnotes:",keys.join(",").substring(0,500));
		}		
	}

	for (var key in opts.external) {
		const at=key.indexOf(ReverseLink.BILINKSEP);
		if (at>0) {
			const targetcorpus=key.substr(at+1);
			const links=opts.external[key];
			if (!opts.linkTo)opts.linkTo={};
			opts.linkTo[key]=ReverseLink.importLinks.call(corpus,key,links,targetcorpus);
		}
	}
	if(treeitems.length) {
		corpus.putField("toc",treeitems,treekpos);
		corpus.putField("tocrange",corpus.kPos,treekpos);
	}	
}
const setLog=function(_log){
	log=_log;
}
module.exports={addFile:addFile,addContent:addContent,setHandlers:setHandlers,line:line
,initialize:initialize,loadExternals:loadExternals,finalize:finalize,setLog:setLog};