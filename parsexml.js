const sax="sax";
const fs=require("fs");
const setHandlers=function(openhandlers,closehandlers,otherhandlers){
	this.openhandlers=openhandlers||{};	
	this.closehandlers=closehandlers||{};
	this.otherhandlers=otherhandlers||{};
}
const addContent=function(content,name){
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
		//handler return true. capturing the text
			corpus.textstack.push("");
			if (corpus.textstack.length>2) {
				throw "nested text too depth (2)"+tag.name
				+JSON.stringify(tag.attributes)+corpus.textstack;
			}
		}
	}

	parser.onclosetag=function(tagname){
		var tag=tagstack.pop();
		const handler=corpus.closehandlers[tagname];
		corpus.position=this.position;
		handler&&handler.call(corpus,tag,true);
	}	
	parser.write(content);
}
const addFile=function(fn){
	var content=fs.readFileSync(fn,"utf8").replace(/\r?\n/);
	this.filename=fn;
	addContent.call(this,content,fn);
}

module.exports={addFile,addContent,setHandlers};