var sax="sax";
var fs=require("fs");
var setHandlers=function(openhandlers,closehandlers,otherhandlers){
	this.openhandlers=openhandlers||{};	
	this.closehandlers=closehandlers||{};
	this.otherhandlers=otherhandlers||{};
}
var addContent=function(content,name){
	const Sax=require("sax");
	const parser = Sax.parser(true);
	var tagstack=[];
	
	var corpus=this;
	corpus.content=content;
	parser.ontext=function(t){
		corpus.addText(t);
	}
	parser.onopentag=function(tag){
		tagstack.push(tag);
		const handler=corpus.openhandlers[tag.name];
		corpus.position=this.position;
		if (handler&&handler.call(corpus,tag)) {
			corpus.textstack.push("");
		}
	}

	parser.onclosetag=function(tagname){
		var tag=tagstack.pop();
		const handler=corpus.closehandlers[tagname];
		corpus.position=this.position;
		handler&&handler.call(corpus,tag,true);
	}	
	this.otherhandlers.fileStart&&this.otherhandlers.fileStart.call(corpus);
	parser.write(content);
	this.otherhandlers.fileEnd&&this.otherhandlers.fileEnd.call(corpus);
}
var addFile=function(fn){
	var content=fs.readFileSync(fn,"utf8").replace(/\r?\n/);
	this.filename=fn;
	addContent.call(this,content,fn);
}

module.exports={addFile,addContent,setHandlers};