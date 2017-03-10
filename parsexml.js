const Sax=require("sax");
const fs=require("fs");
var parser,log=console.log;
const setHandlers=function(corpus,openhandlers,closehandlers,otherhandlers){
	corpus.openhandlers=Object.assign(corpus.openhandlers,openhandlers);
	corpus.closehandlers=Object.assign(corpus.closehandlers,closehandlers);	
	corpus.otherhandlers=Object.assign(corpus.otherhandlers,otherhandlers);
}
const addContent=function(content,name,opts){
	parser = Sax.parser(true);
	var tagstack=[];
	
	var corpus=this;
	corpus.content=content;
	parser.ontext=function(t){
		if (!t||t=="undefined")return;
		corpus.addText(t);			
	}
	parser.onopentag=function(tag){
		tagstack.push({tag:tag,kpos:corpus.kPos,tpos:corpus.tPos});
		const handler=corpus.openhandlers[tag.name];
		var capture=false;
		corpus.position=this.position;
		if (handler&&handler.call(corpus,tag)) {
			capture=true;
		} else if (corpus.otherhandlers.onopentag) {
			capture=corpus.otherhandlers.onopentag.call(corpus,tag,false,kpos,tpos);
		}
		if (capture){
			corpus.textstack.push("");
			if (corpus.textstack.length>opts.maxTextStackDepth) {
				throw "nested text too depth "+tag.name
				+JSON.stringify(tag.attributes)+"line:"+parser.line+
				corpus.textstack;
			}			
		}
	}

	parser.onclosetag=function(tagname){
		const t=tagstack.pop();
		const tag=t.tag, kpos=t.kpos,tpos=t.tpos;
		const handler=corpus.closehandlers[tagname];
		corpus.position=this.position;
		if (handler) {
			handler.call(corpus,tag,true,kpos,tpos);
		} else if (corpus.otherhandlers.onclosetag) {
			corpus.otherhandlers.onclosetag.call(corpus,tag,true,kpos,tpos);
		}
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
module.exports={addFile:addFile,addContent:addContent,setHandlers:setHandlers,setLog:setLog,
	line:line};