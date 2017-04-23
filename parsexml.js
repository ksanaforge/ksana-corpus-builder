/* standard XML parser for TEI */
const Sax=require("sax");
var parser,log=console.log;
const X=require("./handlers");
const img=require("./accelon3handler/img");
const format=require("./accelon3handler/format");
var defaultopenhandlers={article:X.article,articlegroup:X.articlegroup,
	p:format.p,lb:X.lb,head:X.head,div:X.div,img:img};
const defaultclosehandlers={div:X.div,head:X.head,article:X.article,articlegroup:X.articlegroup
,img:img};
const onerror=require("./onerror");
const setHandlers=function(corpus,openhandlers,closehandlers,otherhandlers){
	corpus.openhandlers=Object.assign(corpus.openhandlers,openhandlers);
	corpus.closehandlers=Object.assign(corpus.closehandlers,closehandlers);	
	corpus.otherhandlers=Object.assign(corpus.otherhandlers,otherhandlers);
}
const addContent=function(content,name,opts){
	parser = Sax.parser(true);
	parser.tagstack=[];
	var textbuf="";
	var captured=0;
	var corpus=this;
	parser.filename=corpus.filename;
	parser.log=log;//assuming after setLog
	corpus.content=content;
	const emitText=function(){
		const tokenized=corpus.tokenizer.tokenize(textbuf);
		corpus.addTokens(tokenized);
		textbuf="";
	}
	parser.ontext=function(t){
		if (!captured) textbuf+=t;
	}
	parser.oncdata=function(text){
		emitText.call(this);
		corpus.putArticleField("cdata",text);
	}	
	parser.onopentag=function(tag){
		emitText.call(this);
		var T={tag:tag,kpos:corpus.kPos,tpos:corpus.tPos,
			position:this.position};
		this.tagstack.push(T);
		const handler=corpus.openhandlers[tag.name];
		corpus.position=this.position;

		if (handler&&handler.call(corpus,tag)) {
			captured++;
			T.capturing=true;
		}
	}

	parser.onclosetag=function(tagname){
		const t=this.tagstack.pop();
		const tag=t.tag, kpos=t.kpos,tpos=t.tpos,start=t.position;
		const handler=corpus.closehandlers[tagname];
		const endposition=this.position-tagname.length-3;//assuming no space 

		if (!captured) {
			emitText.call(this);
		}
		if (tag.attributes.rend && kpos<corpus.kPos) {
			corpus.putArticleField("rend",tag.attributes.rend,corpus.makeRange(kpos,corpus.kPos));
		}

		if (handler) {
			handler.call(corpus,tag,true,kpos,tpos,start,endposition);
		} else if (corpus.otherhandlers.onclosetag) {
			corpus.otherhandlers.onclosetag.call(corpus,tag,true,kpos,tpos,start,endposition);
		}
		if (t.capturing) {
			captured--;
		}
	}	
	parser.onerror=onerror;
	parser.write(content);
}
const addFile=function(fn,opts){
	//remove bom
	const fs=require("fs");
	const encoding=opts.encoding||"utf8";
	var content=fs.readFileSync(fn,encoding).replace(/\r?\n/g,"\n").trim();
	this.filename=fn;
	addContent.call(this,content,fn,opts);
}
const line=function(){
	return parser.line;
}
const setLog=function(_log){
	log=_log;
}
const initialize=function(corpus,opts){
	corpus._divdepth=0;
	corpus.openhandlers=defaultopenhandlers;
	corpus.closehandlers=defaultclosehandlers;
}
const finalize=function(corpus,opts){
	X.head_finalize.call(corpus);
}
module.exports={addFile:addFile,addContent:addContent,setHandlers:setHandlers,setLog:setLog,
	line:line,initialize:initialize,finalize:finalize};