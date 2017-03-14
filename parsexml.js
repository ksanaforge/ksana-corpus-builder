const Sax=require("sax");
const fs=require("fs");
var parser,log=console.log;
var lasterrorfilename =null;
const X=require("./handlers");

const format=require("./accelon3handler/format");
var defaultopenhandlers={article:X.article,articlegroup:X.articlegroup,
	p:format.p,lb:X.lb,head:X.head,div:X.div};
const defaultclosehandlers={div:X.div,head:X.head,article:X.article,articlegroup:X.articlegroup};

const setHandlers=function(corpus,openhandlers,closehandlers,otherhandlers){
	corpus.openhandlers=Object.assign(corpus.openhandlers,openhandlers);
	corpus.closehandlers=Object.assign(corpus.closehandlers,closehandlers);	
	corpus.otherhandlers=Object.assign(corpus.otherhandlers,otherhandlers);
}
const addContent=function(content,name,opts){
	parser = Sax.parser(true);
	var tagstack=[];
	var textbuf="";
	var captured=0;
	var corpus=this;
	corpus.content=content;
	const emitText=function(){
		const tokenized=corpus.tokenizer.tokenize(textbuf);
		corpus.addTokens(tokenized);
		textbuf="";
	}
	parser.ontext=function(t){
		if (!captured) textbuf+=t;
	}
	parser.onopentag=function(tag){
		emitText.call(this);
		var T={tag:tag,kpos:corpus.kPos,tpos:corpus.tPos,
			position:this.position};
		tagstack.push(T);
		const handler=corpus.openhandlers[tag.name];
		corpus.position=this.position;

		if (handler&&handler.call(corpus,tag)) {
			captured++;
			T.capturing=true;
		}
	}

	parser.onclosetag=function(tagname){
		const t=tagstack.pop();
		const tag=t.tag, kpos=t.kpos,tpos=t.tpos,start=t.position;
		const handler=corpus.closehandlers[tagname];
		const endposition=this.position-tagname.length-3;//assuming no space 

		if (!captured) {
			emitText.call(this);
		}

		if (tag.attributes.rend && kpos<this.kPos) {
			this.putArticleField("rend",tag.attributes.rend,this.makeRange(kpos,this.kPos));
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
	parser.onerror=function(){
		var message="";
		if (corpus.filename!==lasterrorfilename) {
			message=corpus.filename;
		}
		log("ERROR",message+"\n"+parser.error.message);
		log("ERROR",tagstack.map(function(t){return t.tag.name}).join("/"))
		lasterrorfilename=corpus.filename;
	}	
	parser.write(content);
}
const addFile=function(fn,opts){
	//remove bom
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