const Sax=require("sax");
const fs=require("fs");
var parser;
const setHandlers=function(openhandlers,closehandlers,otherhandlers){
	this.openhandlers=openhandlers||{};	
	this.closehandlers=closehandlers||{};
	this.otherhandlers=otherhandlers||{};
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
		tagstack.push(tag);
		const handler=corpus.openhandlers[tag.name];
		var capture=false;
		corpus.position=this.position;
		if (handler&&handler.call(corpus,tag)) {
			capture=true;
		} else if (corpus.otherhandlers.onopentag) {
			capture=corpus.otherhandlers.onopentag.call(corpus,tag);
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
		var tag=tagstack.pop();
		const handler=corpus.closehandlers[tagname];
		corpus.position=this.position;
		if (handler) {
			handler.call(corpus,tag,true);
		} else if (corpus.otherhandlers.onclosetag) {
			corpus.otherhandlers.onclosetag.call(corpus,tag,true);
		}
	}	
	parser.write(content);
}
const addFile=function(fn,opts){
	//remove bom
	const encoding=opts.encoding||"utf8";
	var content=fs.readFileSync(fn,encoding).replace(/\r?\n/).trim();
	this.filename=fn;
	addContent.call(this,content,fn,opts);
}
const line=function(){
	return parser.line;
}
module.exports={addFile:addFile,addContent:addContent,setHandlers:setHandlers,line:line};