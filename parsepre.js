/*
	xhtml for MPPS lecture
*/
const sax="sax";
const fs=require("fs");
const format=require("./accelon3handler/format");
const note=require("./accelon3handler/note");
const anchor=require("./accelon3handler/anchor");
var log=console.log;
const encodeTreeItem=require("./tree").encodeTreeItem;
var parser;

var defaultopenhandlers={p:format.p,article:format.article,origin:format.origin,
	tag:format.tag,a:anchor.a,anchor:anchor.a,group:format.group,
	pb:format.pb,ptr:note.ptr,def:note.def, footnote:note.footnote, fn:note.footnote};
const defaultclosehandlers={def:note.def,article:format.article,
	group:format.group,tag:format.tag};
const setHandlers=function(corpus,openhandlers,closehandlers,otherhandlers){
	corpus.openhandlers=Object.assign(corpus.openhandlers,openhandlers);
	corpus.closehandlers=Object.assign(corpus.closehandlers,closehandlers);	
	corpus.otherhandlers=Object.assign(corpus.otherhandlers,otherhandlers);
}
var tocobj=null;
var lasterrorfilename=null;
var treekpos=0;
var treeitems=[];

const addContent=function(content,name,opts){
	opts=opts||{};
	const Sax=require("sax");
	parser = Sax.parser(true);
	var tagstack=[], textbuf="", linebuf="";
	var captured=0;
	var corpus=this;
	corpus.content=content;
	
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
	parser.onopentag=function(tag){
		emittext.call(corpus);
		var capturing=false;
		const T={tag:tag,kpos:corpus.kPos,tpos:corpus.tPos,position:this.position}
		tagstack.push(T);
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
	parser.onerror=function(){
		var message="";
		if (corpus.filename!==lasterrorfilename) {
			message=corpus.filename;
		}
		log("ERROR",message+"\n"+parser.error.message)
		lasterrorfilename=corpus.filename;
	}
	parser.onclosetag=function(tagname){
		emittext.call(corpus);
		const t=tagstack.pop();
	
		const tag=t.tag, kpos=t.kpos,tpos=t.tpos,position=t.position;

		const endposition=this.position-tagname.length-3;//assuming no space 
		const handler=corpus.closehandlers[tagname];
		//point to anchor
		if (corpus.kPos>kpos && t.tag.attributes.to) { //has range
			const to=t.tag.attributes.to;
			var targetcorpus=corpus.id;
			if (to.match(/.+@/)){
				targetcorpus=to.match(/(.+)@/)[1];
				to=to.match(/@(.+)/)[1];
			}
			corpus.putArticleField("a@"+targetcorpus,to,corpus.makeRange(kpos,corpus.kPos));
		}
		//corpus.kPos;
		if (opts.rendClass) {
			const isrendclass=(opts.rendClass instanceof Array)?
			opts.rendClass.indexOf(tagname)>-1:(opts.rendClass(tagname));
			isrendclass&&corpus.putArticleField( "rend", tagname, corpus.makeRange(kpos,corpus.kPos));
		}
		if (handler) {
			handler.call(corpus,tag,true,kpos,tpos,position,endposition);
		} else if (corpus.otherhandlers.onclosetag) {
			corpus.otherhandlers.onclosetag.call(corpus,tag,true,kpos,tpos,position,endposition);
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
				tocobj.text=corpus.content.substring(tocobj.position,endposition);
				const n=tag.attributes.n;
				if (n) headvalue+='\t'+n;

				const range=corpus.makeRange(tocobj.kpos,corpus.kPos);
				corpus.putArticleField("head",headvalue,range);
				treeitems.push(encodeTreeItem(tocobj));
			}


		}

	}	
	parser.write(content);
}
const addFile=function(fn,opts){
	//remove bom
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

	if (opts.externals&&opts.externals.footnotes) {
		if (typeof opts.externals.footnotes=="string") {
			try {
				const jsonfn=opts.path+opts.externals.footnotes;
				opts.externals.footnotes=JSON.parse(fs.readFileSync(jsonfn));
			} catch(e) {
				log(e);
			}
		}
		note.setFootnotes(opts.externals.footnotes);
	}
	if (!opts.toc) opts.toc="article";
	if (!opts.articleFields) {
		opts.articleFields=["rend","head","p"];
	}
	corpus.openhandlers=defaultopenhandlers;
	corpus.closehandlers=defaultclosehandlers;
	corpus._pbline=0;
	corpus._pb=0;
}
const finalize=function(corpus,opts){
	console.log("finalized")
	if (opts.externals&&opts.externals.footnotes){
		const footnotes=note.getFootnotes(opts.externals.footnotes);
		const keys=Object.keys(footnotes);
		if (keys.length) {
			corpus.log("warn","unconsumed footnotes",keys.join(" ").substring(0,500));
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