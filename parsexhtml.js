/*
	xhtml for MPPS lecture
*/
const sax="sax";
const fs=require("fs");
const format=require("./accelon3handler/format");
const note=require("./accelon3handler/note");
const anchor=require("./accelon3handler/anchor");
var log=console.log;
const encodeSubtreeItem=require("./subtree").encodeSubtreeItem;
var parser;

var defaultopenhandlers={p:format.p,article:format.article,origin:format.origin,
	a:anchor.a,anchor:anchor.a,group:format.group,
	pb:format.pb,ptr:note.ptr,def:note.def, footnote:note.footnote, fn:note.footnote};
const defaultclosehandlers={def:note.def,article:format.article,group:format.group};
const setHandlers=function(corpus,openhandlers,closehandlers,otherhandlers){
	corpus.openhandlers=Object.assign(corpus.openhandlers,openhandlers);
	corpus.closehandlers=Object.assign(corpus.closehandlers,closehandlers);	
	corpus.otherhandlers=Object.assign(corpus.otherhandlers,otherhandlers);
}
var tocobj=null;
const addContent=function(content,name,opts){
	opts=opts||{};
	const Sax=require("sax");
	parser = Sax.parser(true);
	var tagstack=[];
	var subtreeitems=[], subtreekpos=0;
	var corpus=this;
	corpus.content=content;
	
	const addLines=function(s){
		if( s=="\n" && this._pbline==0) return;//ignore crlf after <pb>
		var kpos;
		const lines=s.trim().split("\n");
		for (var i=0;i<lines.length;i++) {
			kpos=this.makeKPos(this.bookCount,this._pb-1,this._pbline+i,0);
			if (kpos==-1) {
				log("error","error kpos",this.bookCount,this._pb-1,this._pbline+i);
			}
			try{
				this.newLine(kpos, this.tPos);
			} catch(e) {
				log("error",e);
			}
			this.putLine(lines[i]);
		}
		this._pbline+=lines.length;

		if (this._pbline<this.addressPattern.maxline){
			kpos=this.makeKPos(this.bookCount,this._pb-1,this._pbline,0);
			this.setPos(kpos,this.tPos);			
		}
	}

	parser.ontext=function(t){
		if (!t||t=="undefined")return;
		if (t.indexOf("\n")==-1) {
			corpus.addText(t);	
		} else {
			var text=corpus.popBaseText();
			text+=t;
			addLines.call(corpus,text);
		}
		
		if (tocobj) tocobj.text+=t;
	}
	parser.onopentag=function(tag){
		var capturing=false,subtree=0;
		tagstack.push({tag:tag,kpos:corpus.kPos,tpos:corpus.tPos});
		const handler=corpus.openhandlers[tag.name];

		const headtag=tag.name.match(/^[Hh]\d+/);
		if (headtag) {
			const depth=parseInt(tag.name.substr(1),10);
			tocobj={tag:tag.name,kpos:corpus.kPos,text:"",depth:depth};
		}
		if (handler&&handler.call(corpus,tag)) {
			capturing=true;
		} else if (corpus.otherhandlers.onopentag) {
			capturing=corpus.otherhandlers.onopentag.call(corpus,tag,false,kpos,tpos);
		}

		if (capturing){
			corpus.textstack.push("");
			if (corpus.textstack.length>opts.maxTextStackDepth) {
				throw "nested text too depth (2)"+tag.name
				+JSON.stringify(tag.attributes)+corpus.textstack;
			}			
		}
	}

	parser.onclosetag=function(tagname){
		const t=tagstack.pop();
		const tag=t.tag, kpos=t.kpos,tpos=t.tpos;
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
			const cls=opts.rendClass.indexOf(tagname);
			if (cls>-1) {
				corpus.putArticleField( "rend", tagname, corpus.makeRange(kpos,corpus.kPos));
			}
		}
		if (handler) {
			handler.call(corpus,tag,true,kpos,tpos);
		} else if (corpus.otherhandlers.onclosetag) {
			corpus.otherhandlers.onclosetag.call(corpus,tag,true,kpos,tpos);
		}
		if (opts.subtoc==tagname) {
			if (subtreeitems.length){
				corpus.putField("subtoc",subtreeitems,subtreekpos);
				corpus.putField("subtoc_range",corpus.kPos,subtreekpos);
				subtreeitems=[];	
			}
			subtreekpos=corpus.kPos;
		}
		if (tocobj && tagname==tocobj.tag){ //closing the toc node
			var headvalue=tocobj.depth;
			const len=corpus.kcount(tocobj.text);
			const n=tag.attributes.n;
			if (n) headvalue+='\t'+n;
			corpus.putArticleField("head",headvalue,corpus.makeRange(kpos,kpos+len));
			subtreeitems.push(encodeSubtreeItem(tocobj));
			tocobj=null;
		}


	}	
	const finalize=function(){
		if(subtreeitems.length) {
			corpus.putField("subtoc",subtreeitems,subtreekpos);
			corpus.putField("subtoc_range",corpus.kPos,subtreekpos);
		}
	}

	parser.write(content);
	finalize();
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
	if (opts.footnotes) note.setFootnotes(opts.footnotes);
	if (!opts.subtoc) opts.subtoc="article";
	if (!opts.articleFields) {
		opts.articleFields=["rend","head","p"];
	}
	corpus.openhandlers=defaultopenhandlers;
	corpus.closehandlers=defaultclosehandlers;
}
const finalize=function(corpus,opts){
	const footnotes=note.getFootnotes(opts.footnotes);
	const keys=Object.keys(footnotes);
	if (keys.length) {
		corpus.log("warn","unconsumed footnotes",keys.join(" ").substring(0,500));
	}
}
const setLog=function(_log){
	log=_log;
}
module.exports={addFile:addFile,addContent:addContent,setHandlers:setHandlers,line:line
,initialize:initialize,loadExternals:loadExternals,finalize:finalize,setLog:setLog};